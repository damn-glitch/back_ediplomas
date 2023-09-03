// const db = require('../config/database');

async function createGraduatesTable(db) {
    try {
        await db.query(`
        CREATE TABLE IF NOT EXISTS graduates
        (
            id SERIAL PRIMARY KEY,
            fullNameEng TEXT,
            fullNameKz TEXT,
            major TEXT,
            speciality TEXT,
            IIN TEXT,
            university_id INT,
            gpa FLOAT,
            year INT,
            region TEXT,
            mobile TEXT,
            email TEXT,
            status TEXT,
            address TEXT,
            description TEXT
            constraint fk_university_id
            foreign key (university_id)
            references universities( id )
        )
        `)
    console.log('Graduates table created or already exists');
}
catch (error) {
    console.error('Error creating graduates table:', error);
}
}
module.exports = createGraduatesTable;