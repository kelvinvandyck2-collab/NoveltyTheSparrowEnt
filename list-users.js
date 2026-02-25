const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function check() {
    try {
        const res = await pool.query('SELECT email, store_location FROM users ORDER BY id');
        console.log('All users and their locations:');
        res.rows.forEach(u => {
            console.log(`  ${u.email}: ${u.store_location || 'NULL'}`);
        });
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}

check();
