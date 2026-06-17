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
