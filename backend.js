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
        // db.query(`drop table if exists graduates`);
        // db.query(`drop table if exists universities`);
        // db.query(`drop table otp_table`)

        // Initialize the database
        db.query(`
            CREATE TABLE IF NOT EXISTS roles
            (
                id
                SERIAL
                PRIMARY
                KEY,
                name
                TEXT
            );
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
                id
                SERIAL
                PRIMARY
                KEY,
                name
                TEXT,
                city
                TEXT
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
                id
                SERIAL
                PRIMARY
                KEY,
                fullNameEng
                TEXT,
                fullNameKz
                TEXT,
                major
                TEXT,
                speciality
                TEXT,
                IIN
                TEXT,
                university_id
                INT,
                gpa
                FLOAT,
                year
                INT,
                region
                TEXT,
                constraint
                fk_university_id
                foreign
                key
            (
                university_id
            )
                references universities
            (
                id
            )
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
                id
                SERIAL
                PRIMARY
                KEY,
                email
                TEXT,
                otp
                TEXT,
                created_at
                TIMESTAMPTZ
                DEFAULT
                CURRENT_TIMESTAMP
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
        body('repassword')
            .notEmpty()
            .withMessage('Passwords are not the same.')
            .custom((value, {req}) => {
                if (value !== req.body.password) {
                    return false;
                }
                return true;
            }),
        body('companyName').notEmpty().withMessage('Company name is required.'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
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
                'INSERT INTO users (email, password, company_name, role_id, email_validated) VALUES ($1, $2, $3, 1, false) RETURNING *',
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
            formData.append("subject", 'Validation pin code: ' + otp);
            formData.append("from", 'info@jasaim.kz');
            formData.append("bodyHtml", 'Use it to authenticate on E-Diplomas');
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
        const emailValidated = user.rows[0].email_validated
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(400).send('Invalid email or password.');
        }
        if (!user.rows[0].email_validated) {
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
app.get('/dont-touch-this', async (req, res) => {
    // db.query(`drop table if exists temp_table`)
    const file = require('./data_back.json');
    for (let i = 0; i < file.length; i++) {
        let fullname_kz = (file[i]["Fullname_kz"]).trim();
        let Fullname_en = (file[i]["Fullname_eng"]).trim();
        let year = (file[i]["Year"].split(", ")[1]).trim();
        if (!year || year == "" || year == "-") {
            year = 0;
        } else {
            year = parseInt(year);
        }
        let degree = (file[i]["Degree"].split(" степень ")[1]).trim();
        let speciality = (file[i]["speciality"].split("«")[1].split("»")[0]).trim();
        let gpa = (file[i]["GPA"] ?? "");
        if (!gpa || gpa == "" || gpa == "-") {
            gpa = 0;
        } else {
            gpa = parseFloat(gpa);
        }

        let iin = (file[i]["IIN"] ?? "").toString();
        let region = ((file[i]["Region"] && file[i]["Region"].length > 3) ? file[i]["Region"] && file[i]["Region"] : file[i]["Region2"]) ?? "";

        const query =
            `INSERT INTO graduates 
            (fullNameEng, fullNameKz, major, speciality, IIN, university_id, gpa, year, region) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        const values = [
            Fullname_en,
            fullname_kz,
            degree,
            speciality,
            iin,
            1,
            gpa,
            year,
            region
        ];
        db.query(query, values, (err, result) => {
            if (err) {

                console.log(fullname_kz);
                console.log(Fullname_en);
                console.log(year);
                console.log(degree);
                console.log(speciality);
                console.log(gpa);
                console.log(iin);
                console.log(region);
                console.log("--------------------------------")
                console.error('Error inserting data:', err);
                return;
            }
            console.log(i + ': Data inserted successfully!');
        });

    }
});

