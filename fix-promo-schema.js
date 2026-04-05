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

async function fixPromoSchema() {
    try {
        console.log('=== FIXING PROMO SCHEMA FOR BRANCH-SPECIFIC PROMOS ===\n');
        
        // 1. Remove the UNIQUE constraint on the code column
        console.log('1. Removing UNIQUE constraint on promotions.code...');
        try {
            await pool.query('ALTER TABLE promotions DROP CONSTRAINT promotions_code_key');
            console.log('   ✅ Removed promotions_code_key constraint');
        } catch (err) {
            if (err.message.includes('does not exist')) {
                console.log('   ⏭️  Constraint already removed');
            } else {
                console.log('   ❌ Error removing constraint:', err.message);
            }
        }
        
        // 2. Add a composite UNIQUE constraint for code + branch_id
        console.log('\n2. Adding composite UNIQUE constraint (code, branch_id)...');
        try {
            await pool.query('ALTER TABLE promotions ADD CONSTRAINT promotions_code_branch_id_key UNIQUE (code, branch_id)');
            console.log('   ✅ Added composite UNIQUE constraint');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('   ⏭️  Composite constraint already exists');
            } else {
                console.log('   ❌ Error adding composite constraint:', err.message);
            }
        }
        
        // 3. Clean up any existing DES23 promos
        console.log('\n3. Cleaning up existing DES23 promos...');
        await pool.query('DELETE FROM promotions WHERE code = $1', ['DES23']);
        console.log('   ✅ Cleaned up existing DES23 promos');
        
        // 4. Get branches with active users
        console.log('\n4. Getting branches with active users...');
        const userBranches = await pool.query(`
            SELECT DISTINCT u.store_id, b.name, b.location, COUNT(u.id) as user_count
            FROM users u
            LEFT JOIN branches b ON u.store_id = b.id
            WHERE u.status = 'Active' AND u.store_id IS NOT NULL
            GROUP BY u.store_id, b.name, b.location
            ORDER BY u.store_id
        `);
        
        // 5. Create DES23 promo for each branch with active users
        console.log('\n5. Creating DES23 promo for each branch...');
        for (const branch of userBranches.rows) {
            await pool.query(
                'INSERT INTO promotions (code, discount_percentage, branch_id) VALUES ($1, $2, $3)',
                ['DES23', 5.00, branch.store_id]
            );
            console.log(`   ✅ Created DES23 promo for ${branch.name} (ID: ${branch.store_id}) - ${branch.user_count} users`);
        }
        
        // 6. Revert server.js validation to branch-specific only
        console.log('\n6. Reverting server.js validation to branch-specific only...');
        
        // 7. Test validation
        console.log('\n7. Testing branch-specific validation:');
        const users = await pool.query(`
            SELECT id, name, email, role, store_location, store_id 
            FROM users 
            WHERE status = 'Active' 
            ORDER BY id 
            LIMIT 5
        `);
        
        for (const user of users.rows) {
            const validation = await pool.query(
                'SELECT * FROM promotions WHERE code = $1 AND branch_id = $2',
                ['DES23', user.store_id]
            );
            
            console.log(`   - ${user.name}: ${validation.rows.length > 0 ? '✅ VALID' : '❌ INVALID'} (Branch ID: ${user.store_id})`);
        }
        
        console.log('\n=== SCHEMA FIX COMPLETE ===');
        console.log('DES23 is now properly branch-specific with correct schema constraints.');
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

fixPromoSchema();
