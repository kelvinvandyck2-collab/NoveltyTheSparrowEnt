// c:\Users\GUYMAN-GH\OneDrive\Documents\2025 PROJECT\2025 POS\POS\2025 POS\dhis2.js

const axios = require('axios');

// DHIS2 Configuration
// Ideally, move these to your .env file
const DHIS2_CONFIG = {
    url: process.env.DHIS2_URL || 'https://play.dhis2.org/2.39', // Replace with your DHIS2 URL
    auth: {
        username: process.env.DHIS2_USERNAME || 'admin',
        password: process.env.DHIS2_PASSWORD || 'district'
    }
};

// Mappings: Map your POS Branch Names to DHIS2 Organisation Unit UIDs
const ORG_UNIT_MAP = {
    'Main Warehouse': 'ImspTQPwCqd', // Replace with actual DHIS2 UID
    'Accra Branch': 'ImspTQPwCqd',   // Replace with actual DHIS2 UID
    'Kumasi Branch': 'ImspTQPwCqd',  // Replace with actual DHIS2 UID
    'Accra Central': 'ImspTQPwCqd'   // Replace with actual DHIS2 UID
};

// Mappings: Map your POS Metrics to DHIS2 Data Element UIDs
const DATA_ELEMENT_MAP = {
    'revenue': 'fbfJHSPpUQD',      // Replace with UID for "Total Revenue"
    'transactions': 'cYeuwXTCPkU'  // Replace with UID for "Transaction Count"
};

/**
 * Pushes aggregate data values to DHIS2
 * @param {Array} dataValues - Array of objects { dataElement, period, orgUnit, value }
 */
async function sendDataValueSets(dataValues) {
    try {
        const response = await axios.post(`${DHIS2_CONFIG.url}/api/dataValueSets`, {
            dataValues: dataValues
        }, {
            auth: DHIS2_CONFIG.auth,
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('DHIS2 Sync Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('DHIS2 Sync Error:', error.response ? error.response.data : error.message);
        throw new Error(error.response?.data?.message || error.message);
    }
}

module.exports = {
    sendDataValueSets,
    ORG_UNIT_MAP,
    DATA_ELEMENT_MAP
};
