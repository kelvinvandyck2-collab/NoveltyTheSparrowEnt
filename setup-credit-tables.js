const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupCreditTables() {
    try {
        console.log('Setting up credit management tables...');

        // 1. Ensure customers table has required columns
        await pool.query(`
            ALTER TABLE customers
            ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS email VARCHAR(255);
        `);
        console.log('✓ Updated customers table with balance and credit_limit columns');

        // 2. Create customer_payments table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customer_payments (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) NOT NULL,
                payment_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                recorded_by INTEGER REFERENCES users(id)
            );
        `);
        console.log('✓ Created customer_payments table');

        // 3. Create indexes for performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id);
            CREATE INDEX IF NOT EXISTS idx_customer_payments_date ON customer_payments(payment_date);
            CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
        `);
        console.log('✓ Created indexes for performance');

        // 4. Populate current_balance from existing transactions and payments
        await pool.query(`
            UPDATE customers c
            SET current_balance = COALESCE(
                (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE customer_id = c.id AND status = 'completed')
                - COALESCE((SELECT SUM(amount) FROM customer_payments WHERE customer_id = c.id), 0),
                0
            );
        `);
        console.log('✓ Populated current_balance from existing transactions');

        console.log('\n✅ Credit management tables setup completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error setting up tables:', err.message);
        process.exit(1);
    }
}

setupCreditTables();
