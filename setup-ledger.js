const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupLedger() {
    try {
        console.log('Creating customer_ledger table...');

        // Create customer_ledger table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customer_ledger (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                description VARCHAR(255),
                type VARCHAR(50),
                debit DECIMAL(10, 2) DEFAULT 0,
                credit DECIMAL(10, 2) DEFAULT 0,
                balance DECIMAL(10, 2),
                transaction_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ Created customer_ledger table');

        // Create index
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_ledger_customer_date ON customer_ledger(customer_id, date);
        `);
        console.log('✓ Created indexes');

        // Now populate from transactions and payments - only for valid customers
        console.log('\nPopulating ledger from existing data...');

        // Insert all completed credit transactions (only for valid customers)
        const txnResult = await pool.query(`
            INSERT INTO customer_ledger (customer_id, date, description, type, debit, credit, transaction_id)
            SELECT 
                t.customer_id,
                t.created_at::date,
                'Sale - ' || t.receipt_number,
                'sale',
                t.total_amount,
                0,
                t.id
            FROM transactions t
            INNER JOIN customers c ON t.customer_id = c.id
            WHERE t.customer_id IS NOT NULL AND t.status = 'completed'
            ON CONFLICT DO NOTHING;
        `);
        console.log('✓ Inserted transactions into ledger');

        // Insert all customer payments
        const paymentResult = await pool.query(`
            INSERT INTO customer_ledger (customer_id, date, description, type, debit, credit)
            SELECT 
                cp.customer_id,
                cp.payment_date::date,
                'Payment Received',
                'payment',
                0,
                cp.amount
            FROM customer_payments cp
            INNER JOIN customers c ON cp.customer_id = c.id
            ON CONFLICT DO NOTHING;
        `);
        console.log('✓ Inserted payments into ledger');

        // Verify
        const count = await pool.query('SELECT COUNT(*) FROM customer_ledger');
        console.log(`✓ Total ledger entries: ${count.rows[0].count}`);

        // Show entries per customer
        const byCustomer = await pool.query(`
            SELECT c.name, COUNT(*) as entry_count, COALESCE(SUM(debit), 0) as total_debit, COALESCE(SUM(credit), 0) as total_credit
            FROM customer_ledger cl
            JOIN customers c ON cl.customer_id = c.id
            GROUP BY c.id, c.name
        `);
        console.log('\nLedger entries by customer:');
        byCustomer.rows.forEach(row => {
            console.log(`  ${row.name}: ${row.entry_count} entries (Debit: ${row.total_debit}, Credit: ${row.total_credit})`);
        });

        console.log('\n✅ Customer ledger setup completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error setting up ledger:', err.message);
        process.exit(1);
    }
}

setupLedger();
