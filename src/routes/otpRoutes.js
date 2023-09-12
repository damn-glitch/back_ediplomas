// routes/otp.js
const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const db = require('../config/database');
const router = require('./router');
const { otp, url, apiKey } = require('../const/constants');

router.post('/get-otp', async (req, res) => {
    const { email } = req.body;

    try {
        var formData = new URLSearchParams();
        formData.append("apikey", apiKey);
        formData.append("subject", 'Validation pin code: ' + otp);
        formData.append("from", 'info@jasaim.kz');
        formData.append("bodyHtml", 'Use it to authenticate on E-Diplomas');
        formData.append("to", email);

        const response = await axios.post(url, formData);
        if (response.data.success == false) {
            res.status(500).json({ error: 'Failed to send OTP.' });
        }

        // Store the OTP in the database
        await db.query('INSERT INTO otp_table (email, otp) VALUES ($1, $2)', [email, otp]);

        res.json({ message: 'OTP sent successfully', data: response.data });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ error: 'Failed to send OTP.' });
    }
});

