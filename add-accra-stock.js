const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addStockToAccra() {
    try {
        console.log('\n📦 ADDING SMIRNOFF STOCK TO ACCRA CENTRAL...\n');
        
        // Get SMIRNOFF product
        const product = await pool.query(
            'SELECT * FROM products WHERE name = $1',
            ['SMIRNOFF']
        );

        if (product.rows.length === 0) {
            console.log('❌ SMIRNOFF product not found');
            await pool.end();
            return;
        }

        const smirnoff = product.rows[0];
        console.log('Current stock_levels:', smirnoff.stock_levels);

        // Add 15 units to Accra Central
        const updatedLevels = {
            ...smirnoff.stock_levels,
            'Accra Central': (smirnoff.stock_levels['Accra Central'] || 0) + 15
        };

        // Update total stock
        const totalStock = Object.values(updatedLevels).reduce((sum, val) => sum + (val || 0), 0);

        const result = await pool.query(
            'UPDATE products SET stock_levels = $1, stock = $2 WHERE barcode = $3 RETURNING *',
            [JSON.stringify(updatedLevels), totalStock, smirnoff.barcode]
        );

        console.log('\n✅ Updated SMIRNOFF:');
        console.log('New stock_levels:', result.rows[0].stock_levels);
        console.log('New total stock:', result.rows[0].stock);

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

addStockToAccra();
