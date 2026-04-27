export type LogLevel = "debug" | "info" | "warn" | "error";

function nowIso() {
  return new Date().toISOString();
}

function write(level: LogLevel, msg: string, ctx?: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: nowIso(),
    level,
    msg,
    ...(ctx ? { ctx } : {})
  });

  (level === "error" ? console.error : console.log)(line);
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => write("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => write("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => write("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => write("error", msg, ctx)
};

