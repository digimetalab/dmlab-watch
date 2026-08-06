import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "..", "data");
const LOG_FILE = process.env.CCTV_LOG || path.join(LOG_DIR, "app.log");

fs.mkdirSync(LOG_DIR, { recursive: true });

export function log(level = "info", source = "api", message = "", data) {
  const ts = new Date().toISOString();
  const extra = data !== undefined ? ` ${JSON.stringify(data)}` : "";
  const line = `[${ts}] [${level.toUpperCase()}] [${source}] ${message}${extra}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
  return line;
}

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 400 ? "warn" : "info";
    log(level, "req", `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
}

export { LOG_FILE };
