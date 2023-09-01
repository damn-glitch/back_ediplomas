// const db = require('../config/database');

async function createUniversityTable(db) {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS universities
            (
                id SERIAL PRIMARY KEY,
                name TEXT,
                city TEXT
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