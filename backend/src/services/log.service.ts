export type LogLevel = "info" | "warn" | "error";

export type LogItem = {
  ts: string;
  level: LogLevel;
  msg: string;
  meta?: Record<string, unknown>;
};

const MAX_LOGS = 50;

class LogService {
  private logs: LogItem[] = [];

  push(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
    const item: LogItem = { ts: new Date().toISOString(), level, msg, meta };
    this.logs.push(item);
    if (this.logs.length > MAX_LOGS) this.logs.shift();
    return item;
  }

  list() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}

export const logService = new LogService();
