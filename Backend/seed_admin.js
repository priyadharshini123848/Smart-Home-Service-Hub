const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    const username = 'admin';
    const email = 'admin@smarthub.com';
    const password = 'admin123';
    const role = 'admin';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, role]
        );
        console.log('Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            console.log('Admin user already exists or username/email taken.');
        } else {
            console.error('Error creating admin:', err.message);
        }
    }
}

createAdmin();
