import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE_PATH = path.join(__dirname, '../../system_activity.log');
const MAX_MEMORY_LOGS = 2000;

class SystemLogger {
  constructor() {
    this.memoryLogs = [];
    this.loadInitialLogs();
  }

  loadInitialLogs() {
    try {
      if (fs.existsSync(LOG_FILE_PATH)) {
        const data = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
        const lines = data.trim().split('\n').filter(Boolean);
        this.memoryLogs = lines
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean);
        if (this.memoryLogs.length > MAX_MEMORY_LOGS) {
          this.memoryLogs = this.memoryLogs.slice(-MAX_MEMORY_LOGS);
        }
      }
    } catch (err) {
      console.error('[LOGGER INIT ERROR]', err.message);
    }
  }

  log(level, moduleName, action, message, details = {}, req = null) {
    const timestamp = new Date().toISOString();
    const userInfo = req?.user
      ? {
          id: req.user.user_id || req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
        }
      : null;

    const ip = req
      ? req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
      : 'system';

    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp,
      level: String(level).toUpperCase(),
      module: moduleName || 'General',
      action: action || 'Action',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      details: details || {},
      user: userInfo,
      path: req ? req.originalUrl || req.url : undefined,
      method: req ? req.method : undefined,
      ip,
    };

    // Add to memory logs
    this.memoryLogs.unshift(logEntry);
    if (this.memoryLogs.length > MAX_MEMORY_LOGS) {
      this.memoryLogs.pop();
    }

    // Persist to file asynchronously
    this.appendToFile(logEntry);

    // Also output error to console
    if (logEntry.level === 'ERROR') {
      console.error(`[SYSTEM ERROR] [${logEntry.module}] ${logEntry.message}`);
    }

    return logEntry;
  }

  appendToFile(logEntry) {
    try {
      const line = JSON.stringify(logEntry) + '\n';
      fs.appendFile(LOG_FILE_PATH, line, (err) => {
        if (err) console.error('[LOGGER WRITE ERROR]', err.message);
      });
    } catch (e) {
      console.error('[LOGGER PERSIST ERROR]', e.message);
    }
  }

  error(moduleName, action, message, details = {}, req = null) {
    return this.log('ERROR', moduleName, action, message, details, req);
  }

  warn(moduleName, action, message, details = {}, req = null) {
    return this.log('WARN', moduleName, action, message, details, req);
  }

  info(moduleName, action, message, details = {}, req = null) {
    return this.log('INFO', moduleName, action, message, details, req);
  }

  email(action, message, details = {}, req = null) {
    return this.log('EMAIL', 'EmailService', action, message, details, req);
  }

  getLogs({
    level,
    moduleName,
    search,
    limit = 100,
    offset = 0,
    startDate,
    endDate,
  } = {}) {
    let filtered = this.memoryLogs;

    if (level && level !== 'ALL') {
      const lvl = level.toUpperCase();
      filtered = filtered.filter((l) => l.level === lvl);
    }

    if (moduleName && moduleName !== 'ALL') {
      const mod = moduleName.toLowerCase();
      filtered = filtered.filter((l) => (l.module || '').toLowerCase() === mod);
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        filtered = filtered.filter((l) => new Date(l.timestamp) >= start);
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        filtered = filtered.filter((l) => new Date(l.timestamp) <= end);
      }
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter((l) => {
        const text = `${l.level} ${l.module} ${l.action} ${l.message} ${
          l.path || ''
        } ${l.user?.username || ''} ${l.user?.email || ''} ${JSON.stringify(
          l.details || {}
        )}`.toLowerCase();
        return text.includes(term);
      });
    }

    const total = filtered.length;
    const paginated = filtered.slice(
      Number(offset) || 0,
      (Number(offset) || 0) + (Number(limit) || 100)
    );

    return {
      total,
      limit: Number(limit) || 100,
      offset: Number(offset) || 0,
      logs: paginated,
    };
  }

  getStats() {
    const stats = {
      total: this.memoryLogs.length,
      errors: 0,
      warnings: 0,
      info: 0,
      email: 0,
      recentErrors: [],
    };

    this.memoryLogs.forEach((l) => {
      if (l.level === 'ERROR') {
        stats.errors += 1;
        if (stats.recentErrors.length < 5) {
          stats.recentErrors.push(l);
        }
      } else if (l.level === 'WARN') {
        stats.warnings += 1;
      } else if (l.level === 'INFO') {
        stats.info += 1;
      } else if (l.level === 'EMAIL') {
        stats.email += 1;
      }
    });

    return stats;
  }

  clearLogs() {
    this.memoryLogs = [];
    try {
      fs.writeFileSync(LOG_FILE_PATH, '');
    } catch (e) {
      console.error('[LOGGER CLEAR ERROR]', e.message);
    }
    return { success: true, message: 'Logs cleared successfully' };
  }
}

export const logger = new SystemLogger();
export default logger;
