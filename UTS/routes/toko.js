const express = require("express");
const db = require("../db");
const { requireTokoAuth } = require("../middleware/auth");
const { UPLOADS_DIR } = require("../config");
const multer = require("multer");
const path = require("path");

const router = express.Router();
router.use(requireTokoAuth);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "toko-" + unique + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Hanya file JPG, PNG, atau WEBP yang diizinkan."));
    }
    cb(null, true);
  },
});

router.post("/upload", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Ukuran file maksimal 3MB." });
      }
      return res.status(400).json({ error: err.message || "Upload gagal." });
    }
    if (!req.file) return res.status(400).json({ error: "Tidak ada file yang diupload." });
    res.json({ url: "/uploads/" + req.file.filename });
  });
});

router.get("/me", (req, res) => {
  const store = db.prepare("SELECT * FROM stores WHERE id = ?").get(req.tokoUser.store_id);
  res.json({ store });
});


router.put("/me", (req, res) => {
  const store = db.prepare("SELECT * FROM stores WHERE id = ?").get(req.tokoUser.store_id);
  if (!store) return res.status(404).json({ error: "Toko tidak ditemukan." });

  const { nama, alamat, jam_buka, jam_tutup, image_url, images } = req.body || {};

  if (!nama || !String(nama).trim()) {
    return res.status(400).json({ error: "Nama toko wajib diisi." });
  }

  let imageValue = store.image_url;
  if (Array.isArray(images)) {
    imageValue = JSON.stringify(images.filter((url) => typeof url === "string" && url));
  } else if (image_url !== undefined) {
    imageValue = Array.isArray(image_url) ? JSON.stringify(image_url) : image_url;
  }

  db.prepare(
    `UPDATE stores SET nama = ?, alamat = ?, jam_buka = ?, jam_tutup = ?, image_url = ? WHERE id = ?`
  ).run(
    String(nama).trim(),
    alamat !== undefined ? String(alamat).trim() : store.alamat,
    jam_buka !== undefined ? jam_buka : store.jam_buka,
    jam_tutup !== undefined ? jam_tutup : store.jam_tutup,
    imageValue,
    store.id
  );

  const updated = db.prepare("SELECT * FROM stores WHERE id = ?").get(store.id);
  res.json({ ok: true, store: updated });
});

// Read-only. Approve/edit/hapus ulasan tetap cuma lewat /admin/api/testimonials.
router.get("/testimonials", (req, res) => {
  const menuIds = db
    .prepare("SELECT id FROM menu_items WHERE store_id = ?")
    .all(req.tokoUser.store_id)
    .map((r) => r.id);

  const rows = db
    .prepare(
      `SELECT * FROM testimonials
       WHERE (target_type = 'store' AND target_id = ?)
          OR (target_type = 'menu' AND target_id IN (${menuIds.length ? menuIds.map(() => "?").join(",") : "NULL"}))
       ORDER BY id DESC`
    )
    .all(req.tokoUser.store_id, ...menuIds);

  res.json(rows);
});

module.exports = router;