// Initialize the database
module.exports = function createTables(db){
    db.connect()
    .then(() => {
        console.log('Connected to the PostgreSQL database');
        // db.query(`drop table if exists users`)
        // db.query(`drop table if exists graduates`);
        // db.query(`drop table if exists universities`);
        // db.query(`drop table otp_table`)

        // Initialize the database
        db.query(`
            CREATE TABLE IF NOT EXISTS roles
            (
                id SERIAL PRIMARY KEY,
                name TEXT
            );
        `)
        .then(async () => {
            console.log('Roles table created or already exists');
            const roles = await db.query(`SELECT * FROM roles`);
            if (roles.rows.length === 0) {
                db.query(`
                    INSERT INTO roles
                    VALUES
                    (1, 'employer'),
                    (2, 'student'),
                    (3, 'university admission')
                `)
                .then(() => {
                    console.log('Roles table created or already exists');
                })
                .catch((error) => {
                    console.error('Error creating Roles table:', error);
                });
            }
        })
        .catch((error) => {
            console.error('Error creating Roles table:', error);
        });

        db.query(`
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
            )
        `)
            .then(() => {

                console.log('Users table created or already exists');
            })
            .catch((error) => {
                console.error('Error creating users table:', error);
            });
        db.query(`
            CREATE TABLE IF NOT EXISTS universities
            (
                id SERIAL PRIMARY KEY,
                name TEXT,
                city TEXT
            )
        `)
            .then(() => {
                // db.query(`insert into universities
                //           values (1, 'KBTU', 'Алматы')`)
                console.log('Universities table created or already exists');
            })
            .catch((error) => {
                console.error('Error creating universities table:', error);
            });


        db.query(`
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
                constraint fk_university_id
                foreign key (university_id)
                references universities( id )
            )
        `)
            .then(() => {
                console.log('Graduates table created or already exists');
            })
            .catch((error) => {
                console.error('Error creating graduates table:', error);
            });

        db.query(`
            CREATE TABLE IF NOT EXISTS otp_table
            (
                id SERIAL PRIMARY KEY,
                email TEXT,
                otp TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `)
            .then(() => {
                console.log('OTP table created or already exists');
            })
            .catch((error) => {
                console.error('Error creating OTP table:', error);
            });

        // Start the server
        const port = 8080;
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch((error) => {
        console.error('Error connecting to the PostgreSQL database:', error);
    });
}