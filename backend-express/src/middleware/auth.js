import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'WheelsApartSecretTokenKeyVerySecure32!';

export function isSuperAdmin(user) {
  if (!user) return false;
  return (
    user.role === 'superadmin' || 
    user.is_super_admin === true ||
    (user.role === 'admin' && user.email && user.email.endsWith('@wheelsapart.com'))
  );
}

export function validateJWT(req, res, next) {
  console.log(`🔐 JWT Validation - Method: ${req.method}, URL: ${req.url}`);

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('❌ JWT Validation - Missing Authorization Header');
    return res.status(401).send('Missing Authorization Header');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log('❌ JWT Validation - Invalid token format');
    return res.status(401).send('Invalid Authorization Token');
  }

  const token = parts[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('❌ JWT Validation - Token parse/validation failed:', err.message);
      return res.status(401).send('Invalid Token');
    }

    console.log(`✅ JWT Validation - Token valid for user: ${decoded.username} (ID: ${decoded.user_id})`);
    req.user = decoded;
    req.isSuperAdmin = isSuperAdmin(decoded);
    next();
  });
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).send('Unauthorized');
    }

    // SuperAdmins always have access to everything
    if (req.isSuperAdmin) {
      return next();
    }

    const userRole = user.role;

    for (const allowedRole of allowedRoles) {
      // Direct role match
      if (userRole === allowedRole) {
        return next();
      }

      // Role hierarchy checks
      // If allowed role is "user" and user has any higher role, grant access
      if (allowedRole === 'user' && (userRole === 'agent' || userRole === 'admin')) {
        return next();
      }

      // If allowed role is "agent" and user is an admin, grant access
      if (allowedRole === 'agent' && userRole === 'admin') {
        return next();
      }
    }

    console.log(`❌ Authorization Forbidden for user: ${user.username} (Role: ${userRole})`);
    return res.status(403).send('Forbidden');
  };
}

export function authorizeSuperAdmin(req, res, next) {
  if (req.isSuperAdmin) {
    return next();
  }
  console.log(`❌ SuperAdmin Authorization Forbidden for user: ${req.user ? req.user.username : 'unknown'}`);
  return res.status(403).send('Forbidden');
}

function getRequestedOrgId(req) {
  const queryVal = req.query.organization_id || req.query.organizationId;
  if (queryVal) return parseInt(queryVal, 10);
  
  const paramsVal = req.params.organization_id || req.params.organizationId || req.params.organizationID || req.params.orgID || req.params.orgid || req.params.org_id;
  if (paramsVal) return parseInt(paramsVal, 10);
  
  return null;
}

function determineEffectiveRole(user, req) {
  const requestedOrgId = getRequestedOrgId(req);
  const userRole = user.role;
  
  // If no specific org requested, use base role
  if (requestedOrgId === null || isNaN(requestedOrgId)) {
    return userRole;
  }
  
  const userOrgId = user.organization_id || user.organizationId;
  const isHybridUser = user.is_hybrid_user || user.isHybridUser;
  const parentOrgId = user.parent_organization_id || user.parentOrganizationId;
  const accessibleOrgIds = user.accessible_organization_ids || user.accessibleOrganizationIds || [];
  const userType = user.user_type || user.userType;
  
  // For hybrid users
  if (isHybridUser) {
    if (userOrgId && userOrgId === requestedOrgId) {
      return 'admin';
    }
    if (parentOrgId && parentOrgId === requestedOrgId) {
      return 'agent';
    }
    if (Array.isArray(accessibleOrgIds) && accessibleOrgIds.map(Number).includes(requestedOrgId)) {
      return 'agent';
    }
    return 'none';
  }
  
  // Dependent users
  if (userType === 'free_agent') {
    return 'agent';
  }
  
  // Regular admins
  if (userOrgId && userOrgId === requestedOrgId) {
    return 'admin';
  }
  
  return userRole;
}

export function contextAwareAuthorize(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).send('Unauthorized');
    }

    if (req.isSuperAdmin) {
      return next();
    }

    const effectiveRole = determineEffectiveRole(user, req);

    for (const allowedRole of allowedRoles) {
      if (effectiveRole === allowedRole) {
        return next();
      }
      
      // Hierarchy checks
      if (allowedRole === 'user' && (effectiveRole === 'agent' || effectiveRole === 'admin')) {
        return next();
      }
      if (allowedRole === 'agent' && effectiveRole === 'admin') {
        return next();
      }
    }

    console.log(`❌ ContextAwareAuthorization Forbidden for user: ${user.username} (Effective Role: ${effectiveRole})`);
    return res.status(403).send('Forbidden');
  };
}

