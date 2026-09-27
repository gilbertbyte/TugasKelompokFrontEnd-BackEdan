require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);

const userAuthRoutes = require("./routes/user-auth");
const wishlistRoutes = require("./routes/wishlist");
const authRoutes = require("./routes/auth");
const adminApiRoutes = require("./routes/admin");
const publicApiRoutes = require("./routes/public");
const { requireAuth } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET) {
  console.error(
    "Missing SESSION_SECRET in your .env file. Copy .env.example to .env and set a real value before starting the server."
  );
  process.exit(1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new SQLiteStore({ db: "sessions.db", dir: path.join(__dirname, "data") }),
    name: "connect.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/user", userAuthRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/", publicApiRoutes);

app.use("/admin/auth", authRoutes);

app.get("/admin/login", (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect("/admin");
  }
  res.sendFile(path.join(__dirname, "admin", "login.html"));
});

app.use("/admin/assets", express.static(path.join(__dirname, "admin", "assets")));

app.get("/admin", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "dashboard.html"));
});

app.use("/admin", adminApiRoutes);

app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, () => {
  console.log(`Pisang Ijo server running at http://localhost:${PORT}`);
  console.log(`Admin panel at http://localhost:${PORT}/admin (login required)`);
});