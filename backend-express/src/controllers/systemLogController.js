import prisma from '../config/db.js';
import logger from '../utils/logger.js';

export async function getLogs(req, res, next) {
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

    // If EMAIL level or ALL, also check if there are workflow email logs in DB to enrich
    if (!level || level === 'ALL' || level === 'EMAIL') {
      try {
        const emailLogs = await prisma.workflow_email_log.findMany({
          take: 50,
          orderBy: { created_at: 'desc' },
        });

        // Convert DB email logs to logger format for seamless unified view
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

        // Merge if not already present in memory logs
        const existingIds = new Set(result.logs.map((l) => l.id));
        const newEmailLogs = formattedEmailLogs.filter((el) => !existingIds.has(el.id));
        if (newEmailLogs.length > 0 && (!level || level === 'EMAIL')) {
          result.logs = [...result.logs, ...newEmailLogs].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          ).slice(0, parseInt(limit, 10) || 100);
          result.total += newEmailLogs.length;
        }
      } catch (dbErr) {
        // Silently continue if workflow_email_log table read fails
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
}

export async function getLogStats(req, res, next) {
  try {
    const stats = logger.getStats();

    // Check DB status
    let dbStatus = 'healthy';
    try {
      await prisma.$queryRaw`SELECT 1`;
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
          database: dbStatus,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function clearLogs(req, res, next) {
  try {
    logger.info('SystemLogs', 'clear_logs', `System logs cleared by superadmin: ${req.user?.username || 'admin'}`, {}, req);
    const result = logger.clearLogs();
    return res.json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}

export async function createTestLog(req, res, next) {
  try {
    const { level = 'INFO', module = 'TestModule', message = 'Test log message', details = {} } = req.body;
    const entry = logger.log(level, module, 'test_action', message, details, req);
    return res.json({
      success: true,
      message: 'Test log created',
      log: entry,
    });
  } catch (err) {
    next(err);
  }
}
