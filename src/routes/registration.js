// Registration route
const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const db = require('../config/database'); // Import your database connection module
const { isRestrictedDomain } = require('../middleware/authenticate'); // Import the restricted domain check function

const router = express.Router();

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

            return res.json({message: 'OTP sent successfully ' + response.data});
        } catch (error) {
            console.error('Error sending OTP:', error);
            res.status(500).json({error: 'Failed to send OTP.' + " Error:" + error});
        }
    }
);

module.exports = router;
