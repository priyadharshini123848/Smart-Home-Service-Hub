const db = require('./config/db');

async function check() {
    try {
        const cats = await db.all("SELECT * FROM categories;");
        console.log(JSON.stringify(cats, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

check();
