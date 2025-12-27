export type LogLevel = "info" | "warn" | "error";

export type LogItem = {
  ts: string; // ISO
  level: LogLevel;
  msg: string;
};

class LogService {
  private last: LogItem[] = [];

  private push(level: LogLevel, msg: string) {
    const item: LogItem = { ts: new Date().toISOString(), level, msg };
    this.last.push(item);
    if (this.last.length > 50) this.last = this.last.slice(this.last.length - 50);
    // eslint-disable-next-line no-console
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      `${new Date(item.ts).toLocaleTimeString()} [${level}] ${msg}`
    );
  }

  info(msg: string) {
    this.push("info", msg);
  }
  warn(msg: string) {
    this.push("warn", msg);
  }
  error(msg: string) {
    this.push("error", msg);
  }

  getLastLogs() {
    return [...this.last];
  }
}

export const log = new LogService();
