// db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data.sqlite');
const db = new Database(DB_PATH);

// Create migrations if not exist
const init = () => {
  // users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      bio TEXT,
      avatar TEXT,
      bg TEXT,
      created_at INTEGER NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT,
      body TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      profile_user_id INTEGER, -- if comment left on a profile's guestbook
      author_name TEXT DEFAULT 'guest',
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY(profile_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();
};

init();

module.exports = {
  db
};
