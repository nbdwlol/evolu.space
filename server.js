// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const multer = require('multer');
const helmet = require('helmet');
const xss = require('xss');

const { db } = require('./db');

const app = express();
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// session
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: '.' }),
  secret: 'replace_with_a_real_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// ensure uploads folder exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, safe + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// static files
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/', express.static(path.join(__dirname, 'public')));

// helpers
const now = () => Date.now();
const sanitize = (s) => typeof s === 'string' ? xss(s) : s;

// --- Auth routes ---
// register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, display_name } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(409).json({ error: 'username already taken' });

    const hash = await bcrypt.hash(password, 12);
    const info = db.prepare('INSERT INTO users (username, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)').run(
      username, hash, display_name || username, now()
    );
    const userId = info.lastInsertRowid;
    req.session.userId = userId;
    res.json({ ok: true, userId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal' });
  }
});

// login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if(!username || !password) return res.status(400).json({ error: 'username and password required' });
    const user = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username);
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if(!ok) return res.status(401).json({ error: 'invalid credentials' });
    req.session.userId = user.id;
    res.json({ ok: true, userId: user.id });
  } catch (e) { console.error(e); res.status(500).json({ error:'internal' }); }
});

// logout
app.post('/api/logout', (req,res) => {
  req.session.destroy(() => res.json({ ok:true }));
});

// current user
app.get('/api/me', (req, res) => {
  const uid = req.session.userId;
  if (!uid) return res.json({ user: null });
  const u = db.prepare('SELECT id, username, display_name, bio, avatar, bg, created_at FROM users WHERE id = ?').get(uid);
  res.json({ user: u });
});

// --- Profile update & uploads ---
// upload avatar or bg
app.post('/api/upload/avatar', upload.single('avatar'), (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'not auth' });
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const url = '/uploads/' + req.file.filename;
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(url, req.session.userId);
  res.json({ ok: true, url });
});
app.post('/api/upload/bg', upload.single('bg'), (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'not auth' });
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const url = '/uploads/' + req.file.filename;
  db.prepare('UPDATE users SET bg = ? WHERE id = ?').run(url, req.session.userId);
  res.json({ ok: true, url });
});

// update profile fields
app.post('/api/profile', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'not auth' });
  const display_name = sanitize(req.body.display_name || '');
  const bio = sanitize(req.body.bio || '');
  db.prepare('UPDATE users SET display_name = ?, bio = ? WHERE id = ?').run(display_name, bio, req.session.userId);
  res.json({ ok: true });
});

// read profile by id
app.get('/api/profile/:id', (req, res) => {
  const id = Number(req.params.id);
  const u = db.prepare('SELECT id, username, display_name, bio, avatar, bg, created_at FROM users WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ error: 'not found' });
  // user's posts
  const posts = db.prepare('SELECT id, title, body, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC').all(id);
  // guestbook comments for this profile
  const comments = db.prepare('SELECT id, author_name, text, created_at FROM comments WHERE profile_user_id = ? ORDER BY created_at DESC').all(id);
  res.json({ profile: u, posts, comments });
});

// create post
app.post('/api/posts', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'not auth' });
  const title = sanitize(req.body.title || '');
  const body = sanitize(req.body.body || '');
  const info = db.prepare('INSERT INTO posts (user_id, title, body, created_at) VALUES (?, ?, ?, ?)').run(req.session.userId, title, body, now());
  res.json({ ok: true, postId: info.lastInsertRowid });
});

// comment on a profile guestbook
app.post('/api/comments/profile/:profileId', (req, res) => {
  const profileId = Number(req.params.profileId);
  const author_name = sanitize(req.body.name || 'guest');
  const text = sanitize(req.body.text || '');
  if (!text) return res.status(400).json({ error: 'text required' });
  db.prepare('INSERT INTO comments (profile_user_id, author_name, text, created_at) VALUES (?, ?, ?, ?)').run(profileId, author_name, text, now());
  res.json({ ok: true });
});

// simple search / list users
app.get('/api/users', (req, res) => {
  const q = (req.query.q || '').trim();
  let rows;
  if (q) rows = db.prepare('SELECT id, username, display_name, avatar FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 50').all(`%${q}%`, `%${q}%`);
  else rows = db.prepare('SELECT id, username, display_name, avatar FROM users ORDER BY id DESC LIMIT 50').all();
  res.json({ users: rows });
});

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));
