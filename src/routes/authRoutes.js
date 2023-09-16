const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const {authenticate} = require('../middleware/authenticate');

const router = require('./router');
const {body} = require("express-validator");
const {stringify} = require("body-parser/lib/types/json");
const prefix = "auth"
const universityEmailLists = ['info@jasaim.kz', 'maxim.tsoy@nu.edu.kz', 'alisher.beisembekov@jasaim.kz', 'a.nurgalieva@kbtu.kz']
//old /login
router.post(`/${prefix}/login`, async (req, res) => {
    const {email, password} = req.body;

    try {
        const user = await db.query('SELECT *, users.id FROM users INNER JOIN roles ON users.role_id = roles.id WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            return res.status(400).send('Invalid email or password.');
        }

        const emailValidated = user.rows[0].email_validated;
        const validPassword = await bcrypt.compare(password, user.rows[0].password);

        if (!validPassword) {
            return res.status(401).send('Invalid email or password.');
        }

        if (!emailValidated) {
            return res.status(400).send('Email has not been verified');
        }

        const token = jwt.sign({
            id: user.rows[0].id,
            role: user.rows[0].name
        }, 'process.env.JWT_PRIVATE_KEY');

        return res.header('x-auth-token', token).send({
            id: user.rows[0].id,
            email: user.rows[0].email,
            companyName: user.rows[0].company_name,
            role: universityEmailLists.includes(email) ? 'university admission' : user.rows[0].name,
            token: token
        });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).send('Error logging in.');
    }
});
router.post('/login', async (req, res) => {
    const {email, password} = req.body;

    try {
        const user = await db.query('SELECT *, users.id FROM users INNER JOIN roles ON users.role_id = roles.id WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            return res.status(400).send('Invalid email or password.');
        }

        const emailValidated = user.rows[0].email_validated;
        const validPassword = await bcrypt.compare(password, user.rows[0].password);

        if (!validPassword) {
            return res.status(401).send('Invalid email or password.');
        }

        if (!emailValidated) {
            return res.status(400).send('Email has not been verified');
        }

        const token = jwt.sign({
            id: user.rows[0].id,
            role: user.rows[0].name
        }, 'process.env.JWT_PRIVATE_KEY');

        return res.header('x-auth-token', token).send({
            id: user.rows[0].id,
            email: user.rows[0].email,
            companyName: user.rows[0].company_name,
            role: universityEmailLists.includes(email) ? 'university admission' : user.rows[0].name,
            token: token
        });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).send('Error logging in.');
    }
});


// old /register
router.post(
    `/${prefix}/register`,
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
        body('companyName').notEmpty().withMessage('Company name is required.'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        const {email, password, companyName} = req.body;

        try {
            const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);

            if (existingUser.rows.length > 0) {
                return res.status(400).send('User already registered.');
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await db.query(
                'INSERT INTO users (email, password, company_name, role_id, email_validated) VALUES ($1, $2, $3, 1, false) RETURNING *',
                [email, hashedPassword, companyName]
            );

        } catch (error) {
            console.error('Error registering the user:', error);
            return res.status(500).send('Error registering the user.');
        }

        try {
            var formData = new URLSearchParams();
            formData.append("apikey", apiKey);
            formData.append("subject", 'Validation pin code: ' + otp);
            formData.append("from", 'info@jasaim.kz');
            formData.append("bodyHtml", 'Use it to authenticate on E-Diplomas');
            formData.append("to", email);

            const response = await axios.post(url, formData);
            if (response.data.success == false) {
                return res.status(500).json({error: 'Failed to send OTP.'});
            }
            console.log(response.data);

            await db.query('INSERT INTO otp_table (email, otp) VALUES ($1, $2)', [email, otp]);

            return res.json({message: 'OTP sent successfully ' + response.data});
        } catch (error) {
            console.error('Error sending OTP:', error);
            return status(500).json({error: 'Failed to send OTP.' + " Error:" + error});
        }
    }
);
router.post(
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
            .custom((value, {req}) => {
                if (value !== req.body.password) {
                    return false;
                }
                return true;
            })
            .withMessage('Passwords are not the same.'),
        body('companyName').notEmpty().withMessage('Company name is required.'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        const {email, password, companyName} = req.body;

        try {
            const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);

            if (existingUser.rows.length > 0) {
                return res.status(400).send('User already registered.');
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await db.query(
                'INSERT INTO users (email, password, company_name, role_id, email_validated) VALUES ($1, $2, $3, 1, false) RETURNING *',
                [email, hashedPassword, companyName]
            );

        } catch (error) {
            console.error('Error registering the user:', error);
            return res.status(500).send('Error registering the user.');
        }

        try {
            var formData = new URLSearchParams();
            formData.append("apikey", apiKey);
            formData.append("subject", 'Validation pin code: ' + otp);
            formData.append("from", 'info@jasaim.kz');
            formData.append("bodyHtml", 'Use it to authenticate on E-Diplomas');
            formData.append("to", email);

            const response = await axios.post(url, formData);
            if (response.data.success == false) {
                return res.status(500).json({error: 'Failed to send OTP.'});
            }
            console.log(response.data);

            await db.query('INSERT INTO otp_table (email, otp) VALUES ($1, $2)', [email, otp]);

            return res.json({message: 'OTP sent successfully ' + response.data});
        } catch (error) {
            console.error('Error sending OTP:', error);
            return res.status(500).json({error: 'Failed to send OTP.' + " Error:" + error});
        }
    }
);

