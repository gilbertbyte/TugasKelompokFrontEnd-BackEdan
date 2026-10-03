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

// ---------- Menu milik toko ----------
// Semua query di-scope ke store_id akun yang login, jadi pemilik toko
// cuma bisa lihat/ubah/hapus menu tokonya sendiri.
const MAX_MENU_IMAGES = 10;

function cleanMenuBody(body) {
  const { nama, harga, deskripsi } = body || {};
  return {
    nama: nama === undefined ? undefined : String(nama).trim(),
    harga: harga === undefined ? undefined : String(harga).trim(),
    deskripsi: deskripsi === undefined ? undefined : String(deskripsi).trim(),
  };
}

// Baca daftar gambar dari body ("images" array, atau "image_url" string/array).
// Return: undefined = tidak dikirim, null = tidak valid, array = daftar url.
function readMenuImages(body) {
  const { images, image_url } = body || {};
  let list;
  if (Array.isArray(images)) list = images;
  else if (Array.isArray(image_url)) list = image_url;
  else if (typeof image_url === "string") list = image_url ? [image_url] : [];
  else return undefined;

  list = list.filter((u) => typeof u === "string" && u.trim()).map((u) => u.trim());
  if (list.length > MAX_MENU_IMAGES) return null;
  if (!list.every((u) => u.startsWith("/uploads/"))) return null;
  return list;
}

function imagesToColumn(list) {
  return list.length ? JSON.stringify(list) : "";
}

router.get("/menu", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM menu_items WHERE store_id = ? ORDER BY sort_order ASC, id ASC")
    .all(req.tokoUser.store_id);
  res.json(rows);
});

router.post("/menu", (req, res) => {
  const m = cleanMenuBody(req.body);
  if (!m.nama) return res.status(400).json({ error: "Nama menu wajib diisi." });
  if (m.nama.length > 100) return res.status(400).json({ error: "Nama menu maksimal 100 karakter." });
  const images = readMenuImages(req.body);
  if (images === null) {
    return res.status(400).json({ error: "Gambar tidak valid (maksimal " + MAX_MENU_IMAGES + " gambar)." });
  }

  const info = db
    .prepare(
      "INSERT INTO menu_items (nama, deskripsi, harga, image_url, store_id, sort_order) VALUES (?, ?, ?, ?, ?, 0)"
    )
    .run(m.nama, m.deskripsi || "", m.harga || "", imagesToColumn(images || []), req.tokoUser.store_id);

  const row = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ ok: true, menu: row });
});

router.put("/menu/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM menu_items WHERE id = ? AND store_id = ?")
    .get(Number(req.params.id), req.tokoUser.store_id);
  if (!row) return res.status(404).json({ error: "Menu tidak ditemukan." });

  const m = cleanMenuBody(req.body);
  const nama = m.nama !== undefined ? m.nama : row.nama;
  if (!nama) return res.status(400).json({ error: "Nama menu wajib diisi." });
  if (nama.length > 100) return res.status(400).json({ error: "Nama menu maksimal 100 karakter." });
  const images = readMenuImages(req.body);
  if (images === null) {
    return res.status(400).json({ error: "Gambar tidak valid (maksimal " + MAX_MENU_IMAGES + " gambar)." });
  }

  db.prepare("UPDATE menu_items SET nama = ?, deskripsi = ?, harga = ?, image_url = ? WHERE id = ?").run(
    nama,
    m.deskripsi !== undefined ? m.deskripsi : row.deskripsi,
    m.harga !== undefined ? m.harga : row.harga,
    images !== undefined ? imagesToColumn(images) : row.image_url,
    row.id
  );

  res.json({ ok: true, menu: db.prepare("SELECT * FROM menu_items WHERE id = ?").get(row.id) });
});

router.delete("/menu/:id", (req, res) => {
  const row = db
    .prepare("SELECT id FROM menu_items WHERE id = ? AND store_id = ?")
    .get(Number(req.params.id), req.tokoUser.store_id);
  if (!row) return res.status(404).json({ error: "Menu tidak ditemukan." });

  // Bersihkan data yang nunjuk ke menu ini supaya tidak jadi data yatim.
  db.prepare("DELETE FROM testimonials WHERE target_type = 'menu' AND target_id = ?").run(row.id);
  db.prepare("DELETE FROM wishlist_items WHERE item_type = 'menu' AND item_id = ?").run(row.id);
  db.prepare("DELETE FROM menu_items WHERE id = ?").run(row.id);
  res.json({ ok: true });
});

module.exports = router;