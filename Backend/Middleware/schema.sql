-- Database Schema for Smart Home (SQLite)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    icon TEXT
);

-- Providers (Servicers) Table
CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    name TEXT NOT NULL,
    price REAL,
    location TEXT,
    description TEXT,
    rating REAL DEFAULT 0,
    is_available INTEGER DEFAULT 1
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    provider_id INTEGER REFERENCES providers(id),
    status TEXT NOT NULL DEFAULT 'Confirmed',
    scheduled_date TEXT NOT NULL,
    location TEXT,
    amount REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    provider_id INTEGER REFERENCES providers(id),
    subject TEXT NOT NULL,
    provider_name TEXT,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER REFERENCES bookings(id),
    user_id INTEGER REFERENCES users(id),
    provider_id INTEGER REFERENCES providers(id),
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Seed initial categories (skip if already present)
INSERT OR IGNORE INTO categories (name, icon) VALUES
('Plumbing', 'fas fa-faucet'),
('Electrical', 'fas fa-bolt'),
('Cleaning', 'fas fa-broom'),
('Painting', 'fas fa-paint-roller'),
('Mechanics', 'fas fa-tools'),
('Movers', 'fas fa-truck-moving');
