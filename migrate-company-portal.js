const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
    try {
        console.log('🚀 Starting Company Portal Database Migration...');

        await pool.query(`
            -- 1. Company Settings Table
            CREATE TABLE IF NOT EXISTS company_settings (
                id SERIAL PRIMARY KEY,
                company_id INT UNIQUE,
                company_name VARCHAR(255),
                tax_id VARCHAR(100),
                address TEXT,
                phone VARCHAR(50),
                email VARCHAR(255),
                logo_url TEXT,
                currency VARCHAR(10) DEFAULT 'GHS',
                revenue_target DECIMAL(15,2) DEFAULT 0,
                dashboard_config JSONB DEFAULT '{}',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- 2. Company Operations Log (Audit Trail)
            CREATE TABLE IF NOT EXISTS company_operations (
                id SERIAL PRIMARY KEY,
                company_id INT,
                user_id INT,
                action_type VARCHAR(100),
                description TEXT,
                metadata JSONB,
                ip_address VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- 3. Company Quick Sales Table
            CREATE TABLE IF NOT EXISTS company_quick_sales (
                id SERIAL PRIMARY KEY,
                company_id INT,
                invoice_number VARCHAR(100) UNIQUE,
                customer_name VARCHAR(255),
                items JSONB NOT NULL,
                subtotal DECIMAL(15,2),
                tax_total DECIMAL(15,2),
                discount_total DECIMAL(15,2),
                total_amount DECIMAL(15,2),
                payment_method VARCHAR(50),
                status VARCHAR(50) DEFAULT 'Completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- 4. Ensure Proforma and Sales Invoices have company_id
            ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS company_id INT;
            ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS company_id INT;
            
            -- 5. Company Transactions (Consolidated View)
            CREATE TABLE IF NOT EXISTS company_transactions (
                id SERIAL PRIMARY KEY,
                company_id INT,
                reference_type VARCHAR(50), -- 'INVOICE', 'QUICK_SALE', 'EXPENSE'
                reference_id INT,
                amount DECIMAL(15,2),
                entry_type VARCHAR(10), -- 'DEBIT', 'CREDIT'
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Migration Successful: Company Portal tables are ready.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err.message);
        process.exit(1);
    }
}

migrate();