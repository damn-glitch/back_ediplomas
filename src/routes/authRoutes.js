const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
const universityEmailLists = ['info@jasaim.kz', 'maxim.tsoy@nu.edu.kz', 'alisher.beisembekov@jasaim.kz', 'a.nurgalieva@kbtu.kz']

router.post('/login', authenticate, async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.query('SELECT * FROM users INNER JOIN roles ON users.role_id = roles.id WHERE email = $1', [email]);

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

        res.header('x-auth-token', token).send({
            id: user.rows[0].id,
            email: user.rows[0].email,
            companyName: user.rows[0].company_name,
            role: universityEmailLists.includes(email) ? 'university admission' : user.rows[0].name,
            token: token
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Error logging in.');
    }
});

module.exports = router;
