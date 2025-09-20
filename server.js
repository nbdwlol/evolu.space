const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({ secret: 'evolu-secret', resave: false, saveUninitialized: false }));

const USERS_FILE = path.join(__dirname, 'users.json');
let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : {};

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});
const upload = multer({ storage });

// Save users
function saveUsers() { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); }

// Register/Login
app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (users[username]) return res.render('register', { error: 'Username exists' });

  const hash = await bcrypt.hash(password, 10);
  users[username] = { username, email, password: hash, name: 'Your Name', bio: 'Your bio', links: [], profileImg: '/profile-placeholder.png' };
  saveUsers();
  res.redirect('/login');
});

app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user) return res.render('login', { error: 'User not found' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.render('login', { error: 'Incorrect password' });
  req.session.user = username;
  res.redirect('/dashboard');
});

// Dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('dashboard', { user: users[req.session.user] });
});

app.post('/update', upload.single('profileImg'), (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { name, bio, links } = req.body;
  const user = users[req.session.user];
  user.name = name;
  user.bio = bio;
  user.links = links.split('\n').map(line => {
    const [label, url] = line.split('|');
    return { label: label.trim(), url: url.trim() };
  });
  if (req.file) user.profileImg = '/uploads/' + req.file.filename;
  saveUsers();
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// Public profile
app.get('/u/:username', (req, res) => {
  const user = users[req.params.username];
  if (!user) return res.status(404).send('Profile not found');
  res.render('profile', { user });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));

