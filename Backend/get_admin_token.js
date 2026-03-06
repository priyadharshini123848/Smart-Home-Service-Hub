const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./config/db');
require('dotenv').config();

async function generateAdminToken() {
    try {
        const user = await db.get("SELECT id, username, role FROM users WHERE username = 'admin'");
        if (!user) {
            console.error('Admin user not found. Please run seed_admin.js first.');
            return;
        }

        const payload = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret_key_123', { expiresIn: '1y' });
        const fs = require('fs');
        fs.writeFileSync(path.join(__dirname, 'token_only.txt'), token);
        console.log('TOKEN_SAVED');
    } catch (err) {
        console.error('Error generating token:', err.message);
    }
}

generateAdminToken();
