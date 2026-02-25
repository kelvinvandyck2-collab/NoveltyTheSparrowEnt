const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixStockLevels() {
    try {
        console.log('Fixing stock_levels for all products...');
        
        // Get all products with NULL or empty stock_levels
        const result = await pool.query(`
            SELECT barcode, stock FROM products 
            WHERE stock_levels IS NULL OR stock_levels = '{}'::jsonb
        `);
        
        console.log(`Found ${result.rows.length} products to fix`);
        
        for (const product of result.rows) {
            const stockLevels = JSON.stringify({ 'Main Warehouse': product.stock || 0 });
            await pool.query(
                'UPDATE products SET stock_levels = $1 WHERE barcode = $2',
                [stockLevels, product.barcode]
            );
            console.log(`✅ Fixed ${product.barcode} with stock ${product.stock}`);
        }
        
        console.log('\n✅ All products fixed!');
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        await pool.end();
        process.exit(1);
    }
}

fixStockLevels();
