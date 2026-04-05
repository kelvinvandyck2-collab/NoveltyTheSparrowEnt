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

async function checkConstraints() {
    try {
        console.log('=== CHECKING PROMOTION CONSTRAINTS ===\n');
        
        // 1. Get detailed constraint information
        console.log('1. Detailed constraint information:');
        const constraints = await pool.query(`
            SELECT 
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.table_name = 'promotions'
        `);
        
        constraints.rows.forEach(constraint => {
            console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type}`);
            console.log(`     Column: ${constraint.column_name}`);
            if (constraint.foreign_table_name) {
                console.log(`     Foreign: ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
            }
        });
        
        // 2. Check current data
        console.log('\n2. Current promotions data:');
        const data = await pool.query('SELECT * FROM promotions ORDER BY code, branch_id');
        console.log(`   Found ${data.rows.length} promos:`);
        data.rows.forEach(promo => {
            console.log(`     ${promo.code} -> Branch ${promo.branch_id}`);
        });
        
        // 3. Try to insert one by one to see which fails
        console.log('\n3. Testing individual inserts:');
        const branches = [1, 2, 3, 4];
        
        for (const branchId of branches) {
            try {
                await pool.query(
                    'INSERT INTO promotions (code, discount_percentage, branch_id) VALUES ($1, $2, $3)',
                    ['TEST', 5.00, branchId]
                );
                console.log(`   ✅ Branch ${branchId}: Success`);
            } catch (err) {
                console.log(`   ❌ Branch ${branchId}: ${err.message}`);
            }
        }
        
        // 4. Clean up test data
        await pool.query('DELETE FROM promotions WHERE code = $1', ['TEST']);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkConstraints();
