const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Godlovesme1%40@localhost:5432/pos_db';
const pool = new Pool({ connectionString });

(async () => {
  try {
    const res = await pool.query(`SELECT id, email, reset_token, reset_token_expiry FROM users WHERE reset_token IS NOT NULL ORDER BY reset_token_expiry DESC LIMIT 1`);
    const row = res.rows[0];
    console.log(row);
    const expiry = new Date(row.reset_token_expiry);
    console.log('Expiry as Date (ms):', expiry.getTime());
    console.log('Now (ms):', Date.now());
    console.log('Remaining mins:', (expiry - Date.now()) / 60000);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
