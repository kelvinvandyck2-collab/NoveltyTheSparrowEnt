const { Pool } = require('pg');
require('dotenv').config();

async function fixVAT() {
    // Use same SSL config as server
    const connStr = process.env.DATABASE_URL;
    const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');
    
    const pool = new Pool({
        connectionString: cleanConnStr,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 10000
    });

    try {
        console.log('Updating VAT rates to 0.00...');
        const result = await pool.query(
            "UPDATE system_settings SET vat_rate = 0.00 WHERE vat_rate = 15.00 OR vat_rate IS NULL"
        );
        console.log(`Updated ${result.rowCount} rows`);
        
        // Verify the update
        const check = await pool.query("SELECT branch_id, vat_rate FROM system_settings ORDER BY branch_id");
        console.log('Current VAT rates:');
        check.rows.forEach(row => {
            console.log(`  Branch ${row.branch_id}: ${row.vat_rate}%`);
        });
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

fixVAT();
