const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

async function hashPasswords() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    try {
        console.log('Starting password migration...');
        // Get all users
        const { rows: users } = await pool.query('SELECT id, password FROM users');
        
        for (const user of users) {
            if (!user.password) continue;

            // Skip already hashed passwords (bcrypt hashes start with $2a$, $2b$, or $2y$)
            if (user.password.startsWith('$2')) {
                console.log(`User ${user.id} already has hashed password. Skipping.`);
                continue;
            }
            
            // Hash the password
            const hashedPassword = await bcrypt.hash(user.password, 10);
            
            // Update the user with hashed password
            await pool.query('UPDATE users SET password = $1 WHERE id = $2', [
                hashedPassword,
                user.id
            ]);
            
            console.log(`Updated password for user ${user.id}`);
        }
        
        console.log('All passwords have been hashed successfully');
    } catch (error) {
        console.error('Error hashing passwords:', error);
    } finally {
        await pool.end();
    }
}

hashPasswords();