// const db = require('../config/database');
async function createUsersTable(db) {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS users
            (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE,
                password TEXT,
                name TEXT,
                email_validated BOOL,
                role_id INT,
                description TEXT,
                filials INT,
                vacancies INT,
                employers INT,
                main_photo TEXT,
                CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id)
            );
        `)
        // console.log('Users table created or already exists');
        }
        catch (error) {
            console.error('Error creating users table:', error);
        }
    }
module.exports = createUsersTable;