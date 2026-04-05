const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection - same as server.js
let pool;
try {
    const connStr = process.env.DATABASE_URL;
    const isProduction = process.env.NODE_ENV === 'production';
    const isSupabase = connStr && (
        connStr.includes('supabase.co') || 
        connStr.includes('supabase.com') || 
        connStr.includes('sslmode=require')
    );
    const ssl = (isProduction || isSupabase) ? { rejectUnauthorized: false } : false;

    if (process.env.PGHOST || process.env.PGUSER || process.env.PGPASSWORD || process.env.PGDATABASE) {
        const poolConfig = {
            host: process.env.PGHOST || 'localhost',
            user: process.env.PGUSER || undefined,
            password: process.env.PGPASSWORD || undefined,
            database: process.env.PGDATABASE || undefined,
            port: process.env.PGPORT ? parseInt(process.env.PGPORT) : undefined,
            ssl
        };
        pool = new Pool(poolConfig);
    } else if (connStr) {
        let cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '')
                                .replace(/\?&/, '?')
                                .replace(/&&/g, '&')
                                .replace(/[?&]$/, '');

        if (cleanConnStr.includes(':6543')) {
            const separator = cleanConnStr.includes('?') ? '&' : '?';
            if (!cleanConnStr.includes('prepare_threshold')) {
                cleanConnStr += `${separator}prepare_threshold=0`;
            }
        }

        pool = new Pool({ connectionString: cleanConnStr, ssl });
    } else {
        throw new Error('No database configuration found');
    }
} catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
}

async function runMigration() {
    try {
        console.log('Running company schema migration...');
        
        // Read the migration file
        const migrationSQL = fs.readFileSync('./migrations/003_company_schema.sql', 'utf8');
        
        // Execute the migration
        await pool.query(migrationSQL);
        
        console.log('Company schema migration completed successfully!');
        
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
