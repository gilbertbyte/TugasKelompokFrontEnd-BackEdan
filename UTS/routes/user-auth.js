const express = require("express");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const db = require("../db");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Terlalu banyak percobaan. Coba lagi nanti." },
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/register", authLimiter, async (req, res) => {
  const { nama, email, password } = req.body || {};

  if (!nama || !email || !password) {
    return res.status(400).json({ error: "Nama, email, dan password wajib diisi." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Format email tidak valid." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password minimal 8 karakter." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "Email sudah terdaftar." });
  }

  const hash = await bcrypt.hash(password, 12);
  const result = db
    .prepare("INSERT INTO users (nama, email, password_hash) VALUES (?, ?, ?)")
    .run(nama.trim(), email.toLowerCase().trim(), hash);

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Registrasi gagal, coba lagi." });
    req.session.userId = result.lastInsertRowid;
    req.session.userNama = nama.trim();
    res.status(201).json({ ok: true, nama: nama.trim(), email: email.toLowerCase().trim() });
  });
});

router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password wajib diisi." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: "Email atau password salah." });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Email atau password salah." });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Login gagal, coba lagi." });
    req.session.userId = user.id;
    req.session.userNama = user.nama;
    res.json({ ok: true, nama: user.nama, email: user.email });
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (req.session && req.session.userId) {
    const user = db.prepare("SELECT nama, email FROM users WHERE id = ?").get(req.session.userId);
    if (user) {
      return res.json({ loggedIn: true, nama: user.nama, email: user.email });
    }
  }
  res.json({ loggedIn: false });
});

module.exports = router;