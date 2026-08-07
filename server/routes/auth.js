import { Router } from "express";
import { getDb, ensureUserDefault } from "../db.js";
import { hashPassword, verifyPassword, newToken, sessionAlive } from "../auth.js";
import { log } from "../logger.js";

const router = Router();

function publicUser(row) {
  return { id: row.id, username: row.username };
}

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ error: "unauthorized" });
    const rs = await getDb().execute({
      sql: `SELECT s.token, s.created_at, u.id, u.username FROM sessions s
            JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
      args: [token],
    });
    const row = rs.rows[0];
    if (!row || !sessionAlive(row.created_at)) return res.status(401).json({ error: "unauthorized" });
    res.json({ user: publicUser(row) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function createSessionFor(res, userId, username) {
  const token = newToken();
  await getDb().execute({
    sql: "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
    args: [token, userId, Date.now()],
  });
  res.json({ token, user: { id: userId, username } });
}

// POST /api/auth/login  { username, password }
router.post("/login", async (req, res) => {
  try {
    const username = (req.body?.username ?? "").toString().trim();
    const password = (req.body?.password ?? "").toString();
    if (!username || !password) return res.status(400).json({ error: "username & password wajib" });
    const rs = await getDb().execute({
      sql: "SELECT * FROM users WHERE LOWER(username) = LOWER(?)",
      args: [username],
    });
    const user = rs.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Username atau password salah" });
    }
    log("info", "auth", `login ${user.username}`);
    await createSessionFor(res, user.id, user.username);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/register  { username, password }
router.post("/register", async (req, res) => {
  try {
    const username = (req.body?.username ?? "").toString().trim();
    const password = (req.body?.password ?? "").toString();
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(username)) {
      return res.status(400).json({ error: "Username 3-50 karakter (huruf/angka/-/_)" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password minimal 6 karakter" });
    }
    const info = await getDb().execute({
      sql: "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
      args: [username, hashPassword(password), Date.now()],
    });
    const userId = Number(info.lastInsertRowid);
    await ensureUserDefault(userId);
    log("info", "auth", `registered ${username}`);
    await createSessionFor(res, userId, username);
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) return res.status(409).json({ error: "Username sudah dipakai" });
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  try {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
    if (token) {
      await getDb().execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
