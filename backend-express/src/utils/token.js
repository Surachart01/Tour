import jwt from 'jsonwebtoken';

const isDeployedEnvironment =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);

if (isDeployedEnvironment && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in the production environment');
}

const JWT_SECRET = process.env.JWT_SECRET || 'local-development-jwt-secret';

/**
 * Generates an enhanced JWT token matching Go's claims structure.
 */
export function generateJWT(user, agent, profile) {
  const expirationTime = Math.floor(Date.now() / 1000) + 168 * 3600; // 168 hours (7 days)
  
  const claims = {
    user_id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    markup_group: agent ? agent.markupGroup : '',
    agent_name: agent ? agent.name : '',
    agent_id: agent ? agent.id : 0,
    user_type: user.userType || 'agent',
    organization_id: user.organizationId || null,
    is_primary_admin: user.isPrimaryAdmin || false,
    is_super_admin: user.isSuperAdmin || false,
    subscription_tier: profile ? profile.subscriptionTier : 'starter',
    exp: expirationTime
  };

  return jwt.sign(claims, JWT_SECRET);
}

export default { generateJWT };
