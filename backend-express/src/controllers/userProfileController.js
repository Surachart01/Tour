import prisma from '../config/db.js';

// ==================== Basic CRUD (matching Go /user-profiles) ====================

export async function createUserProfile(req, res, next) {
  try {
    const data = req.body;
    const existing = await prisma.userProfile.findUnique({ where: { userId: data.user_id } });
    if (existing) return res.status(409).json({ error: 'Profile already exists for user' });
    const profile = await prisma.userProfile.create({
      data: {
        userId: data.user_id,
        userType: data.user_type || 'agent',
        companyName: data.company_name || '',
        contactPersonName: data.contact_person_name,
        companyType: data.company_type,
        companyCode: data.company_code,
        companyEmail: data.company_email,
        companyWebsite: data.company_website,
        companyPhone: data.company_phone,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postal_code,
        taxId: data.tax_id,
        vatNumber: data.vat_number,
        businessRegNumber: data.business_reg_number,
        primaryCurrency: data.primary_currency || 'THB',
        businessType: data.business_type,
      }
    });
    return res.status(201).json(profile);
  } catch (err) { next(err); }
}

export async function listUserProfiles(req, res, next) {
  try {
    const userType = req.query.user_type;
    const where = userType ? { userType } : {};
    const profiles = await prisma.userProfile.findMany({ where, include: { user: true } });
    return res.json(profiles);
  } catch (err) { next(err); }
}

export async function getUserProfile(req, res, next) {
  try {
    const userIDParam = req.params.userID;
    let profile;
    const numericId = parseInt(userIDParam);
    if (!isNaN(numericId)) {
      profile = await prisma.userProfile.findUnique({
        where: { userId: numericId },
        include: { user: { include: { agent: true } }, organization: true }
      });
      if (!profile) {
        // Auto-create profile
        try {
          const user = await prisma.user.findUnique({ where: { id: numericId }, include: { agent: true } });
          if (user) {
            profile = await prisma.userProfile.create({
              data: {
                userId: numericId,
                userType: user.role || 'agent',
                companyName: user.agent?.name || 'Unknown',
                primaryCurrency: 'THB',
              }
            });
            profile = await prisma.userProfile.findUnique({
              where: { userId: numericId },
              include: { user: { include: { agent: true } }, organization: true }
            });
          }
        } catch (e) { /* ignore auto-create errors */ }
      }
    } else {
      // Username-based lookup
      const user = await prisma.user.findUnique({ where: { username: userIDParam }, include: { agent: true } });
      if (user) {
        profile = await prisma.userProfile.findUnique({
          where: { userId: user.id },
          include: { user: { include: { agent: true } }, organization: true }
        });
        if (!profile) {
          profile = await prisma.userProfile.create({
            data: {
              userId: user.id,
              userType: user.role || 'agent',
              companyName: user.agent?.name || 'Unknown',
              primaryCurrency: 'THB',
            }
          });
          profile = await prisma.userProfile.findUnique({
            where: { userId: user.id },
            include: { user: { include: { agent: true } }, organization: true }
          });
        }
      }
    }
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.json(profile);
  } catch (err) { next(err); }
}

export async function updateUserProfile(req, res, next) {
  try {
    const userID = parseInt(req.params.userID);
    const data = req.body;
    const profile = await prisma.userProfile.update({
      where: { userId: userID },
      data: {
        companyName: data.company_name, contactPersonName: data.contact_person_name,
        companyType: data.company_type, companyCode: data.company_code,
        companyEmail: data.company_email, companyWebsite: data.company_website,
        companyPhone: data.company_phone, address: data.address,
        city: data.city, state: data.state, country: data.country,
        postalCode: data.postal_code, taxId: data.tax_id,
        vatNumber: data.vat_number, businessRegNumber: data.business_reg_number,
        billingName: data.billing_name, billingContact: data.billing_contact,
        billingEmail: data.billing_email, billingAddress: data.billing_address,
        billingCity: data.billing_city, billingState: data.billing_state,
        billingCountry: data.billing_country, billingPostalCode: data.billing_postal_code,
        bankName: data.bank_name, bankAccountName: data.bank_account_name,
        bankAccountType: data.bank_account_type, bankBranchCode: data.bank_branch_code,
        bankAccountNo: data.bank_account_no, bankIban: data.bank_iban,
        bankSwift: data.bank_swift, bankAddress: data.bank_address,
        companyNumber: data.company_number, panNumber: data.pan_number,
        gstin: data.gstin, ein: data.ein,
        businessType: data.business_type, primaryCurrency: data.primary_currency
      }
    });
    return res.json(profile);
  } catch (err) { next(err); }
}

export async function deleteUserProfile(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    await prisma.userProfile.delete({ where: { id } });
    return res.json({ message: 'Profile deleted successfully' });
  } catch (err) { next(err); }
}

