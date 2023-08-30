const db = require('../config/database');

async function createOTPTable() {
    try {
        await db.query(`
        CREATE TABLE IF NOT EXISTS otp_table
        (
            id SERIAL PRIMARY KEY,
            email TEXT,
            otp TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
        `)

        console.log('OTP table created or already exists');
    }
    catch (error) {
        console.error('Error creating OTP table:', error);
    }
    };

module.exports = createOTPTable;