// const db = require('../config/database');

async function createUniversityTable(db) {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS universities
            (
                id SERIAL PRIMARY KEY,
                name TEXT,
                city TEXT,
                email TEXT UNIQUE,
                number_of_students INT,
                email_validated BOOL,
                description TEXT,
                phone TEXT,
                rating TEXT,
                gpa FLOAT,
                main_photo TEXT,
                number_of_graduates INT,
                number_of_best_students INT
            );
        `)
        // console.log('Universities table created or already exists');
        }
        catch (error) {
            console.error('Error creating universities table:', error);
        }
}

module.exports = createUniversityTable;