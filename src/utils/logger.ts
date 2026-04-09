export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  if (meta && Object.keys(meta).length > 0) {
    entry.meta = meta;
  }
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('debug')) console.debug(formatMessage('debug', message, meta));
  },

  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('info')) console.log(formatMessage('info', message, meta));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, meta));
  },

  error(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('error')) console.error(formatMessage('error', message, meta));
  },
};
