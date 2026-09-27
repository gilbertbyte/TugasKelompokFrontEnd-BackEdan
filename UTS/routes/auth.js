const express = require("express");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const db = require("../db");

const router = express.Router();


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const user = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username);

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Login failed. Please try again." });
    req.session.adminId = user.id;
    req.session.username = user.username;
    res.json({ ok: true, redirect: "/admin" });
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true, redirect: "/admin/login" });
  });
});

router.get("/me", (req, res) => {
  if (req.session && req.session.adminId) {
    return res.json({ loggedIn: true, username: req.session.username });
  }
  res.json({ loggedIn: false });
});

module.exports = router;