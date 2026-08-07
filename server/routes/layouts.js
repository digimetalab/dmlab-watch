import { Router } from "express";
import { getDb, ensureUserDefault } from "../db.js";
import { log } from "../logger.js";
import { requireAuth } from "../middleware.js";

const router = Router();

router.use(requireAuth);

function parseCells(cells) {
  const arr = JSON.parse(cells ?? "[]");
  return Array.isArray(arr) ? arr.slice(0, 9).map(Number).filter(Number.isInteger) : [];
}

function toLayout(row) {
  return {
    id: row.id,
    name: row.name,
    cells: parseCells(row.cells),
    is_default: !!row.is_default,
  };
}

// GET /api/layouts — only this user's layouts
router.get("/", async (req, res) => {
  try {
    await ensureUserDefault(req.userId);
    const rs = await getDb().execute({
      sql: "SELECT * FROM layouts WHERE user_id = ? ORDER BY is_default DESC, name",
      args: [req.userId],
    });
    res.json({ data: rs.rows.map(toLayout) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/layouts  { name, cells? }
router.post("/", async (req, res) => {
  try {
    const name = (req.body?.name ?? "").toString().trim();
    if (!name) return res.status(400).json({ error: "name required" });
    const cells = req.body?.cells ?? [];
    if (!Array.isArray(cells) || cells.length !== 9) {
      return res.status(400).json({ error: "cells must be an array of 9 ids" });
    }
    const dup = await getDb().execute({
      sql: "SELECT COUNT(*) AS c FROM layouts WHERE user_id = ? AND LOWER(name) = LOWER(?)",
      args: [req.userId, name],
    });
    if (Number(dup.rows[0].c) > 0) return res.status(409).json({ error: "name exists" });
    const info = await getDb().execute({
      sql: "INSERT INTO layouts (name, cells, created_at, user_id) VALUES (?, ?, ?, ?)",
      args: [name, JSON.stringify(cells.map(Number)), Date.now(), req.userId],
    });
    const row = (
      await getDb().execute({
        sql: "SELECT * FROM layouts WHERE id = ?",
        args: [Number(info.lastInsertRowid)],
      })
    ).rows[0];
    log("info", "layout", `created layout "${name}"`, { id: Number(info.lastInsertRowid), user: req.userId });
    res.status(201).json(toLayout(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function findOwned(id, userId) {
  return (
    await getDb().execute({
      sql: "SELECT * FROM layouts WHERE id = ? AND user_id = ?",
      args: [id, userId],
    })
  ).rows[0];
}

// PUT /api/layouts/:id  { name?, cells? }
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await findOwned(id, req.userId);
    if (!row) return res.status(404).json({ error: "not found" });
    const name = req.body?.name != null ? req.body.name.toString().trim() : row.name;
    if (req.body?.name != null && name.toLowerCase() !== String(row.name).toLowerCase()) {
      const dup = await getDb().execute({
        sql: "SELECT COUNT(*) AS c FROM layouts WHERE user_id = ? AND LOWER(name) = LOWER(?) AND id != ?",
        args: [req.userId, name, id],
      });
      if (Number(dup.rows[0].c) > 0) return res.status(409).json({ error: "name exists" });
    }
    const cells = req.body?.cells != null ? JSON.stringify(req.body.cells.map(Number)) : row.cells;
    await getDb().execute({
      sql: "UPDATE layouts SET name = ?, cells = ? WHERE id = ?",
      args: [name, cells, id],
    });
    const updated = (
      await getDb().execute({ sql: "SELECT * FROM layouts WHERE id = ?", args: [id] })
    ).rows[0];
    log("info", "layout", `updated layout #${id}`, { name: updated.name, cells: parseCells(updated.cells), user: req.userId });
    res.json(toLayout(updated));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/layouts/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await findOwned(id, req.userId);
    if (!row) return res.status(404).json({ error: "not found" });
    await getDb().execute({ sql: "DELETE FROM layouts WHERE id = ?", args: [id] });
    log("info", "layout", `deleted layout #${id}`, { name: row.name, user: req.userId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
