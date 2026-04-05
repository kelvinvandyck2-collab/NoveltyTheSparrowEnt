require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query("SELECT name, stock_levels FROM products WHERE name ILIKE '%Cooking Oil%'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch(err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
