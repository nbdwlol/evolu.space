const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({ secret: 'evolu-secret', resave: false, saveUninitialized: false }));

const USERS_FILE = path.join(__dirname, 'users.json');

// Load users
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
}

// Save users
function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Routes
app.get('/', (req, res) => res.redirect('/login'));

// Login / Register
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users[email];
    if (!user) return res.render('login', { error: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.render('login', { error: 'Incorrect password' });

    req.session.user = email;
    res.redirect('/dashboard');
});

app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (users[email]) return res.render('register', { error: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    users[email] = { password: hash, name: 'Your Name', bio: 'Your bio', links: [] };
