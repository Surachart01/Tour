import express from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import prisma from '../config/db.js';

const router = express.Router();

const getDevConfig = () => ({
  user: process.env.DEV_ADMIN_USER || 'devadmin',
  pass: process.env.DEV_ADMIN_PASS || 'admin1234!',
  secret: process.env.DEV_ADMIN_SECRET || 'VeraThailandiaDevLogsStandaloneSecretKey2026!#Secure',
});

// Standalone Dev Portal Authentication Middleware
function verifyDevToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Missing Authorization Header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'Invalid token format' });
  }

  const token = parts[1];
  const { secret } = getDevConfig();

  jwt.verify(token, secret, (err, decoded) => {
    if (err || !decoded || decoded.isDevPortalAdmin !== true) {
      return res.status(403).json({ success: false, message: 'Invalid or expired developer portal session' });
    }
    req.devUser = decoded;
    next();
  });
}

// 1. Standalone Login Endpoint (.env Verified)
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const { user, pass, secret } = getDevConfig();

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  if (username.trim() === user && password.trim() === pass) {
    const token = jwt.sign(
      {
        username: user,
        isDevPortalAdmin: true,
        loginAt: new Date().toISOString(),
      },
      secret,
      { expiresIn: '12h' }
    );

    logger.info('DevPortal', 'dev_login', `Developer login successful from ${req.ip || 'unknown'}`, {}, req);

    return res.json({
      success: true,
      message: 'Developer portal authentication successful',
      token,
      user: {
        username: user,
        role: 'Developer / System Owner',
      },
    });
  }

  logger.warn('DevPortal', 'dev_login_failed', `Failed developer portal login attempt with username: ${username}`, { ip: req.ip }, req);
  return res.status(401).json({ success: false, message: 'Invalid developer credentials' });
});

// 2. Fetch System Logs
router.get('/logs', verifyDevToken, async (req, res, next) => {
  try {
    const {
      level,
      module: moduleName,
      search,
      limit = 100,
      offset = 0,
      startDate,
      endDate,
    } = req.query;

    const result = logger.getLogs({
      level,
      moduleName,
      search,
      limit: parseInt(limit, 10) || 100,
      offset: parseInt(offset, 10) || 0,
      startDate,
      endDate,
    });

    // Merge recent email workflow logs if level includes ALL or EMAIL
    if (!level || level === 'ALL' || level === 'EMAIL') {
      try {
        const emailLogs = await prisma.workflow_email_log.findMany({
          take: 50,
          orderBy: { created_at: 'desc' },
        });

        const formattedEmailLogs = emailLogs.map((el) => ({
          id: `email-${el.id}`,
          timestamp: el.created_at ? el.created_at.toISOString() : new Date().toISOString(),
          level: el.delivery_status === 'failed' ? 'ERROR' : 'EMAIL',
          module: 'EmailService',
          action: el.event_type || 'send_email',
          message: `[Email ${el.delivery_status}] Subject: ${el.subject || 'N/A'} (To: ${el.to_email || 'N/A'})`,
          details: {
            to: el.to_email,
            cc: el.cc_email,
            bcc: el.bcc_email,
            subject: el.subject,
            delivery_status: el.delivery_status,
            failure_reason: el.failure_reason,
            error_message: el.error_message,
            trip_id: el.trip_id,
          },
          user: null,
          ip: 'system',
        }));

        const existingIds = new Set(result.logs.map((l) => l.id));
        const newEmailLogs = formattedEmailLogs.filter((el) => !existingIds.has(el.id));
        if (newEmailLogs.length > 0 && (!level || level === 'EMAIL')) {
          result.logs = [...result.logs, ...newEmailLogs].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          ).slice(0, parseInt(limit, 10) || 100);
          result.total += newEmailLogs.length;
        }
      } catch (dbErr) {
        // Silently continue
      }
    }

    return res.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. System Diagnostic & Server Stats
router.get('/stats', verifyDevToken, async (req, res, next) => {
  try {
    const stats = logger.getStats();

    // Database connectivity check
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch (e) {
      dbStatus = 'unreachable';
    }

    return res.json({
      success: true,
      stats: {
        ...stats,
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform,
          database: {
            status: dbStatus,
            latencyMs: dbLatencyMs,
          },
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 4. Clear System Logs
router.post('/clear', verifyDevToken, (req, res) => {
  logger.info('DevPortal', 'clear_logs', `System logs cleared via Developer Portal by ${req.devUser.username}`, {}, req);
  const result = logger.clearLogs();
  return res.json({
    success: true,
    message: result.message,
  });
});

// 5. Test Diagnostic Log Trigger
router.post('/test', verifyDevToken, (req, res) => {
  const { level = 'ERROR', module = 'DevPortalTest', message = 'Diagnostic test error', details = {} } = req.body;
  const entry = logger.log(level, module, 'manual_test', message, details, req);
  return res.json({
    success: true,
    message: 'Diagnostic test log injected successfully',
    log: entry,
  });
});

export default router;
