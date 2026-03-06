const db = require('./config/db');

async function migrate() {
    try {
        await db.run("ALTER TABLE providers ADD COLUMN experience INTEGER DEFAULT 0;");
        console.log("Migration successful: Added 'experience' column to 'providers' table.");
    } catch (err) {
        if (err.message.includes("duplicate column name")) {
            console.log("Migration skipped: 'experience' column already exists.");
        } else {
            console.error("Migration failed:", err.message);
        }
    }
    process.exit();
}

migrate();
