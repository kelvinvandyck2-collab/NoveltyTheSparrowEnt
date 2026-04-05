const bcrypt = require('bcryptjs');
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

async function createCompanyUser() {
    try {
        console.log('Creating company user...');
        
        // First create the company
        const companyResult = await pool.query(
            `INSERT INTO companies (name, contact_person, email, phone, address, tax_id, registration_number, payment_terms, credit_limit, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [
                'Novelty Company Sales',
                'Company Sales Manager',
                'Companysales@novelty.com',
                '+233-24-123-4567',
                '123 Company Street, Accra, Ghana',
                'GH-123456789',
                'REG-2025-001',
                'Net 30',
                50000.00,
                'Active'
            ]
        );
        
        const companyId = companyResult.rows[0].id;
        console.log(`Company created with ID: ${companyId}`);
        
        // Hash the password
        const hashedPassword = await bcrypt.hash('Company@123', 10);
        
        // Create the company user
        const userResult = await pool.query(
            `INSERT INTO company_users (company_name, email, password, contact_person, phone, address, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
                'Novelty Company Sales',
                'Companysales@novelty.com',
                hashedPassword,
                'Company Sales Manager',
                '+233-24-123-4567',
                '123 Company Street, Accra, Ghana',
                'Active'
            ]
        );
        
        const userId = userResult.rows[0].id;
        console.log(`Company user created with ID: ${userId}`);
        
        console.log('Company user setup completed successfully!');
        console.log('Login credentials:');
        console.log('Email: Companysales@novelty.com');
        console.log('Password: Company@123');
        
    } catch (error) {
        console.error('Error creating company user:', error);
    } finally {
        await pool.end();
    }
}

createCompanyUser();
