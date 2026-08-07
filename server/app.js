import express from "express";
import { getDb, DB_PATH } from "./db.js";
import { probeStream, probeMany } from "./probe.js";
import { requestLogger, log } from "./logger.js";
import { scrape } from "./scrape.js";
import { requireAuth } from "./middleware.js";
import camerasRouter from "./routes/cameras.js";
import layoutsRouter from "./routes/layouts.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";

const STREAM_URL_RE = /^https:\/\/atcs\.denpasarkota\.go\.id\/stream\//;

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);

  const probeIntervalMs = Number(process.env.PROBE_INTERVAL_MS) || 60_000;

  app.get("/api/health", async (req, res) => {
    try {
      const cams = Number((await getDb().execute("SELECT COUNT(*) AS c FROM cameras")).rows[0].c);
      res.json({
        ok: true,
        db: DB_PATH,
        cameras: cams,
        probeIntervalMs,
        googleClientId: process.env.GOOGLE_CLIENT_ID || "",
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Ingest log events from the frontend.
  app.post("/api/log", (req, res) => {
    const { level, source, message, data } = req.body ?? {};
    const lvl = ["info", "warn", "error"].includes(level) ? level : "info";
    const src = String(source || "web").slice(0, 40);
    const msg = String(message || "").slice(0, 1000);
    log(lvl, src, msg, data);
    res.json({ ok: true });
  });

  // Single probe (kept for compatibility).
  app.get("/api/probe", async (req, res) => {
    const url = (req.query.url ?? "").toString().trim();
    if (!STREAM_URL_RE.test(url)) return res.status(400).json({ error: "invalid stream url" });
    const status = await probeStream(url);
    res.json({ url, status });
  });

  // Batch probe — one serverless invocation for many URLs.
  app.post("/api/probe", async (req, res) => {
    const urls = Array.isArray(req.body?.urls)
      ? req.body.urls
          .map((u) => String(u).trim())
          .filter((u) => STREAM_URL_RE.test(u))
          .slice(0, 300)
      : [];
    if (!urls.length) return res.status(400).json({ error: "urls required" });
    const results = await probeMany([...new Set(urls)]);
    res.json({ results });
  });

  app.use("/api/cameras", camerasRouter);
  app.use("/api/layouts", layoutsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);

  // POST /api/scrape — refresh camera DB from ATCS API (requires login)
  app.post("/api/scrape", requireAuth, async (req, res) => {
    try {
      res.json(await scrape());
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  return app;
}
