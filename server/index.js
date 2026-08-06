import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getDb, seedDefaultLayout, DB_PATH } from "./db.js";
import { probeStream } from "./probe.js";
import { log, requestLogger, LOG_FILE } from "./logger.js";
import camerasRouter from "./routes/cameras.js";
import layoutsRouter from "./routes/layouts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

seedDefaultLayout();

const app = express();
app.use(express.json());
app.use(requestLogger);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    db: DB_PATH,
    cameras: getDb().prepare("SELECT COUNT(*) AS c FROM cameras").get().c,
    log: LOG_FILE,
  });
});

// Ingest log events from the frontend into the same data/app.log file.
app.post("/api/log", (req, res) => {
  const { level, source, message, data } = req.body ?? {};
  const lvl = ["info", "warn", "error"].includes(level) ? level : "info";
  const src = String(source || "web").slice(0, 40);
  const msg = String(message || "").slice(0, 1000);
  log(lvl, src, msg, data);
  res.json({ ok: true });
});

app.use("/api/cameras", camerasRouter);
app.use("/api/layouts", layoutsRouter);
app.use("/api/probe", (req, res) => {
  const url = (req.query.url ?? "").toString().trim();
  if (!/^https:\/\/atcs\.denpasarkota\.go\.id\/stream\//.test(url)) {
    return res.status(400).json({ error: "invalid stream url" });
  }
  probeStream(url).then((status) => res.json({ url, status }));
});

const DIST = path.join(__dirname, "..", "dist");
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(DIST, "index.html")));
}

app.listen(PORT, () => {
  console.log(`API server on http://localhost:${PORT}`);
  log("info", "api", `server started on :${PORT}`);
});