router.post(
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
                return res.status(401).json({error: "Invalid verification code"})
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
            return res.send("success")
        } catch (error) {
            console.error('Error reseting password:', error);
            return res.status(500).send('Error reseting password.');
        }

    });

router.post(
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
                return res.status(401).json({error: "Invalid verification code"})
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
            return res.send("success")
        } catch (error) {

            console.error('Error reseting password:', error);
            return res.status(500).send('Error reseting password.');
        }

    });


router.post(`${prefix}/authorize-with-ds`, async (req, res) => {
    try {
        const data = req.body;
        const keyValuePairs = data.subjectDn.split(',');

        // Initialize an empty object to store the parsed data
        const parsedData = {};
        const dict = {
            "CN": "name",
            "SURNAME": "surname",
            "SERIALNUMBER": "iin",
            "G": "middlename",
        }
        // Iterate through the key-value pairs and split them into keys and values
        for (const pair of keyValuePairs) {
            let [key, value] = pair.split('=');
            if (value.split(' ').length > 1) {
                value = value.split(' ')[1]
            }
            if (key in dict) {
                parsedData[dict[key]] = value;
            }
        }
        const ds = JSON.stringify({
            "iin": parsedData['iin'],
            "date_from": parseInt(data.dateFrom),
            "date_to": parseInt(data.dateTo),
            "identifier": data.authorityKeyIdentifier
        });
        const now = new Date();
        const date_to = new Date(parseInt(data.dateFrom));
        const date_from = new Date(parseInt(data.dateTo));


        if (date_to.getTime() < now.getTime() || date_from.getTime() > now.getTime()) {
            return res.status(400).json({authorized: false, error: 'Digital signature is expired.'});
        }
        let user = await db.query(
            `SELECT *
             FROM users
                      INNER JOIN roles ON users.role_id = roles.id
                      inner join content_fields on content_fields.content_id = users.id
             where content_fields.type = 'digital_signature'
               and value = $1`, [ds]);
        if (!user.rows.length) {
            await db.query(
                `INSERT INTO users
                     (first_name, middle_name, last_name, role_id)
                 VALUES ($1, $2, $3, $4)
                `,
                [
                    parsedData.name,
                    parsedData.middlename ? parsedData.middlename : null,
                    parsedData.surname,
                    3
                ]);
            user = await db.query(
                `select *
                 from users
                 where first_name = $1
                   and last_name = $2`,
                [
                    parsedData.name,
                    parsedData.surname,
                ]
            )
            const id = user.rows[0].id;
            await db.query(
                `insert into content_fields
                     (content_id, type, value)
                 values ($1, $2, $3)`, [id, 'digital_signature', ds])
        }


        const token = jwt.sign({
            id: user.rows[0].id,
            role: user.rows[0].name
        }, 'process.env.JWT_PRIVATE_KEY');


        return res.header('x-auth-token', token).send({
            token: token
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({authorized: false, message: 'An error occurred.'});
    }
});

