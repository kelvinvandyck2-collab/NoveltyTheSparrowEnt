/**
 * cleanup_negative_stock.js
 * 
 * One-time script to fix phantom negative stock_levels entries.
 * 
 * What it does:
 *  1. Finds all products that have ANY negative value in their stock_levels JSONB.
 *  2. For each such product, sets any negative branch value to 0
 *     (these are phantom entries created by the branch-key-mismatch bug).
 *  3. Recalculates the total `stock` column as the SUM of all location values.
 * 
 * Run ONCE after deploying the server.js fix:
 *   node cleanup_negative_stock.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// Read connection from .env (same as server.js)
const connStr = process.env.DATABASE_URL;
const isSupabase = connStr && (
    connStr.includes('supabase.co') ||
    connStr.includes('supabase.com') ||
    connStr.includes('sslmode=require')
);
const isProduction = process.env.NODE_ENV === 'production';
const ssl = (isProduction || isSupabase) ? { rejectUnauthorized: false } : false;

let pool;
if (process.env.PGHOST || process.env.PGUSER) {
    pool = new Pool({
        host: process.env.PGHOST || 'localhost',
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
        ssl
    });
} else if (connStr) {
    let cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');
    pool = new Pool({ connectionString: cleanConnStr, ssl });
} else {
    console.error('No DB config found. Set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE in .env');
    process.exit(1);
}

async function cleanupNegativeStock() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch all products with at least one negative value in stock_levels
        const res = await client.query(`
            SELECT id, barcode, name, stock, stock_levels
            FROM products
            WHERE EXISTS (
                SELECT 1
                FROM jsonb_each_text(COALESCE(stock_levels, '{}'))
                WHERE value::int < 0
            )
        `);

        console.log(`\n🔍 Found ${res.rows.length} product(s) with negative branch stock levels.\n`);

        for (const product of res.rows) {
            const levels = product.stock_levels || {};

            let changed = false;
            for (const key of Object.keys(levels)) {
                const val = parseInt(levels[key]);
                if (isNaN(val) || val < 0) {
                    console.log(`  ⚠️  ${product.name} (${product.barcode}): Setting "${key}" from ${val} → 0`);
                    levels[key] = 0;
                    changed = true;
                }
            }

            if (changed) {
                // Recalculate total stock from cleaned levels
                const totalStock = Object.values(levels).reduce((sum, v) => sum + (parseInt(v) || 0), 0);

                await client.query(
                    'UPDATE products SET stock_levels = $1, stock = $2 WHERE id = $3',
                    [JSON.stringify(levels), totalStock, product.id]
                );

                console.log(`  ✅ ${product.name}: stock_levels cleaned, total stock set to ${totalStock}\n`);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Cleanup complete. All phantom negatives have been zeroed out.\n');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Cleanup failed, rolled back:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

cleanupNegativeStock();
