const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { authenticate, isRestrictedDomain } = require('./src/middleware/authenticate');
const { body, validationResult } = require('express-validator');
const db = require('./src/config/database');

const app = express();

const createRolesTable = require('./src/tables/rolesTable');
const createUsersTable = require('./src/tables/usersTable');
const createUniversityTable = require('./src/tables/universityTable');
const createGraduatesTable = require('./src/tables/graduatesTable');
const createOTPTable = require('./src/tables/otpTable');


const {Pool} = require('pg');
const axios = require("axios");
const router = require('./src/routes/registration');

const authRoutes = require('./src/routes/authRoutes');
const dataRoutes = require('./src/routes/dataRoutes');
const graduateRoutes = require('./src/routes/graduateRoutes'); 
const accountRoutes = require('./src/routes/accountRoutes'); 
const searchRoutes = require('./src/routes/searchRoutes'); 
const validationRoutes = require('./src/routes/validationRoutes'); 


app.use(cors());
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
app.use(authenticate);
app.use('/', router);
app.use('/authRoutes', authRoutes);
app.use('/dataRoutes', dataRoutes);
app.use('/graduates', graduateRoutes); 
app.use('/account', accountRoutes); 
app.use('/search', searchRoutes);
app.use('/validate-iin', validationRoutes);

// Registration route
const startServer = async () => {
    try {
        await db.connect(); // Initialize the database connection
        console.log('Connected to the PostgreSQL database');

        await createRolesTable();
        await createUsersTable();
        await createUniversityTable();
        await createGraduatesTable();
        await createOTPTable();

        const port = 8080; // Start the server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
};

startServer();

const universityEmailLists = ['info@jasaim.kz', 'maxim.tsoy@nu.edu.kz', 'alisher.beisembekov@jasaim.kz', 'a.nurgalieva@kbtu.kz']

// Search graduates by metadata (authenticated)
app.get('/search', async (req, res) => {
    const name = req.query.name;
    const gpaL = req.query.gpaL;
    const gpaR = req.query.gpaR;
    const speciality = req.query.specialities;
    const region = req.query.region;
    const degree = req.query.degree;
    const year = req.query.year;

    const query_dict = {
        name: name ?? "",
        gpa: gpaL && gpaR ? [parseFloat(gpaL), parseFloat(gpaR)] : null,
        speciality: speciality ? speciality.split(',') : "",
        region: region ? region.split(',') : "",
        degree: degree ? degree.toLowerCase().split(',') : "",
        year: year ? year.split(',') : "",
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
                    if (Array.isArray(value)) {
                        db_query += `(${value.map((_, i) => `${key} LIKE $${parameterIndex++}`).join(" OR ")}) AND `;
                        queryValues.push(...value.map(v => `%${v}%`));
                    } else {
                        db_query += `${key} LIKE $${parameterIndex++} AND `;
                        queryValues.push(`%${value}%`);
                    }
                    console.log(queryValues);
                    break;
                case "region":
                    if (Array.isArray(value)) {
                        db_query += `(${value.map((_, i) => `${key} LIKE $${parameterIndex++}`).join(" OR ")}) AND `;
                        queryValues.push(...value.map(v => `%${v}%`));
                    } else {
                        db_query += `${key} LIKE $${parameterIndex++} AND `;
                        queryValues.push(`%${value}%`);
                    }
                    break;
                case "degree":
                    if (Array.isArray(value)) {
                        db_query += `(${value.map((_, i) => `major LIKE $${parameterIndex++}`).join(" OR ")}) AND `;
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
            .custom((value, {req}) => {
                if (value !== req.body.password) {
                    return false;
                }
                return true;
            })
            .withMessage('Passwords are not the same.'),
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

