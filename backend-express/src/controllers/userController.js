import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { generateJWT } from '../utils/token.js';

// Helper to determine and create default UserProfile if not exists
async function getOrCreateUserProfile(userId, userEmail, userRole, parentUserId = null, organizationId = null) {
  let profile = await prisma.userProfile.findUnique({
    where: { userId }
  });

  if (profile) {
    // If admin/superadmin, ensure subscription is active/enterprise
    const isAdmin = userEmail && (userEmail.includes('admin') || userEmail.endsWith('@wheelsapart.com'));
    if (isAdmin && (profile.subscriptionTier !== 'enterprise' || profile.subscriptionStatus !== 'active')) {
      profile = await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          subscriptionTier: 'enterprise',
          subscriptionStatus: 'active',
          usageLimits: {
            users: -1,
            quotations: -1,
            bookings: -1,
            storage_mb: -1,
            api_calls: -1,
            exports: -1,
            integrations: -1,
            agents: -1
          }
        }
      });
    }
    return profile;
  }

  // Create default profile
  const isAdmin = userEmail && (userEmail.includes('admin') || userEmail.endsWith('@wheelsapart.com'));
  const isEnterprise = userEmail && (userEmail.endsWith('@wheelsapart.com') || userEmail.endsWith('@verathailandia.com'));

  let subscriptionTier = 'starter';
  let subscriptionStatus = 'trial';
  let usageLimits = {
    quotations: 50,
    bookings: 25,
    storage_mb: 100,
    api_calls: 500,
    exports: 10,
    agents: 0
  };

  if (isAdmin || isEnterprise) {
    subscriptionTier = 'enterprise';
    subscriptionStatus = 'active';
    usageLimits = {
      users: -1,
      quotations: -1,
      bookings: -1,
      storage_mb: -1,
      api_calls: -1,
      exports: -1,
      integrations: -1,
      agents: -1
    };
  }

  const now = new Date();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  // Extract company name
  let companyName = 'My Travel Business';
  if (userEmail) {
    const parts = userEmail.split('@');
    if (parts.length === 2) {
      const domainParts = parts[1].split('.');
      if (domainParts.length > 0) {
        companyName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1) + ' Travel';
      }
    }
  }

  profile = await prisma.userProfile.create({
    data: {
      userId,
      userType: userRole || 'agent',
      companyName,
      companyEmail: userEmail || '',
      subscriptionTier,
      subscriptionStatus,
      trialStart: subscriptionTier === 'starter' ? new Date() : null,
      trialEnd: subscriptionTier === 'starter' ? trialEnd : null,
      role: 'admin',
      isPrimaryProfile: true,
      apiAccessEnabled: subscriptionTier === 'enterprise',
      customReportsEnabled: subscriptionTier === 'enterprise',
      whiteLabelEnabled: subscriptionTier === 'enterprise',
      prioritySupport: subscriptionTier === 'enterprise',
      integrationsEnabled: true,
      exportEnabled: true,
      featureFlags: subscriptionTier === 'enterprise' ? {
        api_access: true,
        custom_reports: true,
        export: true,
        integrations: true,
        priority_support: true,
        white_label: true
      } : {
        api_access: false,
        custom_reports: false,
        export: true,
        integrations: true,
        priority_support: false,
        white_label: false,
        create_agents: false
      },
      usageLimits,
      usageStats: { trips: 0, users: 1, storage_gb: 0, api_calls: 0 },
      country: isEnterprise ? 'Thailand' : 'US',
      verificationStatus: isEnterprise ? 'verified' : 'pending'
    }
  });

  return profile;
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: 'Invalid request body' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { agent: true }
    });

    if (!user) {
      return res.status(401).json({ code: 401, message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ code: 401, message: 'Invalid credentials' });
    }

    const agent = user.agent;
    if (!agent) {
      return res.status(400).json({ code: 400, message: 'Invalid agent details' });
    }

    const profile = await getOrCreateUserProfile(user.id, user.email, user.role);

    const token = generateJWT(user, agent, profile);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        user: user.username,
        role: user.role,
        email: user.email,
        agent: agent.name,
        enable_assistance_fee: agent.enableAssistanceFee,
        default_assistance_fee: agent.defaultAssistanceFee ? parseFloat(agent.defaultAssistanceFee.toString()) : null
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  return res.status(200).send('Logout successful');
}

