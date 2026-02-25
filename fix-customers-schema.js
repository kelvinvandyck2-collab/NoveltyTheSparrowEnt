const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixCustomersSchema() {
    try {
        console.log('🔧 Fixing customers table schema...');

        // 1. Add 'name' column if it doesn't exist
        await pool.query(`
            ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        `);
        console.log('Checked/Added column: name');

        // 2. Add other potentially missing columns
        const columns = [
            'phone VARCHAR(50)',
            'email VARCHAR(255)',
            'credit_limit DECIMAL(10,2) DEFAULT 0.00',
            'current_balance DECIMAL(10,2) DEFAULT 0.00'
        ];

        for (const colDef of columns) {
            await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS ${colDef}`);
            console.log(`Checked/Added column definition: ${colDef}`);
        }

        // 3. Relax constraints on legacy columns (first_name, last_name)
        // This fixes "null value in column first_name violates not-null constraint"
        const legacyCols = ['first_name', 'last_name'];
        for (const col of legacyCols) {
            const check = await pool.query(
                "SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = $1",
                [col]
            );
            if (check.rows.length > 0) {
                await pool.query(`ALTER TABLE customers ALTER COLUMN ${col} DROP NOT NULL`);
                console.log(`Updated column: ${col} (Dropped NOT NULL constraint)`);
            }
        }

        console.log('✅ Customers table schema fixed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing schema:', err);
        process.exit(1);
    }
}

fixCustomersSchema();