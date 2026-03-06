const db = require('./config/db');

async function checkAdmin() {
    try {
        const admins = await db.all('SELECT * FROM users WHERE username = ?', ['admin']);
        console.log(`Found ${admins.length} users with username 'admin':`);
        admins.forEach(admin => {
            console.log(`ID: ${admin.id}, Username: ${admin.username}, Role: ${admin.role}, Email: ${admin.email}`);
        });

        const allUsers = await db.all('SELECT id, username, role FROM users');
        console.log('\nAll users:');
        console.table(allUsers);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
checkAdmin();
