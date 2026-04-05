const { Pool } = require('pg');
require('dotenv').config();

// Use exact same database configuration as server.js
const connStr = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';
const isSupabase = connStr && (
    connStr.includes('supabase.co') || 
    connStr.includes('supabase.com') || 
    connStr.includes('sslmode=require')
);
const ssl = (isProduction || isSupabase) ? { rejectUnauthorized: false } : false;

const pool = new Pool({
    connectionString: connStr,
    ssl: ssl
});

async function checkDuplicates() {
    try {
        console.log('🔍 CHECKING FOR DUPLICATE COKE001 PRODUCTS');
        console.log('═════════════════════════════════════════\n');
        
        // Check all COKE001 products
        const cokeRes = await pool.query(`
            SELECT id, barcode, name, stock, stock_levels, created_at, price 
            FROM products 
            WHERE barcode = 'COKE001' 
            ORDER BY id
        `);
        
        console.log(`Found ${cokeRes.rows.length} COKE001 products:\n`);
        
        let totalStock = 0;
        let kumasiStock = 0;
        let noveltyStock = 0;
        
        cokeRes.rows.forEach((product, index) => {
            console.log(`${index + 1}. Product ID: ${product.id}`);
            console.log(`   Name: ${product.name}`);
            console.log(`   Total Stock: ${product.stock}`);
            console.log(`   Stock Levels:`, product.stock_levels);
            console.log(`   Price: ${product.price}`);
            console.log(`   Created: ${product.created_at}`);
            console.log('');
            
            totalStock += parseInt(product.stock) || 0;
            
            if (product.stock_levels) {
                let levels = product.stock_levels;
                if (typeof levels === 'string') {
                    try {
                        levels = JSON.parse(levels);
                    } catch (e) {
                        levels = {};
                    }
                }
                kumasiStock += parseInt(levels['Kumasi Branch']) || 0;
                noveltyStock += parseInt(levels['NOVELTY']) || 0;
            }
        });
        
        console.log('📊 SUMMARY:');
        console.log('───────────────────────────────────────');
        console.log(`Total stock across all COKE001 products: ${totalStock}`);
        console.log(`Total Kumasi Branch stock: ${kumasiStock}`);
        console.log(`Total NOVELTY stock: ${noveltyStock}`);
        console.log('');
        
        // Check which product the transfer is trying to update (product_id 360)
        const specificProduct = cokeRes.rows.find(p => p.id == 360);
        if (specificProduct) {
            console.log('🎯 PRODUCT ID 360 (being updated by transfers):');
            console.log('───────────────────────────────────────');
            console.log(`Name: ${specificProduct.name}`);
            console.log(`Total Stock: ${specificProduct.stock}`);
            console.log(`Stock Levels:`, specificProduct.stock_levels);
        } else {
            console.log('❌ Product ID 360 not found!');
        }
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkDuplicates();
