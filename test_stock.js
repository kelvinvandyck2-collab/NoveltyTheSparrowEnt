require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    const res = await pool.query("SELECT name, stock_levels FROM products WHERE name ILIKE '%Cooking Oil%'");
    console.log(res.rows[0]);
    await pool.end();
}
run();