export async function validateProfile(req, res, next) {
  try {
    const userID = parseInt(req.params.userID);
    const profile = await prisma.userProfile.findUnique({ where: { userId: userID } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const missingFields = [];
    if (!profile.companyName) missingFields.push('company_name');
    if (!profile.country) missingFields.push('country');
    if (!profile.address) missingFields.push('address');
    if (!profile.city) missingFields.push('city');
    if (!profile.companyEmail) missingFields.push('company_email');
    if (!profile.taxId && !profile.vatNumber && !profile.businessRegNumber) missingFields.push('tax_id');
    return res.json({ is_valid: missingFields.length === 0, missing_fields: missingFields });
  } catch (err) { next(err); }
}

export async function getCountryRequirements(req, res, next) {
  try {
    const country = req.query.country;
    if (!country) return res.status(400).json({ error: 'Country parameter is required' });
    const requirements = { country, required_fields: ['company_name', 'address', 'city', 'tax_id'] };
    return res.json(requirements);
  } catch (err) { next(err); }
}

export async function migrateAgentToProfile(req, res, next) {
  try {
    const agentID = parseInt(req.params.agentID);
    const data = req.body;
    const users = await prisma.user.findMany({ where: { agentId: agentID }, include: { agent: true } });
    if (users.length === 0) return res.status(404).json({ error: 'No users found for agent' });
    const user = users[0];
    const existing = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    if (existing) return res.status(409).json({ error: 'Profile already exists' });
    const profile = await prisma.userProfile.create({
      data: {
        userId: user.id, userType: data.user_type || 'agent',
        companyName: user.agent?.name || data.company_name || '', primaryCurrency: 'THB',
        ...data
      }
    });
    return res.status(201).json(profile);
  } catch (err) { next(err); }
}

// ==================== SaaS Profile Endpoints ====================

export async function updateBasicProfile(req, res, next) {
  try {
    const userID = parseInt(req.params.userID);
    const data = req.body;
    const updates = {};
    if (data.company_name !== undefined) updates.companyName = data.company_name;
    if (data.contact_person_name !== undefined) updates.contactPersonName = data.contact_person_name;
    if (data.company_type !== undefined) updates.companyType = data.company_type;
    if (data.company_email !== undefined) updates.companyEmail = data.company_email;
    if (data.company_website !== undefined) updates.companyWebsite = data.company_website;
    if (data.company_phone !== undefined) updates.companyPhone = data.company_phone;
    if (data.company_code !== undefined) updates.companyCode = data.company_code;
    if (data.address !== undefined) updates.address = data.address;
    if (data.city !== undefined) updates.city = data.city;
    if (data.state !== undefined) updates.state = data.state;
    if (data.country !== undefined) updates.country = data.country;
    if (data.postal_code !== undefined) updates.postalCode = data.postal_code;
    if (data.business_type !== undefined) updates.businessType = data.business_type;
    if (data.user_type !== undefined) updates.userType = data.user_type;
    const profile = await prisma.userProfile.update({ where: { userId: userID }, data: updates });
    return res.json(profile);
  } catch (err) { next(err); }
}

export async function updateTaxInfo(req, res, next) {
  try {
    const userID = parseInt(req.params.userID);
    const d = req.body;
    const profile = await prisma.userProfile.update({
      where: { userId: userID },
      data: {
        taxId: d.tax_id, vatNumber: d.vat_number, businessType: d.business_type,
        businessRegNumber: d.business_reg_number, companyNumber: d.company_number,
        panNumber: d.pan_number, gstin: d.gstin, ein: d.ein,
        taxExemptStatus: d.tax_exempt_status, country: d.country,
      }
    });
    return res.json(profile);
  } catch (err) { next(err); }
}

export async function updateBillingInfo(req, res, next) {
  try {
    const userID = parseInt(req.params.userID);
    const d = req.body;
    const profile = await prisma.userProfile.update({
      where: { userId: userID },
      data: {
        billingName: d.billing_name, billingContact: d.billing_contact,
        billingEmail: d.billing_email, billingAddress: d.billing_address,
        billingCity: d.billing_city, billingState: d.billing_state,
        billingCountry: d.billing_country, billingPostalCode: d.billing_postal_code,
      }
    });
    return res.json(profile);
  } catch (err) { next(err); }
}

export async function updateBankInfo(req, res, next) {
  try {
    const userIDParam = req.params.userID;
    let userID;
    if (userIDParam === 'me') {
      userID = req.user.user_id;
    } else {
      userID = parseInt(userIDParam);
    }
    const d = req.body;
    const profile = await prisma.userProfile.update({
      where: { userId: userID },
      data: {
        bankName: d.bank_name, bankAccountName: d.bank_account_name,
        bankAccountType: d.bank_account_type, bankBranchCode: d.bank_branch_code,
        bankAccountNo: d.bank_account_no, bankIban: d.bank_iban,
        bankSwift: d.bank_swift, bankAddress: d.bank_address,
      }
    });
    return res.json(profile);
  } catch (err) { next(err); }
}

export async function getBankInfo(req, res, next) {
  try {
    const userIDParam = req.params.userID;
    let userID;
    if (userIDParam === 'me') {
      userID = req.user.user_id;
    } else {
      userID = parseInt(userIDParam);
    }
    const profile = await prisma.userProfile.findUnique({ where: { userId: userID } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.json({
      bank_name: profile.bankName, bank_account_name: profile.bankAccountName,
      bank_account_type: profile.bankAccountType, bank_branch_code: profile.bankBranchCode,
      bank_account_no: profile.bankAccountNo, bank_iban: profile.bankIban,
      bank_swift: profile.bankSwift, bank_address: profile.bankAddress,
      has_bank_info: !!(profile.bankName || profile.bankAccountNo || profile.bankIban)
    });
  } catch (err) { next(err); }
}

export async function addPaymentMethod(req, res, next) {
  try {
    return res.json({ message: 'Payment method added', ...req.body, id: Date.now() });
  } catch (e) { next(e); }
}

export async function getPaymentMethods(req, res, next) {
  try {
    return res.json([]);
  } catch (e) { next(e); }
}

export async function deletePaymentMethod(req, res, next) {
  try {
    return res.json({ message: 'Payment method deleted successfully' });
  } catch (e) { next(e); }
}

export async function setDefaultPaymentMethod(req, res, next) {
  try {
    return res.json({ message: 'Default payment method updated successfully' });
  } catch (e) { next(e); }
}

export async function getPaymentMethodDecrypted(req, res, next) {
  try {
    return res.json({ message: 'Decrypted payment method', id: parseInt(req.params.paymentMethodID) });
  } catch (e) { next(e); }
}

export async function getSubscriptionStatus(req, res, next) {
  try {
    const userID = parseInt(req.params.userID);
    const profile = await prisma.userProfile.findUnique({ where: { userId: userID } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.json({
      subscription_tier: profile.subscriptionTier || 'starter',
      subscription_status: profile.subscriptionStatus || 'trial',
      trial_end: profile.trialEnd,
      next_billing_date: profile.nextBillingDate,
      billing_cycle: profile.billingCycle || 'monthly',
      usage: profile.usageStats || {},
      limits: profile.usageLimits || {},
      features: profile.featureFlags || {},
    });
  } catch (err) { next(err); }
}

export async function getUsageDashboard(req, res, next) {
  try {
    const userID = parseInt(req.params.userID);
    const profile = await prisma.userProfile.findUnique({ where: { userId: userID } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.json({
      current_period: new Date().toISOString().slice(0, 7),
      metrics: profile.usageStats || {},
      limits: profile.usageLimits || {},
      warnings: [],
    });
  } catch (err) { next(err); }
}

export async function getUsageAlerts(req, res, next) {
  try {
    return res.json([]);
  } catch (e) { next(e); }
}

export async function getFeatureAccess(req, res, next) {
  try {
    const { feature } = req.params;
    const userID = parseInt(req.params.userID);
    const profile = await prisma.userProfile.findUnique({ where: { userId: userID } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const flags = profile.featureFlags || {};
    return res.json({
      feature, enabled: flags[feature] !== undefined ? flags[feature] : true,
      limit: null, current_usage: 0, usage_percentage: 0,
    });
  } catch (err) { next(err); }
}

export async function getOrganization(req, res, next) {
  try {
    const userID = parseInt(req.params.userID);
    const profile = await prisma.userProfile.findUnique({ where: { userId: userID }, include: { organization: true } });
    if (!profile || !profile.organization) return res.json(null);
    return res.json(profile.organization);
  } catch (err) { next(err); }
}

export async function updateOrganization(req, res, next) {
  try {
    const userID = parseInt(req.params.userID);
    const profile = await prisma.userProfile.findUnique({ where: { userId: userID } });
    if (!profile || !profile.organizationId) return res.status(404).json({ error: 'No organization found' });
    const org = await prisma.organization.update({
      where: { id: profile.organizationId },
      data: req.body,
    });
    return res.json(org);
  } catch (err) { next(err); }
}

export async function getOrganizationUserCount(req, res, next) {
  try {
    const organizationID = parseInt(req.params.organizationID);
    const count = await prisma.userProfile.count({ where: { organizationId: organizationID } });
    return res.json({ organization_id: organizationID, user_count: count });
  } catch (err) { next(err); }
}

export async function getProfileCompleteness(req, res, next) {
  try {
    const userId = req.user.user_id;
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).send('Profile not found');
    return res.json({ completeness: profile.profileCompleteness });
  } catch (err) { next(err); }
}
