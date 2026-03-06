const db = require('./config/db');

async function check() {
    try {
        const rows = await db.all("SELECT id, name, experience FROM providers;");
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

check();
