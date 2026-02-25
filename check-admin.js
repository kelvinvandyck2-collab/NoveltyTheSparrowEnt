const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function check() {
    try {
        const res = await pool.query(
            'SELECT email, name, store_id, store_location FROM users WHERE email = $1',
            ['admin@footprint.com']
        );
        if (res.rows.length > 0) {
            console.log('admin@footprint.com:', JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('User not found');
        }
        await pool.end();
    } catch (err) {
        console.error(err);
    }
}

check();
