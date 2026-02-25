const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkData() {
    try {
        // Check customers
        const customers = await pool.query('SELECT id, name FROM customers LIMIT 10');
        console.log('Customers:', customers.rows);

        // Check transactions with customer_id
        const txns = await pool.query('SELECT id, customer_id, receipt_number, total_amount FROM transactions WHERE customer_id IS NOT NULL LIMIT 5');
        console.log('\nTransactions with customer_id:', txns.rows);

        // Check customer_payments
        const payments = await pool.query('SELECT id, customer_id, amount FROM customer_payments LIMIT 5');
        console.log('\nCustomer payments:', payments.rows);

        // Check NULL customer_ids in transactions
        const nullCustomer = await pool.query('SELECT COUNT(*) FROM transactions WHERE customer_id IS NULL');
        console.log('\nTransactions with NULL customer_id:', nullCustomer.rows[0].count);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkData();
