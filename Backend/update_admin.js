const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function updateAdmin() {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const admin = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
        if (admin) {
            await db.run('UPDATE users SET password_hash = ? WHERE username = ?', [hashedPassword, 'admin']);
            console.log('Admin password updated successfully!');
        } else {
            await db.run(
                'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                ['admin', 'admin@smarthub.com', hashedPassword, 'admin']
            );
            console.log('Admin user created successfully!');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
updateAdmin();