export async function createAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Unauthorized');
    }

    const token = authHeader.substring(7);
    const decodedToken = Buffer.from(token, 'base64').toString('utf8');
    const SUPER_SECRET = 'iam@best'; // Match Go's superSecretToken value

    if (decodedToken !== SUPER_SECRET) {
      return res.status(401).send('Unauthorized: decoding token error');
    }

    const { user: userData, company_name, company_domain, is_enterprise, is_superadmin } = req.body;

    if (!userData || !userData.username || !userData.password) {
      return res.status(400).send('Invalid request body');
    }

    if (!userData.username.includes('admin')) {
      return res.status(400).send("Admin username must contain 'admin'");
    }

    const isSuperAdminUser = is_superadmin || (company_domain === 'wheelsapart.com' && userData.username.startsWith('wa'));
    const role = isSuperAdminUser ? 'superadmin' : 'admin';
    const userType = role;

    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: userData.agent_id }
    });

    if (!agent) {
      return res.status(400).send('Agent not found');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        role,
        userType,
        password: hashedPassword,
        agentId: userData.agent_id,
        isPrimaryAdmin: !isSuperAdminUser,
        isSuperAdmin: isSuperAdminUser,
        canCreateUsers: !isSuperAdminUser,
        canViewAnalytics: true
      }
    });

    if (is_enterprise && company_domain) {
      if (userData.username !== 'waadmin' && !isSuperAdminUser) {
        // Create organization
        const org = await prisma.organization.create({
          data: {
            name: company_name,
            slug: company_name.toLowerCase().replace(/ /g, '-'),
            domain: company_domain,
            settings: {}
          }
        });

        // Create user profile
        await prisma.userProfile.create({
          data: {
            userId: newUser.id,
            userType: newUser.userType,
            companyName: company_name,
            role: newUser.role,
            isPrimaryProfile: true,
            subscriptionTier: 'enterprise',
            subscriptionStatus: 'active',
            organizationId: org.id,
            featureFlags: {
              api_access: true,
              custom_reports: true,
              export: true,
              integrations: true,
              priority_support: true,
              white_label: true
            },
            usageLimits: {
              users: -1,
              quotations: -1,
              bookings: -1,
              storage_mb: -1,
              api_calls: -1,
              exports: -1,
              integrations: -1
            }
          }
        });

        // Link user to organization
        await prisma.user.update({
          where: { id: newUser.id },
          data: { organizationId: org.id }
        });
      }
    }

    return res.status(201).json({
      user: newUser.username,
      email: newUser.email,
      role: newUser.role,
      is_enterprise: !!is_enterprise,
      is_superadmin: isSuperAdminUser,
      company_name,
      company_domain
    });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const claims = req.user;
    const { username, email, role, password, agent_id } = req.body;

    if (!username || !email || !password || !agent_id) {
      return res.status(400).send('Invalid input data');
    }

    if (email.includes('admin') || username.includes('admin')) {
      return res.status(400).send('user with admin in the email or username is not allowed to be created');
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agent_id }
    });

    if (!agent) {
      return res.status(400).send('Agent not found');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userType = claims.organizationId ? 'free_agent' : (role || 'agent');

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        role: role || 'user',
        userType,
        password: hashedPassword,
        agentId: agent_id,
        parentUserId: claims.user_id,
        organizationId: claims.organizationId
      }
    });

    // Create user profile
    await getOrCreateUserProfile(newUser.id, newUser.email, newUser.role, claims.user_id, claims.organizationId);

    return res.status(201).json({
      user: newUser.username,
      email: newUser.email,
      role: newUser.role
    });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const idParam = req.params.id;
    let userId;

    if (idParam === 'me') {
      userId = req.user.user_id;
    } else {
      userId = parseInt(idParam);
      if (isNaN(userId)) {
        return res.status(400).send('Invalid user ID');
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { agent: true }
    });

    if (!user) {
      return res.status(404).send('User not found');
    }

    const response = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      agent_id: user.agent.id,
      organization_id: user.organizationId
    };

    if (idParam === 'me') {
      const profile = await getOrCreateUserProfile(userId, user.email, user.role);
      response.profile = {
        id: profile.id,
        user_id: profile.userId,
        user_type: profile.userType,
        company_name: profile.companyName,
        contact_person_name: profile.contactPersonName,
        company_type: profile.companyType,
        business_type: profile.businessType,
        company_email: profile.companyEmail,
        company_website: profile.companyWebsite,
        company_phone: profile.companyPhone,
        company_code: profile.companyCode,
        tax_exempt_status: profile.taxExemptStatus,
        tax_id: profile.taxId,
        vat_number: profile.vatNumber,
        business_reg_number: profile.businessRegNumber,
        billing_name: profile.billingName,
        billing_contact: profile.billingContact,
        billing_email: profile.billingEmail,
        billing_address: profile.billingAddress,
        billing_city: profile.billingCity,
        billing_state: profile.billingState,
        company_number: profile.companyNumber,
        pan_number: profile.panNumber,
        gstin: profile.gstin,
        ein: profile.ein,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        postal_code: profile.postalCode,
        subscription_tier: profile.subscriptionTier,
        subscription_status: profile.subscriptionStatus,
        trial_end: profile.trialEnd,
        verification_status: profile.verificationStatus,
        profile_completeness: profile.profileCompleteness,
        api_access_enabled: profile.apiAccessEnabled,
        export_enabled: profile.exportEnabled,
        integrations_enabled: profile.integrationsEnabled,
        white_label_enabled: profile.whiteLabelEnabled,
        custom_reports_enabled: profile.customReportsEnabled,
        priority_support: profile.prioritySupport,
        usage_stats: profile.usageStats,
        usage_limits: profile.usageLimits,
        feature_flags: profile.featureFlags,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt
      };
    }

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req, res, next) {
  req.params.id = 'me';
  return getUser(req, res, next);
}

