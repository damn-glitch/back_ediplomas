// routes/otp.js
const express = require('express');
const {authenticate} = require('../middleware/authenticate');
const db = require('../config/database');
const router = require('./router');
const {url, apiKey} = require('../const/constants');
const axios = require("axios");
const {body, validationResult} = require("express-validator");
const prefix = "otp"
//old /get-otp

router.post(
    `/${prefix}/send`,
    [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email address.')
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        const {email} = req.body;

        try {
            const otp = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
            var formData = new URLSearchParams();
            formData.append("apikey", apiKey);
            formData.append("subject", 'Validation pin code: ' + otp);
            formData.append("from", 'info@jasaim.kz');
            formData.append("bodyHtml", 'Use it to authenticate on E-Diplomas');
            formData.append("to", email);

            const response = await axios.post(url, formData);
            console.log(response.data);
            if (response.data.success === false) {
                return res.status(500).json({error: 'Failed to send OTP.'});
            }

            // Store the OTP in the database
            console.log(email, otp);
            let data = await db.query('INSERT INTO otp_table (email, otp) VALUES ($1, $2)', [email, otp]);
            console.log(data);

            return res.json({message: 'OTP sent successfully', data: response.data});
        } catch (error) {
            console.error('Error sending OTP:', error);
            return res.status(500).json({error: 'Failed to send OTP.'});
        }
    }
);
router.post(`/get-otp`, async (req, res) => {
    const {email} = req.body;
    try {
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

        // Store the OTP in the database
        console.log(email, otp);
        let data = await db.query('INSERT INTO otp_table (email, otp) VALUES ($1, $2)', [email, otp]);
        console.log(data);
        res.json({message: 'OTP sent successfully', data: response.data});
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({error: 'Failed to send OTP.'});
    }
});

// old /verify-otp
router.post(
    `/${prefix}/validate`,
    [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email address.'),
        body('code')
            .notEmpty()
            .withMessage('OTP code is required.')
            .isNumeric()
            .withMessage('OTP code must be a numeric value.')
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        const {email, code} = req.body;

        try {
            const otpResult = await db.query(
                'SELECT otp FROM otp_table WHERE email = $1 ORDER BY created_at DESC',
                [email]
            );

            if (otpResult.rows.length === 0) {
                return res.status(400).json({error: 'OTP not found'});
            }

            const lastOTP = otpResult.rows[0].otp;

            if (code === lastOTP) {
                await db.query(`UPDATE users
                                SET email_validated = true
                                WHERE email = $1`, [email]);
                return res.json("success");
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            return res.status(500).json({error: 'Error verifying OTP:' + error});
        }
        return res.status(400).json({error: 'Incorrect Code'});
    }
);
router.post('/verify-otp', async (req, res) => {
    const {email, code} = req.body;

    try {
        const otpResult = await db.query(
            'SELECT otp FROM otp_table WHERE email = $1 ORDER BY created_at DESC',
            [email]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({error: 'OTP not found'});
        }

        const lastOTP = otpResult.rows[0].otp;

        if (code === lastOTP) {
            await db.query(`UPDATE users
                            SET email_validated = true
                            WHERE email = $1`, [email]);
            return res.json(true);
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({error: 'Error verifying OTP:' + error});
    }
    res.json(false)
});

