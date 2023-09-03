// const db = require('../config/database');

async function createUniversityTable(db) {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS universities
            (
                id SERIAL PRIMARY KEY,
                name TEXT,
                city TEXT,
                email TEXT,
                number_of_students INT,
                phone TEXT,
                rating TEXT,
                gpa TEXT,
                number_of_graduates INT,
                number_of_best_students INT,
            )
        `)
                // db.query(`insert into universities
                //           values (1, 'KBTU', 'Алматы')`)
        console.log('Universities table created or already exists');
        }
        catch (error) {
            console.error('Error creating universities table:', error);
        }
}

module.exports = createUniversityTable;