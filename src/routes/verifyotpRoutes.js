// routes/verifyOtp.js
const express = require('express');
const db = require('../config/database'); 

const router = require('./router');


router.post('/verify-otp', async (req, res) => {
    const { email, code } = req.body;

    try {
        const otpResult = await db.query(
            'SELECT otp FROM otp_table WHERE email = $1 ORDER BY created_at DESC',
            [email]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: 'OTP not found' });
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
        res.status(500).json({ error: 'Error verifying OTP:' + error });
    }
    res.json(false)
});

