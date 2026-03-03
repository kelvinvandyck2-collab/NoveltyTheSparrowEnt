// simple script to delete the "Tea Leaf Bud" product from the PostgreSQL database
// usage: node delete-tea-leaf-bud.js

// load environment variables so DATABASE_URL from .env is available
require('dotenv').config();
const { Pool } = require('pg');

// when connecting to Supabase pooler the certificate is self-signed; disable verification
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/yourdb',
    ssl: {
        rejectUnauthorized: false
    }
});

async function run() {
    try {
        const res = await pool.query(
            `DELETE FROM products WHERE name = $1 RETURNING *`,
            ['Tea Leaf Bud']
        );
        if (res.rowCount === 0) {
            console.log('No product named "Tea Leaf Bud" found.');
        } else {
            console.log(`Deleted ${res.rowCount} row(s):`, res.rows);
        }
    } catch (err) {
        console.error('Error deleting product:', err);
    } finally {
        await pool.end();
    }
}

run();
