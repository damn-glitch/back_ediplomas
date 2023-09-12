// const db = require('../config/database');

async function createRolesTable(db) {
    try {
        console.log("createRolesTable here");
        await db.query(`
            CREATE TABLE IF NOT EXISTS roles
            (
                id SERIAL PRIMARY KEY,
                name TEXT
            );
        `).then((response) => {
            console.log(response);
        });
        console.log('Roles table created or already exists');

        const roles = await db.query(`SELECT * FROM roles`);
        if (roles.rows.length === 0) {
            await db.query(`
                INSERT INTO roles
                VALUES
                (1, 'employer'),
                (2, 'student'),
                (3, 'university admission')
            `);
        }

        console.log('Roles table initialized successfully');
    } catch (error) {
        console.error('Error initializing roles table:', error);
    }
}

module.exports = createRolesTable;