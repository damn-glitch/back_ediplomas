const router = require('express').Router();

module.exports.send = (db) => router.post('/get-otp', async (req, res) => {
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

module.exports.verify = (db) => router.post('/', async (req, res) => {
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