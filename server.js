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
    saveUsers();
    res.redirect('/login');
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('dashboard', { user: users[req.session.user] });
});

app.post('/update', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { name, bio, links } = req.body;
    const user = users[req.session.user];
    user.name = name;
    user.bio = bio;
    user.links = links.split('\n').map(line => {
        const [label, url] = line.split('|');
        return { label: label.trim(), url: url.trim() };
    });
    saveUsers();
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
