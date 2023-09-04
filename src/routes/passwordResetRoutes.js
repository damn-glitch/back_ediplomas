const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../config/database'); 
const { isRestrictedDomain } = require('../middleware/authenticate');


const router = express.Router();

router.post
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
            res.send("success")
        } catch (error) {
            console.error('Error reseting password:', error);
            res.status(500).send('Error reseting password.');
        }

    }
module.exports = router;
