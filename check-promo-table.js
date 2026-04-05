const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const connStr = process.env.DATABASE_URL;
const isRemote = (connStr && (
    connStr.includes('supabase.co') || 
    connStr.includes('aws-0') ||
    connStr.includes('pooler')
)) || (process.env.PGHOST && !process.env.PGHOST.includes('localhost'));

const ssl = (isRemote) ? { rejectUnauthorized: false } : false;

const commonPoolConfig = {
    max: 20,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 30000,
    query_timeout: 120000,
    maxUses: 7500,
    ssl
};

if (isRemote) {
    commonPoolConfig.keepAlive = true;
    commonPoolConfig.keepAliveInitialDelayMillis = 5000;
    commonPoolConfig.application_name = 'pos_app';
}

const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({ connectionString: cleanConnStr, ...commonPoolConfig });

async function checkPromoTable() {
    try {
        console.log('=== CHECKING PROMOTIONS TABLE STRUCTURE ===\n');
        
        // 1. Get table structure
        console.log('1. Promotions table structure:');
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'promotions'
            ORDER BY ordinal_position
        `);
        
        structure.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
        });
        
        // 2. Get constraints
        console.log('\n2. Promotions table constraints:');
        const constraints = await pool.query(`
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_name = 'promotions'
        `);
        
        constraints.rows.forEach(constraint => {
            console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type}`);
        });
        
        // 3. Get current data
        console.log('\n3. Current promotions data:');
        const data = await pool.query('SELECT * FROM promotions');
        console.log(`   Found ${data.rows.length} promos:`);
        data.rows.forEach(promo => {
            console.log(`     ${JSON.stringify(promo)}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkPromoTable();
