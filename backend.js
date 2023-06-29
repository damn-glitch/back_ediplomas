const express = require('express');
const bodyParser = require('body-parser');
const {Client} = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const {body, validationResult} = require('express-validator');

const app = express();

const fs = require('fs');
const { Pool } = require('pg');
const axios = require("axios");

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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
// Initialize the database
db.connect()
    .then(() => {
        console.log('Connected to the PostgreSQL database');

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
                               (2, 'administration')
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
            CREATE TABLE IF NOT EXISTS graduates
            (id SERIAL PRIMARY KEY, name TEXT, major TEXT, diploma_id INTEGER)
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
    'gmail.com',
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
                'INSERT INTO users (email, password, company_name, role_id) VALUES ($1, $2, $3, 1) RETURNING *',
                [email, hashedPassword, companyName]
            );

            // Create a new JWT token
            const token = jwt.sign({id: newUser.rows[0].id}, 'jwtPrivateKey');
            res.header('x-auth-token', token).send({
                id: newUser.rows[0].id,
                email,
                companyName,
            });
        } catch (error) {
            console.error('Error registering the user:', error);
            res.status(500).send('Error registering the user.');
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
app.get('/search/:metadata', authenticate, async (req, res) => {
    const {metadata} = req.params;

    try {
        const searchResult = await db.query(
            `SELECT *
             FROM graduates
             WHERE name LIKE $1
                OR major LIKE $1
                OR diploma_id::text LIKE $1`,
            [`%${metadata}%`]
        );

        res.send(searchResult.rows);
    } catch (error) {
        console.error('Error searching graduates:', error);
        res.status(500).send('Error searching graduates.');
    }
});


// Endpoint to generate and send OTP
app.post('/get-otp', async (req, res) => {
    const { email } = req.body;

    try {
      const otp = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      const url = 'https://api.elasticemail.com/v2/email/send';
      const apiKey = '269E440A75CE8313CAC9E266D2CA62DFE024880F89428750C42FA3D1062DD89CE2D7DD1648897EC9E41DFE9AB3F8D0F0';

      const data = {
        apikey: apiKey,
        subject: 'Pin code to log in: ' + otp,
        from: 'info@jasaim.kz',
        bodyText: 'Use it to authenticate on Unipass',
        to: 'nurikwy@gmail.com'
      };

      const response = await axios.post(url, data);
      console.log(response.data);

      // Store the OTP in the database (you can modify this code according to your database structure)
      await db.query('INSERT INTO otp_table (email, otp) VALUES ($1, $2)', [email, otp]);

      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ error: 'Failed to send OTP.' + " Error:" + error });
    }
  });

  // Endpoint to verify OTP
  app.post('/verify-otp', async (req, res) => {
    const { email, code } = req.body;

    try {
      // Retrieve the last OTP for the provided email from the otp_table
      const otpResult = await db.query(
        'SELECT otp FROM otp_table WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
        [email]
      );

      if (otpResult.rows.length === 0) {
        return res.status(400).json({ error: 'OTP not found' });
      }

      const lastOTP = otpResult.rows[0].otp;

      if (code === lastOTP) {
        // OTP is valid
        return res.json({ message: 'OTP verified successfully' });
      } else {
        // OTP is invalid
        return res.status(400).json({ error: 'Invalid OTP' });
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  });
