const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Serve index.html for any route not handled by API
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ─── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, role, category_id } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.run(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, role || 'user']
        );

        const userId = result.lastInsertRowid;

        // If worker, create provider profile
        if (role === 'servicer' && category_id) {
            await db.run(
                'INSERT INTO providers (user_id, category_id, name, is_available) VALUES (?, ?, ?, ?)',
                [userId, category_id, username, 1] // Available by default
            );
        }

        res.status(201).json({ msg: 'User registered successfully', userId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Username or email already exists' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Admin Routes ──────────────────────────────────────────────────────────────
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const users = (await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'user'")).count;
        const servicers = (await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'servicer'")).count;
        const bookings = (await db.get("SELECT COUNT(*) as count FROM bookings")).count;
        const categories = (await db.get("SELECT COUNT(*) as count FROM categories")).count;
        const revenueResult = await db.get("SELECT SUM(amount) as total FROM bookings WHERE status = 'Completed'");
        const revenue = revenueResult.total || 0;

        res.json({ users, servicers, bookings, categories, revenue });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const rows = await db.all("SELECT id, username, role, created_at FROM users WHERE role = 'user'");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/workers', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const rows = await db.all("SELECT p.*, u.username FROM providers p JOIN users u ON p.user_id = u.id");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/categories', async (req, res) => {
    try {
        const rows = await db.all("SELECT * FROM categories");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/categories', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name, icon } = req.body;
    try {
        const result = await db.run("INSERT INTO categories (name, icon) VALUES (?, ?)", [name, icon]);
        const category = await db.get("SELECT * FROM categories WHERE id = ?", [result.lastInsertRowid]);
        res.status(201).json(category);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/complaints', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const rows = await db.all("SELECT c.*, u.username FROM complaints c JOIN users u ON c.user_id = u.id");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/applications', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const rows = await db.all(`
            SELECT p.*, c.name as category_name,
            CASE 
                WHEN p.is_available = 0 THEN 'Pending'
                WHEN p.is_available = 1 THEN 'Approved'
                WHEN p.is_available = 2 THEN 'Rejected'
            END as status
            FROM providers p 
            JOIN categories c ON p.category_id = c.id
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/admin/providers/:id/status', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { id } = req.params;
    const { status } = req.body;
    let is_available = 0;
    if (status === 'Approved') is_available = 1;
    if (status === 'Rejected') is_available = 2;

    try {
        await db.run("UPDATE providers SET is_available = ? WHERE id = ?", [is_available, id]);
        res.json({ msg: `Provider ${status}` });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── Servicer Routes ───────────────────────────────────────────────────────────
app.get('/api/servicer/profile', authenticateToken, async (req, res) => {
    try {
        const row = await db.get("SELECT * FROM providers WHERE user_id = ?", [req.user.id]);
        res.json(row || {});
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/servicer/profile', authenticateToken, async (req, res) => {
    const { category_id, base_price, description, availability, experience } = req.body;
    try {
        const existing = await db.get("SELECT id FROM providers WHERE user_id = ?", [req.user.id]);
        if (existing) {
            await db.run(
                "UPDATE providers SET category_id = ?, price = ?, description = ?, is_available = ?, experience = ? WHERE user_id = ?",
                [category_id, base_price, description, availability === undefined ? 1 : (availability ? 1 : 0), experience, req.user.id]
            );
        } else {
            const user = await db.get("SELECT username FROM users WHERE id = ?", [req.user.id]);
            await db.run(
                "INSERT INTO providers (user_id, category_id, name, price, description, is_available, experience) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [req.user.id, category_id, user.username, base_price, description, availability ? 1 : 0, experience || 0]
            );
        }
        res.json({ msg: 'Profile updated' });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/servicer/appointments', authenticateToken, async (req, res) => {
    try {
        const provider = await db.get("SELECT id FROM providers WHERE user_id = ?", [req.user.id]);
        if (!provider) return res.json([]);
        const rows = await db.all(
            "SELECT b.*, u.username as user_name FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.provider_id = ?",
            [provider.id]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/servicer/appointments/:id/status', authenticateToken, async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    try {
        const provider = await db.get("SELECT id FROM providers WHERE user_id = ?", [req.user.id]);
        if (!provider) return res.sendStatus(403);

        await db.run("UPDATE bookings SET status = ? WHERE id = ? AND provider_id = ?", [status, id, provider.id]);
        res.json({ msg: 'Status updated' });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/servicer/complaints', authenticateToken, async (req, res) => {
    try {
        const provider = await db.get("SELECT id FROM providers WHERE user_id = ?", [req.user.id]);
        if (!provider) return res.json([]);
        const rows = await db.all("SELECT c.*, u.username as user_name FROM complaints c JOIN users u ON c.user_id = u.id WHERE c.provider_id = ?", [provider.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── User Routes ───────────────────────────────────────────────────────────────
app.post('/api/user/bookings', authenticateToken, async (req, res) => {
    const { provider_id, scheduled_date, location } = req.body;
    try {
        const provider = await db.get('SELECT name, price, category_id FROM providers WHERE id = ?', [provider_id]);
        if (!provider) return res.status(404).json({ error: 'Provider not found' });

        const result = await db.run(
            'INSERT INTO bookings (user_id, provider_id, scheduled_date, location, amount) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, provider_id, scheduled_date, location, provider.price]
        );

        const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(booking);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/user/bookings', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all(
            `SELECT b.*, p.name as provider, c.name as category, r.id as review_id 
             FROM bookings b 
             JOIN providers p ON b.provider_id = p.id 
             JOIN categories c ON p.category_id = c.id 
             LEFT JOIN reviews r ON b.id = r.booking_id
             WHERE b.user_id = ?`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Reviews Routes ────────────────────────────────────────────────────────────
app.post('/api/user/reviews', authenticateToken, async (req, res) => {
    const { booking_id, rating, comment } = req.body;
    try {
        const booking = await db.get('SELECT provider_id FROM bookings WHERE id = ? AND user_id = ?', [booking_id, req.user.id]);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        const result = await db.run(
            'INSERT INTO reviews (booking_id, user_id, provider_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
            [booking_id, req.user.id, booking.provider_id, rating, comment]
        );
        res.status(201).json({ msg: 'Review submitted', reviewId: result.lastInsertRowid });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/servicer/reviews', authenticateToken, async (req, res) => {
    try {
        const provider = await db.get("SELECT id FROM providers WHERE user_id = ?", [req.user.id]);
        if (!provider) return res.json([]);
        const rows = await db.all(
            'SELECT r.*, u.username as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.provider_id = ? ORDER BY r.created_at DESC',
            [provider.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Complaints Routes ─────────────────────────────────────────────────────────
app.get('/api/user/complaints', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM complaints WHERE user_id = ?', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/user/complaints', authenticateToken, async (req, res) => {
    const { subject, provider, description } = req.body;
    try {
        // Find provider by name to link ID
        const providerData = await db.get("SELECT id FROM providers WHERE name LIKE ?", [`%${provider}%`]);
        const provider_id = providerData ? providerData.id : null;

        const result = await db.run(
            'INSERT INTO complaints (user_id, provider_id, subject, provider_name, description) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, provider_id, subject, provider, description]
        );
        const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(complaint);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Services (public) ─────────────────────────────────────────────────────────
app.get('/api/services', async (req, res) => {
    const { category, location } = req.query;
    try {
        let query = 'SELECT p.*, c.name as category_name FROM providers p JOIN categories c ON p.category_id = c.id';
        const params = [];
        const conditions = [];

        if (category) {
            conditions.push("(c.name LIKE ? OR p.name LIKE ?)");
            params.push(`%${category}%`, `%${category}%`);
        }
        if (location) {
            conditions.push("p.location LIKE ?");
            params.push(`%${location}%`);
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const rows = await db.all(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        await db.get('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
