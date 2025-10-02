-- migrations.sql (for reference)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar TEXT,
  bg TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT,
  body TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  profile_user_id INTEGER,
  author_name TEXT DEFAULT 'guest',
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
