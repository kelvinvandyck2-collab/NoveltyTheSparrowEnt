const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function populateLedger() {
    try {
        console.log('Populating customer_ledger from transactions...');

        // 1. Insert all completed credit transactions into the ledger
        await pool.query(`
            INSERT INTO customer_ledger (customer_id, date, description, type, debit, credit, transaction_id)
            SELECT 
                customer_id,
                created_at::date as date,
                'Sale - ' || receipt_number,
                'sale',
                total_amount,
                0,
                id
            FROM transactions
            WHERE customer_id IS NOT NULL AND status = 'completed'
            AND NOT EXISTS (
                SELECT 1 FROM customer_ledger 
                WHERE transaction_id = transactions.id
            );
        `);
        console.log('✓ Inserted transactions into ledger');

        // 2. Insert all customer payments into the ledger
        await pool.query(`
            INSERT INTO customer_ledger (customer_id, date, description, type, debit, credit)
            SELECT 
                customer_id,
                payment_date::date as date,
                'Payment Received',
                'payment',
                0,
                amount
            FROM customer_payments
            WHERE NOT EXISTS (
                SELECT 1 FROM customer_ledger 
                WHERE customer_id = customer_payments.customer_id
                AND date = customer_payments.payment_date::date
                AND description = 'Payment Received'
                AND credit = customer_payments.amount
            );
        `);
        console.log('✓ Inserted payments into ledger');

        // 3. Verify ledger entries exist
        const count = await pool.query('SELECT COUNT(*) FROM customer_ledger');
        console.log(`✓ Total ledger entries: ${count.rows[0].count}`);

        console.log('\n✅ Customer ledger populated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error populating ledger:', err.message);
        process.exit(1);
    }
}

populateLedger();
