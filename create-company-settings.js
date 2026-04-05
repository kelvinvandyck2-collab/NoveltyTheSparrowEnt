const { pool } = require('./server.js');

async function createCompanySettingsTable() {
    try {
        console.log('Creating company_settings table...');
        
        // Create the company_settings table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS company_settings (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL DEFAULT 'Default Company',
                email VARCHAR(255),
                phone VARCHAR(50),
                address TEXT,
                tax_rate DECIMAL(5,4) DEFAULT 0.1500,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        await pool.query(createTableQuery);
        console.log('company_settings table created successfully!');
        
        // Check if there are any existing settings
        const existingSettings = await pool.query('SELECT COUNT(*) as count FROM company_settings');
        
        if (parseInt(existingSettings.rows[0].count) === 0) {
            // Insert default settings
            const insertDefaultQuery = `
                INSERT INTO company_settings (name, email, phone, address, tax_rate)
                VALUES ('Default Company', '', '', '', 0.1500);
            `;
            
            await pool.query(insertDefaultQuery);
            console.log('Default company settings inserted!');
        } else {
            console.log('Company settings already exist, skipping default insertion.');
        }
        
        console.log('Company settings setup completed!');
        
    } catch (error) {
        console.error('Error setting up company settings:', error);
    }
}

createCompanySettingsTable();
