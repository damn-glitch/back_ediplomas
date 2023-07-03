const express = require('express');
const bodyParser = require('body-parser');
const {Client} = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const {body, validationResult} = require('express-validator');

const app = express();

const fs = require('fs');
const {Pool} = require('pg');
const axios = require("axios");
var XLSX = require("xlsx");
// Read the CA certificate file
const caCert = fs.readFileSync('ca-certificate.crt');

const db = new Client({
    host: 'app-43e769b3-e8b1-4072-b097-9e5a2dea2499-do-user-14279801-0.b.db.ondigitalocean.com',
    port: 25060,
    database: 'db',
    user: 'db',
    password: 'AVNS_ggbxdEEyvuBkDaQeqFQ',
    ssl: {
        ca: caCert,
    },
});

app.use(cors());
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
// Initialize the database
db.connect()
    .then(() => {
        console.log('Connected to the PostgreSQL database');
        // db.query(`drop table if exists users`)
        // db.query(`drop table if exists graduates`)
        // db.query(`drop table if exists universities`)
        // db.query(`drop table otp_table`)

        // Initialize the database
        db.query(`
            CREATE TABLE IF NOT EXISTS roles
            (id SERIAL PRIMARY KEY, name TEXT);
        `)
            .then(async () => {
                console.log('Roles table created or already exists');
                const roles = await db.query(`SELECT *
                                              from roles`)
                if (roles.rows.length === 0) {
                    db.query(`
                        INSERT INTO roles
                        VALUES (1, 'employer'),
                               (2, 'student')
                    `)
                        .then(() => {
                            console.log('Graduates table created or already exists');
                        })
                        .catch((error) => {
                            console.error('Error creating graduates table:', error);
                        });
                }


            })
            .catch((error) => {
                console.error('Error creating graduates table:', error);
            });
        db.query(`
            CREATE TABLE IF NOT EXISTS users
            (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE,
                password TEXT,
                company_name TEXT,
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
                console.log('Universities table created or already exists');
            })
            .catch((error) => {
                console.error('Error creating universities table:', error);
            });


        db.query(`
            CREATE TABLE IF NOT EXISTS graduates
            (
                id SERIAL PRIMARY KEY,
                fullName TEXT,
                major TEXT,
                IIN TEXT,
                university_id INT,
                constraint fk_university_id foreign key(university_id)
                references universities(id)
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

// Middleware for authentication
function authenticate(req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).send('Access denied. No token provided.');

    try {
        const decoded = jwt.verify(token, 'jwtPrivateKey');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).send('Invalid token.');
    }
}

const restrictedDomains = [
    // 'gmail.com',
    'mail.ru',
    'outlook.com',
    'yahoo.com',
    // Add more restricted domains here
];

function isRestrictedDomain(email) {
    const domain = email.split('@')[1];
    return restrictedDomains.includes(domain);
}

// Registration route
app.post(
    '/register',
    [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email address.')
            .custom((value) => {
                if (isRestrictedDomain(value)) {
                    throw new Error('Registration with this email domain is not allowed.');
                }
                return true;
            }),
        body('password')
            .isLength({min: 6})
            .withMessage('Password must be at least 6 characters long.'),
        body('companyName').notEmpty().withMessage('Company name is required.'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const {email, password, companyName} = req.body;

        try {
            // Check if the user already exists
            const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);

            if (existingUser.rows.length > 0) {
                return res.status(400).send('User already registered.');
            }

            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Save the new user
            const newUser = await db.query(
                'INSERT INTO users (email, password, company_name, role_id, email_verified) VALUES ($1, $2, $3, 1, false) RETURNING *',
                [email, hashedPassword, companyName]
            );

            // Create a new JWT token
            // const token = jwt.sign({id: newUser.rows[0].id}, 'jwtPrivateKey');
            // res.header('x-auth-token', token).send({
            //     id: newUser.rows[0].id,
            //     email,
            //     companyName,
            // });
        } catch (error) {
            console.error('Error registering the user:', error);
            res.status(500).send('Error registering the user.');
        }

        try {
            const otp = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
            const url = 'https://api.elasticemail.com/v2/email/send';
            const apiKey = '269E440A75CE8313CAC9E266D2CA62DFE024880F89428750C42FA3D1062DD89CE2D7DD1648897EC9E41DFE9AB3F8D0F0';

            var formData = new URLSearchParams();
            formData.append("apikey", apiKey);
            formData.append("subject", 'Pin code to log in: ' + otp);
            formData.append("from", 'info@jasaim.kz');
            formData.append("bodyText", 'Use it to authenticate on E-Diplomas');
            formData.append("to", email);

            const response = await axios.post(url, formData);
            if (response.data.success == false) {
                res.status(500).json({error: 'Failed to send OTP.'});
            }
            console.log(response.data);

            // Store the OTP in the database (you can modify this code according to your database structure)
            await db.query('INSERT INTO otp_table (email, otp) VALUES ($1, $2)', [email, otp]);

            res.json({message: 'OTP sent successfully ' + response.data});
        } catch (error) {
            console.error('Error sending OTP:', error);
            res.status(500).json({error: 'Failed to send OTP.' + " Error:" + error});
        }
    }
);

// Login route
app.post('/login', async (req, res) => {
    const {email, password} = req.body;

    try {
        // Check if the user exists
        const user = await db.query('SELECT * FROM users inner join roles on users.role_id = roles.id WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            return res.status(400).send('Invalid email or password.');
        }
        // Verify the password
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(400).send('Invalid email or password.');
        }
        if (!user.rows[0].email_verified) {
            return res.status(400).send('Email has not been verified');
        }

        // Create a new JWT token
        const token = jwt.sign({id: user.rows[0].id}, 'jwtPrivateKey');
        res.header('x-auth-token', token).send({
            id: user.rows[0].id,
            email: user.rows[0].email,
            companyName: user.rows[0].company_name,
            role: user.rows[0].name,
            token: token
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Error logging in.');
    }
});

// parse and insert to db route
app.get('/insert', async (req, res) => {
    // let link = "ipfs://bafybeidbedhhugo2nck5b7x5edxgpflnigwsj4jqf2gx24ddm5jvske7cu/fullMetadata.json";
    // link = link.replace("ipfs://", "https://ipfs.io/ipfs/");
    //
    // const response = await axios.get(link);
    // let newData = [];
    // for (const element of response.data) {
    //     let dict = {};
    //     Object.entries(element).forEach((k) => {
    //         const key = k[0];
    //         const value = k[1];
    //         if (key !== "attributes") {
    //             dict[key] = value;
    //         } else {
    //             (value).forEach((attr) => {
    //                 dict[attr["name"]] = attr["value"];
    //             });
    //         }
    //     });
    //
    //     newData.push(dict);
    // }
    // res.send(newData)

    // try {
    //     // Check if the user exists
    //     const user = await db.query('SELECT * FROM users inner join roles on users.role_id = roles.id WHERE email = $1', [email]);
    //
    //     if (user.rows.length === 0) {
    //         return res.status(400).send('Invalid email or password.');
    //     }
    //     // Verify the password
    //     const validPassword = await bcrypt.compare(password, user.rows[0].password);
    //     if (!validPassword) {
    //         return res.status(400).send('Invalid email or password.');
    //     }
    //     if (!user.rows[0].email_verified) {
    //         return res.status(400).send('Email has not been verified');
    //     }
    //
    //     // Create a new JWT token
    //     const token = jwt.sign({id: user.rows[0].id}, 'jwtPrivateKey');
    //     res.header('x-auth-token', token).send({
    //         id: user.rows[0].id,
    //         email: user.rows[0].email,
    //         companyName: user.rows[0].company_name,
    //         role: user.rows[0].name,
    //         token: token
    //     });
    // } catch (error) {
    //     console.error('Error logging in:', error);
    //     res.status(500).send('Error logging in.');
    // }
    // db.query(`drop table if exists temp_table`)
    db.query(`
            CREATE TABLE IF NOT EXISTS temp_table
            (
                id serial primary key
                col1 TEXT,
                col2 TEXT,
                col3 TEXT,
                col4 TEXT,
                col5 TEXT,
                col6 TEXT,
                col7 TEXT,
                col8 TEXT,
                col9 TEXT,
                col10 TEXT,
                col11 TEXT,
                col12 TEXT,
                col13 TEXT,
                col14 TEXT,
                col15 TEXT,
                col16 TEXT,
                col17 TEXT,
                col18 TEXT,
                col19 TEXT,
                col20 TEXT,
                col21 TEXT,
                col22 TEXT,
                col23 TEXT,
                col24 TEXT,
                col25 TEXT,
                col26 TEXT,
                col27 TEXT,
                col28 TEXT
            )
        `)
            .then(() => {

                console.log('temp_table table created or already exists');
            })
            .catch((error) => {
                console.error('Error creating temp_table table:', error);
            });
    const workbook = XLSX.readFile('data_with_gpa.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

    const tableName = 'temp_table';

    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        console.log(jsonData[i])
        const query = `INSERT INTO ${tableName} 
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [
            row[0] ?? '',
            row[1] ?? '',
            row[2] ?? '',
            row[3] ?? '',
            row[4] ?? '',
            row[5] ?? '',
            row[6] ?? '',
            row[7] ?? '',
            row[8] ?? '',
            row[9] ?? '',
            row[10] ?? '',
            row[11] ?? '',
            row[12] ?? '',
            row[13] ?? '',
            row[14] ?? '',
            row[15] ?? '',
            row[16] ?? '',
            row[17] ?? '',
            row[18] ?? '',
            row[19] ?? '',
            row[20] ?? '',
            row[21] ?? '',
            row[22] ?? '',
            row[23] ?? '',
            row[24] ?? '',
            row[25] ?? '',
            row[26] ?? '',
            row[27] ?? '',
            row[28] ?? ''
        ]; // Replace column1, column2, column3 with your actual column names

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Error inserting data:', err);
                return;
            }
            console.log('Data inserted successfully!');
        });
    }

});

// Account route (authenticated)
app.get('/account', authenticate, async (req, res) => {
    try {
        const user = await db.query('SELECT id, email, company_name FROM users inner join roles on users.role_id = roles.id WHERE id = $1 ', [
            req.user.id,
        ]);

        if (user.rows.length > 0) {
            res.send(user.rows[0]);
        } else {
            res.status(404).send('User not found.');
        }
    } catch (error) {
        console.error('Error fetching user account:', error);
        res.status(500).send('Error fetching user account.');
    }
});

// Update account route (authenticated)
app.put('/account', authenticate, async (req, res) => {
    const {companyName} = req.body;

    if (!companyName) {
        return res.status(400).send('Company name is required.');
    }

    try {
        const result = await db.query(
            'UPDATE users SET company_name = $1 WHERE id = $2 RETURNING *',
            [companyName, req.user.id]
        );

        if (result.rows.length > 0) {
            res.send({message: 'User updated successfully.'});
        } else {
            res.status(404).send('User not found.');
        }
    } catch (error) {
        console.error('Error updating user account:', error);
        res.status(500).send('Error updating user account.');
    }
});

// Graduates route (authenticated)
app.get('/graduates', authenticate, async (req, res) => {
    try {
        const graduates = await db.query('SELECT * FROM graduates');

        res.send(graduates.rows);
    } catch (error) {
        console.error('Error fetching graduates:', error);
        res.status(500).send('Error fetching graduates.');
    }
});

// Search graduates by metadata (authenticated)
app.get('/search/', async (req, res) => {
    const name = req.query.name;
    const gpaL = req.query.gpaL;
    const gpaR = req.query.gpaR;
    const major = req.query.major;
    const region = req.query.region;
    const year = req.query.year;
    const query_dict = {
        "name": name ?? "",
        "gpa": gpaL && gpaR ? [gpaL, gpaR] : "",
        "major": major ?? "",
        "region": region ?? "",
        "year": year ?? ""
    }
    try {
        let searchResult;
        db_query = `SELECT IIN
        FROM graduates
        INNER JOIN universities
        ON graduates.university_id = universities.id
                    WHERE `;
        let has_filters = false;
        for (const [key, value] of Object.entries(query_dict)) {
            if (value == "" && value.length == 0) {
                continue;
            }
            has_filters = true;
            console.log(value);
            switch (key) {
                case "name": {
                    db_query += `fullName LIKE $1.name AND `;
                    break;
                }
                case "gpa": {
                    db_query += `gpa > $1.gpa[0] AND gpa < $1.gpa[1] AND `;
                    break;
                }
                case "major": {
                    db_query += `major = $1.major AND `;
                    break;
                }
                case "region": {
                    db_query += `region = $1.region AND `;
                    break;
                }
                case "year": {
                    db_query += `year = $1.year AND `;
                    break;
                }

            }
        }

        if (!has_filters) {
            res.status(403).send('Bad Request');
            return;
        }
        db_query = db_query.substring(0, db_query.length - 4)
        searchResult = await db.query(
            db_query,
            [`%${query_dict}%`]
        );
        res.send(searchResult.rows);

    } catch (error) {
        console.error('Error searching graduates:', error);
        res.status(500).send('Error searching graduates.');
    }
});


// Endpoint to generate and send OTP
app.post('/get-otp', async (req, res) => {
    const {email} = req.body;

    try {
        const otp = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const url = 'https://api.elasticemail.com/v2/email/send';
        const apiKey = '269E440A75CE8313CAC9E266D2CA62DFE024880F89428750C42FA3D1062DD89CE2D7DD1648897EC9E41DFE9AB3F8D0F0';

        var formData = new URLSearchParams();
        formData.append("apikey", apiKey);
        formData.append("subject", 'Pin code to log in: ' + otp);
        formData.append("from", 'info@jasaim.kz');
        formData.append("bodyText", 'Use it to authenticate on E-Diplomas');
        formData.append("to", email);

        const response = await axios.post(url, formData);
        if (response.data.success == false) {
            res.status(500).json({error: 'Failed to send OTP.'});
        }
        console.log(response.data);

        // Store the OTP in the database (you can modify this code according to your database structure)
        await db.query('INSERT INTO otp_table (email, otp) VALUES ($1, $2)', [email, otp]);

        res.json({message: 'OTP sent successfully ' + response.data});
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({error: 'Failed to send OTP.' + " Error:" + error});
    }
});

// Endpoint to verify OTP
app.post('/verify-otp', async (req, res) => {
    const {email, code} = req.body;

    try {
        // Retrieve the last OTP for the provided email from the otp_table
        const otpResult = await db.query(
            'SELECT otp FROM otp_table WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
            [email]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({error: 'OTP not found'});
        }

        const lastOTP = otpResult.rows[0].otp;

        if (code === lastOTP) {
            // OTP is valid
            db.query(`UPDATE users
                      set email_validated = true
                      where email = $1`, [email])
            return res.json(true);
        } else {
            // OTP is invalid
            return res.status(400).json(false);
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({error: 'Error verifying OTP:' + error});
    }
});
