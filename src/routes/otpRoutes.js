// routes/otp.js

const express = require('express');
const axios = require('axios');
const db = require('../config/database'); // Adjust the path as needed

const router = express.Router();

router.post('/get-otp', async (req, res) => {
    const { email } = req.body;

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

module.exports = router;