export async function listUsers(req, res, next) {
  try {
    const isSuperAdmin = req.isSuperAdmin;
    const users = await prisma.user.findMany({
      where: isSuperAdmin ? {} : { parentUserId: req.user.user_id },
      include: { agent: true }
    });

    const response = users.map(user => ({
      id: user.id,
      user: user.username,
      email: user.email,
      role: user.role,
      agent: user.agent.name
    }));

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send('Invalid user ID');
    }

    const { username, email, role } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        username,
        email,
        role
      }
    });

    return res.status(200).json({
      id: updatedUser.id,
      user: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send('Invalid user ID');
    }

    await prisma.user.delete({
      where: { id }
    });

    return res.status(200).send('Status: Deleted');
  } catch (err) {
    next(err);
  }
}

export async function updatePassword(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send('Email and password required');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    return res.status(200).send('Password updated');
  } catch (err) {
    next(err);
  }
}

export async function getOrganizationUsers(req, res, next) {
  try {
    const orgId = parseInt(req.params.organizationID);
    if (isNaN(orgId)) {
      return res.status(400).send('Invalid organization ID');
    }

    const currentUserId = req.user.user_id;
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId }
    });

    if (!currentUser) {
      return res.status(401).send('Unauthorized');
    }

    const userIsSuperAdmin = req.isSuperAdmin || currentUser.isSuperAdmin;
    if (!userIsSuperAdmin && currentUser.organizationId !== orgId) {
      return res.status(403).send('Forbidden - you are not authorized to view users for this organization');
    }

    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      include: { agent: true }
    });

    let userLimit = 0;
    const primaryProfile = await prisma.userProfile.findFirst({
      where: { organizationId: orgId, isPrimaryProfile: true }
    });

    if (primaryProfile && primaryProfile.usageLimits) {
      const limits = typeof primaryProfile.usageLimits === 'string'
        ? JSON.parse(primaryProfile.usageLimits)
        : primaryProfile.usageLimits;
      if (limits && limits.users !== undefined) {
        userLimit = parseInt(limits.users);
      }
    }

    const formattedUsers = users.map(u => ({
      id: u.id,
      user: u.username,
      email: u.email,
      role: u.role,
      agent: u.agent ? u.agent.name : ''
    }));

    return res.status(200).json({
      users: formattedUsers,
      total_count: users.length,
      user_limit: userLimit
    });
  } catch (err) {
    next(err);
  }
}
