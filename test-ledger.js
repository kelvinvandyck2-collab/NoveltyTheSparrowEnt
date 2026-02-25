const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createLedgerForCustomer() {
    try {
        console.log('Creating ledger entry for Kelvin Van-Dyck (ID 10)...');

        // Kelvin should have a current_balance of GHS 117.60
        // Let's manually create a ledger entry
        
        // First, get Kelvin's info
        const kelvin = await pool.query('SELECT * FROM customers WHERE id = 10');
        console.log('Customer:', kelvin.rows[0]);

        // Create a test ledger entry
        await pool.query(`
            INSERT INTO customer_ledger (customer_id, date, description, type, debit, credit)
            VALUES (10, NOW()::date, 'Test Sale', 'sale', 117.60, 0)
        `);

        const ledger = await pool.query('SELECT * FROM customer_ledger WHERE customer_id = 10');
        console.log('Ledger entries:', ledger.rows);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

createLedgerForCustomer();
