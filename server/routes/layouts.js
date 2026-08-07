import { Router } from "express";
import { getDb } from "../db.js";
import { log } from "../logger.js";

const router = Router();

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

// GET /api/layouts
router.get("/", async (req, res) => {
  try {
    const rs = await getDb().execute("SELECT * FROM layouts ORDER BY is_default DESC, name");
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
    const info = await getDb().execute({
      sql: "INSERT INTO layouts (name, cells, created_at) VALUES (?, ?, ?)",
      args: [name, JSON.stringify(cells.map(Number)), Date.now()],
    });
    const row = (
      await getDb().execute({
        sql: "SELECT * FROM layouts WHERE id = ?",
        args: [Number(info.lastInsertRowid)],
      })
    ).rows[0];
    log("info", "layout", `created layout "${name}"`, { id: Number(info.lastInsertRowid) });
    res.status(201).json(toLayout(row));
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) return res.status(409).json({ error: "name exists" });
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/layouts/:id  { name?, cells? }
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = (
      await getDb().execute({ sql: "SELECT * FROM layouts WHERE id = ?", args: [id] })
    ).rows[0];
    if (!row) return res.status(404).json({ error: "not found" });
    const name = req.body?.name != null ? req.body.name.toString().trim() : row.name;
    const cells =
      req.body?.cells != null ? JSON.stringify(req.body.cells.map(Number)) : row.cells;
    await getDb().execute({
      sql: "UPDATE layouts SET name = ?, cells = ? WHERE id = ?",
      args: [name, cells, id],
    });
    const updated = (
      await getDb().execute({ sql: "SELECT * FROM layouts WHERE id = ?", args: [id] })
    ).rows[0];
    log("info", "layout", `updated layout #${id}`, { name: updated.name, cells: parseCells(updated.cells) });
    res.json(toLayout(updated));
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) return res.status(409).json({ error: "name exists" });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/layouts/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = (
      await getDb().execute({ sql: "SELECT * FROM layouts WHERE id = ?", args: [id] })
    ).rows[0];
    if (!row) return res.status(404).json({ error: "not found" });
    await getDb().execute({ sql: "DELETE FROM layouts WHERE id = ?", args: [id] });
    log("info", "layout", `deleted layout #${id}`, { name: row.name });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
