const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runEnhancedInventoryMigration() {
    console.log('🔄 Running Enhanced Inventory System Migration...\n');
    
    try {
        // 1. Enhanced Products Table
        console.log('📦 Creating enhanced products table...');
        await pool.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_unit VARCHAR(50) DEFAULT 'Unit';
            ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_unit VARCHAR(50) DEFAULT 'Box';
            ALTER TABLE products ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10,2) DEFAULT 1;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 5;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS track_batch BOOLEAN DEFAULT false;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS track_expiry BOOLEAN DEFAULT false;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS branch_id INTEGER;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        // 2. Price Lists Tables
        console.log('💰 Creating pricing tables...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS price_lists (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                list_type VARCHAR(50),
                branch_id INTEGER,
                effective_date DATE,
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS price_list_items (
                id SERIAL PRIMARY KEY,
                price_list_id INTEGER REFERENCES price_lists(id) ON DELETE CASCADE,
                product_barcode VARCHAR(50) REFERENCES products(barcode),
                markup_percentage DECIMAL(5,2),
                selling_price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Shelf Management
        console.log('📚 Creating shelf management tables...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS shelf_inventory (
                id SERIAL PRIMARY KEY,
                product_barcode VARCHAR(50) REFERENCES products(barcode),
                quantity_on_shelf INTEGER DEFAULT 0,
                store_quantity INTEGER DEFAULT 0,
                branch_id INTEGER,
                last_verified TIMESTAMP,
                staff_id INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS shelf_movements (
                id SERIAL PRIMARY KEY,
                product_barcode VARCHAR(50) REFERENCES products(barcode),
                movement_type VARCHAR(50),
                quantity INTEGER,
                staff_id INTEGER,
                from_location VARCHAR(100),
                to_location VARCHAR(100),
                branch_id INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Stock Adjustments
        console.log('⚙️ Creating stock adjustments table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS stock_adjustments (
                id SERIAL PRIMARY KEY,
                product_barcode VARCHAR(50) REFERENCES products(barcode),
                adjustment_type VARCHAR(50),
                quantity_adjusted INTEGER,
                reason TEXT,
                approver_id INTEGER,
                branch_id INTEGER,
                approved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Stock Takes
        console.log('📋 Creating stock take tables...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS stock_takes (
                id SERIAL PRIMARY KEY,
                stock_take_date DATE,
                branch_id INTEGER,
                created_by INTEGER,
                approved_by INTEGER,
                status VARCHAR(50) DEFAULT 'In Progress',
                variance_total DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS stock_take_items (
                id SERIAL PRIMARY KEY,
                stock_take_id INTEGER REFERENCES stock_takes(id) ON DELETE CASCADE,
                product_barcode VARCHAR(50) REFERENCES products(barcode),
                physical_count INTEGER,
                system_count INTEGER,
                variance INTEGER,
                variance_reason VARCHAR(255),
                counted_by VARCHAR(100),
                counted_at TIMESTAMP
            );
        `);

        // 6. Enhanced Stock Transfers
        console.log('🔄 Creating stock transfer tables...');
        await pool.query(`
            ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS branch_id INTEGER;
            ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS confirmed_by INTEGER;
            ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
            ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS notes TEXT;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS stock_transfer_items (
                id SERIAL PRIMARY KEY,
                transfer_id INTEGER REFERENCES stock_transfers(id) ON DELETE CASCADE,
                product_barcode VARCHAR(50) REFERENCES products(barcode),
                quantity_sent INTEGER,
                quantity_received INTEGER,
                unit_cost DECIMAL(10,2),
                batch_number VARCHAR(100),
                expiry_date DATE
            );
        `);

        // 7. Enhanced Batches
        console.log('🎁 Creating enhanced batch tracking...');
        await pool.query(`
            DROP TABLE IF EXISTS product_batches CASCADE;
        `);

        await pool.query(`
            CREATE TABLE product_batches (
                id SERIAL PRIMARY KEY,
                product_barcode VARCHAR(50) REFERENCES products(barcode),
                batch_number VARCHAR(100) NOT NULL,
                expiry_date DATE,
                manufactured_date DATE,
                quantity_received INTEGER DEFAULT 0,
                quantity_available INTEGER DEFAULT 0,
                quantity_sold INTEGER DEFAULT 0,
                cost_price DECIMAL(10,2),
                unit_cost DECIMAL(10,2),
                branch_id INTEGER,
                status VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(product_barcode, batch_number, branch_id)
            );
        `);

        // 8. Goods Received Log
        console.log('📥 Creating goods received log...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS goods_received (
                id SERIAL PRIMARY KEY,
                po_id INTEGER REFERENCES purchase_orders(id),
                product_barcode VARCHAR(50) REFERENCES products(barcode),
                quantity_received INTEGER,
                quantity_packaging_units INTEGER,
                unit_cost DECIMAL(10,2),
                batch_number VARCHAR(100),
                expiry_date DATE,
                received_by INTEGER,
                invoice_number VARCHAR(100),
                branch_id INTEGER,
                received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 9. Reorder Alerts
        console.log('🚨 Creating reorder alerts table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reorder_alerts (
                id SERIAL PRIMARY KEY,
                product_barcode VARCHAR(50) REFERENCES products(barcode),
                current_stock INTEGER,
                reorder_level INTEGER,
                suggested_quantity INTEGER,
                priority VARCHAR(20),
                status VARCHAR(50) DEFAULT 'Active',
                branch_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                acknowledged_at TIMESTAMP
            );
        `);

        // 10. Inventory Audit Log
        console.log('📊 Creating audit log...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory_audit_log (
                id SERIAL PRIMARY KEY,
                action_type VARCHAR(100),
                product_barcode VARCHAR(50) REFERENCES products(barcode),
                quantity_before INTEGER,
                quantity_after INTEGER,
                reference_id INTEGER,
                reference_type VARCHAR(50),
                user_id INTEGER,
                branch_id INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 11. Product Performance
        console.log('📈 Creating product performance table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_performance (
                id SERIAL PRIMARY KEY,
                product_barcode VARCHAR(50) REFERENCES products(barcode),
                year INTEGER,
                month INTEGER,
                quantity_sold INTEGER DEFAULT 0,
                revenue DECIMAL(10,2) DEFAULT 0,
                average_daily_sales DECIMAL(10,2) DEFAULT 0,
                classification VARCHAR(50),
                branch_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 12. Create indexes
        console.log('🔍 Creating indexes for performance...');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);',
            'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);',
            'CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_barcode);',
            'CREATE INDEX IF NOT EXISTS idx_batches_expiry ON product_batches(expiry_date);',
            'CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_barcode);',
            'CREATE INDEX IF NOT EXISTS idx_stock_takes_date ON stock_takes(stock_take_date);',
            'CREATE INDEX IF NOT EXISTS idx_transfers_status ON stock_transfers(status);',
            'CREATE INDEX IF NOT EXISTS idx_reorder_alerts_priority ON reorder_alerts(priority);',
            'CREATE INDEX IF NOT EXISTS idx_audit_log_product ON inventory_audit_log(product_barcode);',
        ];

        for (const index of indexes) {
            try {
                await pool.query(index);
            } catch (err) {
                console.log('   Index already exists:', err.message.split('\n')[0]);
            }
        }

        console.log('\n✅ Enhanced Inventory Migration Completed Successfully!\n');
        console.log('📌 New Features Available:');
        console.log('   ✓ Enhanced Product Setup (units, packaging, reorder levels)');
        console.log('   ✓ Supplier Management & Purchase Orders');
        console.log('   ✓ Goods Receiving with batch tracking');
        console.log('   ✓ Dynamic Pricing & Pricelists');
        console.log('   ✓ Shelf Management');
        console.log('   ✓ Batch & Expiry Tracking (FIFO/FEFO)');
        console.log('   ✓ Stock Transfers between branches');
        console.log('   ✓ Stock Adjustments (damage, theft, errors)');
        console.log('   ✓ Stock Taking & Physical Counts');
        console.log('   ✓ Reorder Alerts');
        console.log('   ✓ Audit Logging');
        console.log('   ✓ Performance Analytics\n');

    } catch (error) {
        console.error('❌ Migration Error:', error);
    } finally {
        await pool.end();
    }
}

runEnhancedInventoryMigration();
