const { Pool } = require('pg');
const crypto = require('crypto');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Godlovesme1%40@localhost:5432/pos_db';

async function run() {
    const token = process.argv[2];
    if (!token) {
        console.error('Usage: node scripts/check_reset_token.js <token>');
        process.exit(1);
    }

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const pool = new Pool({ connectionString });

    try {
        const query = `SELECT id, email, reset_token, reset_token_expiry, reset_token_expiry > NOW() as not_expired FROM users WHERE reset_token = $1`;
        const res = await pool.query(query, [hashed]);
        console.log({ hashed, rows: res.rows });
    } catch (err) {
        console.error('DB query failed:', err);
    } finally {
        await pool.end();
    }
}

run();
