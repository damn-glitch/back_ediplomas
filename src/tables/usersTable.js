// const db = require('../config/database');
async function createUsersTable(db) {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS users
            (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE,
                password TEXT,
                company_name TEXT,
                email_validated BOOL,
                role_id INT,
                constraint fk_user_role foreign key (role_id)
                references roles(id)
            );
        `)
        console.log('Users table created or already exists');
        }
        catch (error) {
            console.error('Error creating users table:', error);
        }
    }
module.exports = createUsersTable;