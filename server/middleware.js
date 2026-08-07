import { getDb } from "./db.js";
import { sessionAlive } from "./auth.js";

// Express middleware: requires `Authorization: Bearer <token>`, attaches req.userId.
export async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ error: "unauthorized" });
    const rs = await getDb().execute({
      sql: "SELECT s.created_at, s.user_id FROM sessions s WHERE s.token = ?",
      args: [token],
    });
    const row = rs.rows[0];
    if (!row || !sessionAlive(row.created_at)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    req.userId = Number(row.user_id);
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
