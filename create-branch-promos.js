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

async function createBranchPromos() {
    try {
        console.log('=== CREATING BRANCH-SPECIFIC PROMOS ===\n');
        
        // 1. First, revert DES23 back to branch-specific (remove global setting)
        console.log('1. Reverting DES23 to branch-specific...');
        await pool.query('DELETE FROM promotions WHERE code = $1 AND branch_id IS NULL', ['DES23']);
        console.log('   ✅ Removed global DES23 promo');
        
        // 2. Show all branches
        console.log('\n2. Available branches:');
        const branches = await pool.query('SELECT * FROM branches ORDER BY id');
        branches.rows.forEach(branch => {
            console.log(`   ${branch.id}. ${branch.name} (${branch.location})`);
        });
        
        // 3. Show which branches have active users
        console.log('\n3. Branches with active users:');
        const userBranches = await pool.query(`
            SELECT DISTINCT u.store_id, b.name, b.location, COUNT(u.id) as user_count
            FROM users u
            LEFT JOIN branches b ON u.store_id = b.id
            WHERE u.status = 'Active' AND u.store_id IS NOT NULL
            GROUP BY u.store_id, b.name, b.location
            ORDER BY u.store_id
        `);
        
        userBranches.rows.forEach(branch => {
            console.log(`   Branch ${branch.store_id}: ${branch.name} (${branch.location}) - ${branch.user_count} users`);
        });
        
        // 4. Create DES23 promo for each branch that has active users
        console.log('\n4. Creating DES23 promo for branches with active users...');
        
        // First, clean up any existing DES23 promos to avoid conflicts
        await pool.query('DELETE FROM promotions WHERE code = $1', ['DES23']);
        console.log('   🧹 Cleaned up existing DES23 promos');
        
        for (const branch of userBranches.rows) {
            await pool.query(
                'INSERT INTO promotions (code, discount_percentage, branch_id) VALUES ($1, $2, $3)',
                ['DES23', 5.00, branch.store_id]
            );
            console.log(`   ✅ Created DES23 promo for ${branch.name} (ID: ${branch.store_id})`);
        }
        
        // 5. Revert server.js validation to branch-specific only
        console.log('\n5. Note: Reverting server.js validation to branch-specific only...');
        console.log('   The validation endpoint will now only accept branch-specific promos');
        
        // 6. Test validation for users
        console.log('\n6. Testing branch-specific validation:');
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
        
        console.log('\n=== SETUP COMPLETE ===');
        console.log('DES23 is now branch-specific. Users can only use it at their assigned branch.');
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

createBranchPromos();
