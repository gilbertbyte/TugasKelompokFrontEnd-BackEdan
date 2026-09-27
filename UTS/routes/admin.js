const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

router.use(requireAuth);

const uploadDir = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "store-" + unique + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // max 3MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Hanya file JPG, PNG, atau WEBP yang diizinkan."));
    }
    cb(null, true);
  },
});

router.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Tidak ada file yang diupload." });
  res.json({ url: "/uploads/" + req.file.filename });
});

const ALLOWED_CONTENT_KEYS = [
  "site",
  "hero",
  "toko_populer",
  "menu_section",
  "about",
  "history",
  "testimonial_section",
  "cari_toko",
  "faq_section",
  "contact",
  "footer",
];

router.get("/api/content", (req, res) => {
  const rows = db.prepare("SELECT key, data FROM content_blocks").all();
  const result = {};
  rows.forEach((row) => {
    result[row.key] = JSON.parse(row.data);
  });
  res.json(result);
});

router.get("/api/content/:key", (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_CONTENT_KEYS.includes(key)) {
    return res.status(404).json({ error: "Unknown content section." });
  }
  const row = db.prepare("SELECT data FROM content_blocks WHERE key = ?").get(key);
  if (!row) return res.status(404).json({ error: "Content section not found." });
  res.json(JSON.parse(row.data));
});

router.put("/api/content/:key", (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_CONTENT_KEYS.includes(key)) {
    return res.status(404).json({ error: "Unknown content section." });
  }

  const existing = db.prepare("SELECT data FROM content_blocks WHERE key = ?").get(key);
  if (!existing) return res.status(404).json({ error: "Content section not found." });

  const current = JSON.parse(existing.data);
  const incoming = req.body || {};

  const merged = { ...current };
  Object.keys(current).forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(incoming, field)) {
      merged[field] = String(incoming[field] ?? "");
    }
  });

  db.prepare("UPDATE content_blocks SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?").run(
    JSON.stringify(merged),
    key
  );

  res.json(merged);
});

function registerListCrud({ path: routePath, table, fields, requiredField }) {
  router.get(`/api/${routePath}`, (req, res) => {
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY sort_order ASC, id ASC`).all();
    res.json(rows);
  });

  router.post(`/api/${routePath}`, (req, res) => {
    const body = req.body || {};
    if (!body[requiredField] || !String(body[requiredField]).trim()) {
      return res.status(400).json({ error: `${requiredField} is required.` });
    }

    const columns = fields.map((f) => f.name);
    const placeholders = columns.map((c) => `@${c}`).join(", ");
    const values = {};
    columns.forEach((c) => {
      const def = fields.find((f) => f.name === c);
      values[c] = body[c] !== undefined ? body[c] : def.default;
    });

    const stmt = db.prepare(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
    );
    const result = stmt.run(values);
    const created = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json(created);
  });

  router.put(`/api/${routePath}/:id`, (req, res) => {
    const { id } = req.params;
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!existing) return res.status(404).json({ error: "Not found." });

    const body = req.body || {};
    const columns = fields.map((f) => f.name);
    const setClause = columns.map((c) => `${c} = @${c}`).join(", ");
    const values = { id };
    columns.forEach((c) => {
      values[c] = body[c] !== undefined ? body[c] : existing[c];
    });

    db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = @id`).run(values);
    const updated = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    res.json(updated);
  });

  router.delete(`/api/${routePath}/:id`, (req, res) => {
    const { id } = req.params;
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!existing) return res.status(404).json({ error: "Not found." });

    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    res.json({ ok: true });
  });
}

registerListCrud({
  path: "stores",
  table: "stores",
  requiredField: "nama",
  fields: [
    { name: "nama", default: "" },
    { name: "alamat", default: "" },
    { name: "jarak", default: "" },
    { name: "jam_buka", default: "" },
    { name: "status", default: "Buka" },
    { name: "rating", default: 0 },
    { name: "ulasan_count", default: 0 },
    { name: "sort_order", default: 0 },
    { name: "image_url", default: "" },
  ],
});

registerListCrud({
  path: "menu",
  table: "menu_items",
  requiredField: "nama",
  fields: [
    { name: "nama", default: "" },
    { name: "deskripsi", default: "" },
    { name: "harga", default: "" },
    { name: "sort_order", default: 0 },
    { name: "image_url", default: "" },
  ],
});

registerListCrud({
  path: "testimonials",
  table: "testimonials",
  requiredField: "nama",
  fields: [
    { name: "nama", default: "" },
    { name: "ulasan", default: "" },
    { name: "waktu", default: "" },
    { name: "stars", default: 5 },
    { name: "sort_order", default: 0 },
  ],
});

registerListCrud({
  path: "faqs",
  table: "faqs",
  requiredField: "question",
  fields: [
    { name: "question", default: "" },
    { name: "answer", default: "" },
    { name: "sort_order", default: 0 },
  ],
});

module.exports = router;