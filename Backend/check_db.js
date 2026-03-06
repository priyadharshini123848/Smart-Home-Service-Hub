const db = require('./config/db');

async function check() {
    try {
        const columns = await db.all("PRAGMA table_info(providers);");
        console.log(JSON.stringify(columns, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

check();
