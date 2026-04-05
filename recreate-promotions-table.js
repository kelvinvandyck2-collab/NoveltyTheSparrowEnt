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

async function recreatePromotionsTable() {
    try {
        console.log('=== RECREATING PROMOTIONS TABLE FOR BRANCH-SPECIFIC PROMOS ===\n');
        
        // 1. Backup existing data
        console.log('1. Backing up existing promotions...');
        const existingData = await pool.query('SELECT * FROM promotions');
        console.log(`   Backed up ${existingData.rows.length} promos`);
        
        // 2. Drop the table
        console.log('\n2. Dropping promotions table...');
        await pool.query('DROP TABLE promotions CASCADE');
        console.log('   ✅ Dropped promotions table');
        
        // 3. Recreate with correct structure
        console.log('\n3. Recreating promotions table with correct structure...');
        await pool.query(`
            CREATE TABLE promotions (
                code VARCHAR(50) NOT NULL,
                discount_percentage DECIMAL(5,2) NOT NULL,
                total_discounted DECIMAL(10,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                branch_id INTEGER,
                PRIMARY KEY (code, branch_id)
            )
        `);
        console.log('   ✅ Recreated promotions table with composite primary key');
        
        // 4. Restore data (except DES23 which we'll recreate)
        console.log('\n4. Restoring existing data...');
        for (const promo of existingData.rows) {
            if (promo.code !== 'DES23') {
                await pool.query(
                    'INSERT INTO promotions (code, discount_percentage, total_discounted, created_at, branch_id) VALUES ($1, $2, $3, $4, $5)',
                    [promo.code, promo.discount_percentage, promo.total_discounted, promo.created_at, promo.branch_id]
                );
                console.log(`   ✅ Restored ${promo.code} for branch ${promo.branch_id}`);
            }
        }
        
        // 5. Create DES23 promo for all branches with active users
        console.log('\n5. Creating DES23 promo for all branches with active users...');
        const userBranches = await pool.query(`
            SELECT DISTINCT u.store_id, b.name, b.location, COUNT(u.id) as user_count
            FROM users u
            LEFT JOIN branches b ON u.store_id = b.id
            WHERE u.status = 'Active' AND u.store_id IS NOT NULL
            GROUP BY u.store_id, b.name, b.location
            ORDER BY u.store_id
        `);
        
        for (const branch of userBranches.rows) {
            await pool.query(
                'INSERT INTO promotions (code, discount_percentage, branch_id) VALUES ($1, $2, $3)',
                ['DES23', 5.00, branch.store_id]
            );
            console.log(`   ✅ Created DES23 promo for ${branch.name} (ID: ${branch.store_id})`);
        }
        
        // 6. Test validation
        console.log('\n6. Testing branch-specific validation:');
        const users = await pool.query(`
            SELECT id, name, email, role, store_location, store_id 
            FROM users 
            WHERE status = 'Active' 
            ORDER BY id 
            LIMIT 8
        `);
        
        for (const user of users.rows) {
            const validation = await pool.query(
                'SELECT * FROM promotions WHERE code = $1 AND branch_id = $2',
                ['DES23', user.store_id]
            );
            
            console.log(`   - ${user.name}: ${validation.rows.length > 0 ? '✅ VALID' : '❌ INVALID'} (Branch ID: ${user.store_id})`);
        }
        
        // 7. Show final result
        console.log('\n7. Final promotions table:');
        const finalData = await pool.query('SELECT * FROM promotions ORDER BY code, branch_id');
        console.log(`   Total promos: ${finalData.rows.length}`);
        finalData.rows.forEach(promo => {
            console.log(`     ${promo.code} -> Branch ${promo.branch_id} (${promo.discount_percentage}% discount)`);
        });
        
        console.log('\n=== RECREATION COMPLETE ===');
        console.log('DES23 is now properly branch-specific with correct table structure!');
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

recreatePromotionsTable();
