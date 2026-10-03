const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { UPLOADS_DIR } = require("../config");
const multer = require("multer");
const path = require("path");

const router = express.Router();

router.use(requireAuth);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
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

router.post("/api/upload", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "Ukuran file maksimal 3MB." });
        }
        return res.status(400).json({ error: "Upload gagal: " + err.message });
      }
      // Errors thrown from fileFilter land here
      return res.status(400).json({ error: err.message || "Upload gagal." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Tidak ada file yang diupload." });
    }
    res.json({ url: "/uploads/" + req.file.filename });
  });
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
  const data = JSON.parse(row.data);
  if (key === "about" && data.images === undefined) {
    data.images = data.image_url ? [data.image_url] : [];
  }
  res.json(data);
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
  const fields = Object.keys(current);
  if (key === "about" && !fields.includes("images")) fields.push("images");
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(incoming, field)) {
      if (field === "images") {
        const value = incoming[field];
        if (Array.isArray(value)) {
          merged[field] = value.filter((image) => typeof image === "string" && image);
        } else if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            merged[field] = Array.isArray(parsed) ? parsed : value ? [value] : [];
          } catch (err) {
            merged[field] = value ? [value] : [];
          }
        } else {
          merged[field] = [];
        }
      } else {
        merged[field] = String(incoming[field] ?? "");
      }
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
      let val = body[c] !== undefined ? body[c] : def.default;
      if (def.nullable && val === "") val = null;
      if (Array.isArray(val)) val = JSON.stringify(val);
      values[c] = val;
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
      const def = fields.find((f) => f.name === c);
      let val = body[c] !== undefined ? body[c] : existing[c];
      if (def.nullable && val === "") val = null;
      if (Array.isArray(val)) val = JSON.stringify(val);
      values[c] = val;
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

router.get("/api/toko-pending", (req, res) => {
  const rows = db
    .prepare(
      `SELECT users.id AS user_id, users.nama, users.email, users.created_at,
              stores.id AS store_id, stores.nama AS store_nama, stores.alamat AS store_alamat
       FROM users
       JOIN stores ON stores.id = users.store_id
       WHERE users.role = 'toko' AND users.status = 'pending'
       ORDER BY users.created_at ASC`
    )
    .all();
  res.json(rows);
});

router.post("/api/toko-pending/:userId/approve", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'toko'").get(req.params.userId);
  if (!user) return res.status(404).json({ error: "Pendaftaran toko tidak ditemukan." });

  db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").run(user.id);
  if (user.store_id) db.prepare("UPDATE stores SET approval_status = 'approved' WHERE id = ?").run(user.store_id);
  res.json({ ok: true });
});

router.post("/api/toko-pending/:userId/reject", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'toko'").get(req.params.userId);
  if (!user) return res.status(404).json({ error: "Pendaftaran toko tidak ditemukan." });

  db.prepare("UPDATE users SET status = 'rejected' WHERE id = ?").run(user.id);
  if (user.store_id) db.prepare("UPDATE stores SET approval_status = 'rejected' WHERE id = ?").run(user.store_id);
  res.json({ ok: true });
});

registerListCrud({
  path: "stores",
  table: "stores",
  requiredField: "nama",
  fields: [
    { name: "nama", default: "" },
    { name: "alamat", default: "" },
    { name: "jam_buka", default: "" },
    { name: "jam_tutup", default: "" },
    { name: "rating", default: 0 },
    { name: "ulasan_count", default: 0 },
    { name: "sort_order", default: 0 },
    { name: "image_url", default: "" },
    { name: "approval_status", default: "approved" },
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
    { name: "store_id", default: null, nullable: true },
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
    { name: "approved", default: 0 },
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