// Account route (authenticated)
app.get('/graduate-details', authenticate, async (req, res) => {
    try {
        const name = req.query.name;
        if (!name) {
            res.status(400).send('Field "name" is reqiured.')
            return;
        }
        const user = await db.query('SELECT iin, gpa, region FROM graduates WHERE fullNameEng = $1 ', [
            name,
        ]);

        if (user.rows.length > 0) {
            let data = [];
            if (user.rows[0]['gpa'] != 0) {
                data.push({"value": user.rows[0]['gpa'], "label_en": "GPA", "label_ru": "GPA"});
            }
            if (user.rows[0]['iin'].length > 10) {
                data.push({"value": user.rows[0]['iin'], "label_en": "IIN", "label_ru": "ИИН"});
            }
            if (user.rows[0]['region'].length > 3) {
                data.push({"value": user.rows[0]['region'], "label_en": "Region", "label_ru": "Регион"});
            }
            res.json(data);
        } else {
            res.status(404).send('Graduate not found.');
        }
    } catch (error) {
        console.error('Error fetching graduates details:', error);
        res.status(500).send('Error fetching graduates details.');
    }
})
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
app.get('/search', async (req, res) => {
    const name = req.query.name;
    const gpaL = req.query.gpaL;
    const gpaR = req.query.gpaR;
    const speciality = req.query.speciality;
    const region = req.query.region;
    const year = req.query.year;

    const query_dict = {
        name: name ?? "",
        gpa: gpaL && gpaR ? [parseFloat(gpaL), parseFloat(gpaR)] : null,
        speciality: speciality ? speciality.split(',') : "",
        region: region ? region.split(',') : "",
        year: year ? year.split(',') : ""
    };

    try {
        let searchResult;
        let db_query = `SELECT fullNameEng
                        FROM graduates
                                 INNER JOIN universities ON graduates.university_id = universities.id
                        WHERE `;
        const queryValues = [];

        let has_filters = false;
        let parameterIndex = 1;

        for (const [key, value] of Object.entries(query_dict)) {
            if (value === null || value === "") {
                continue;
            }
            has_filters = true;
            console.log(value);
            switch (key) {
                case "name":
                    db_query += `fullNameKz LIKE $${parameterIndex++} AND `;
                    queryValues.push(`%${value}%`);
                    break;
                case "gpa":
                    db_query += `gpa > $${parameterIndex++} AND gpa < $${parameterIndex++} AND `;
                    queryValues.push(value[0]);
                    queryValues.push(value[1]);
                    break;
                case "speciality":
                case "region":
                    if (Array.isArray(value)) {
                        db_query += `(${value.map((_, i) => `${key} LIKE $${parameterIndex++}`).join(" OR ")}) AND `;
                        queryValues.push(...value.map(v => `%${v}%`));
                    } else {
                        db_query += `${key} LIKE $${parameterIndex++} AND `;
                        queryValues.push(`%${value}%`);
                    }
                    break;
                case "year":
                    if (Array.isArray(value)) {
                        db_query += `(${value.map((_, i) => `${key} = $${parameterIndex++}`).join(" OR ")}) AND `;
                        queryValues.push(...value);
                    } else {
                        db_query += `${key} = $${parameterIndex++} AND `;
                        queryValues.push(value);
                    }
                    break;
            }
        }

        if (!has_filters) {
            res.status(403).send('Bad Request');
            return;
        }

        db_query = db_query.substring(0, db_query.length - 5);
        searchResult = await db.query(db_query, queryValues);
        res.send(searchResult.rows);
    } catch (error) {
        console.error('Error searching graduates:', error);
        res.status(500).send('Error searching graduates.');
    }
});


app.get('/validate-iin', async (req, res) => {
    let name = req.query.name;
    let iin = req.query.iin;

    try {
        let searchResult;
        let db_query = `SELECT fullNameEng
                        FROM graduates 
                        WHERE `;
        const queryValues = [];
        let has_filters = false;
        if (name && name.trim() != "" && iin && iin.trim() != "") {
            has_filters = true;
        }
        name = name.trim();
        iin = iin.toString().trim();
        db_query += `fullNameEng LIKE $1 AND `;
        queryValues.push(`%${name}%`);
        db_query += `iin = $2`;
        queryValues.push(iin);

        if (!has_filters) {
            return res.status(403).send('Bad Request');
        }
        searchResult = await db.query(db_query, queryValues);
        if (searchResult.rows.length == 0) {
            return res.json(false);
        }

        return res.json(true);

    } catch (error) {
        console.error('Error validating IIN:', error);
        res.status(500).send('Error validating IIN.');
    }
    return res.json(false);
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
        formData.append("subject", 'Validation pin code: ' + otp);
        formData.append("from", 'info@jasaim.kz');
        formData.append("bodyHtml", 'Use it to authenticate on E-Diplomas');
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


// Password Reset route
app.post(
    '/password-reset',
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
        body('repassword')
            .notEmpty()
            .withMessage('Passwords are not the same.')
            .custom((value, {req}) => {
                if (value !== req.body.password) {
                    return false;
                }
                return true;
            }),
        body('code')
            .notEmpty()
            .withMessage('Verification code must not be empty.')
    ],
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        const {email, password, code} = req.body;

        try {
            //validating otp code
            const otpResult = await db.query(
                'SELECT otp FROM otp_table WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
                [email]
            );

            if (otpResult.rows.length === 0) {
                return res.status(400).json({error: 'OTP not found'});
            }

            const lastOTP = otpResult.rows[0].otp;

            if (code !== lastOTP) {
                return res.status(400).json({error: "Invalid verification code"})
            }

            // Check if the user exists
            const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);

            if (existingUser.rows.length == 0) {
                return res.status(404).send('Email not found.');
            }


            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            //setting new password
            db.query('UPDATE users set password = $1 where id = $2', [hashedPassword, existingUser.rows[0]['id']]);
            res.send("success")
        } catch (error) {
            console.error('Error reseting password:', error);
            res.status(500).send('Error reseting password.');
        }

    });

