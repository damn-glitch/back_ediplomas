const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Login route
module.exports = (db) => router.post('/', async (req, res) => {
    const {email, password} = req.body;

    try {
        // Check if the user exists
        const user = await db.query('SELECT * FROM users inner join roles on users.role_id = roles.id WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            return res.status(400).send('Invalid email or password.');
        }
        // Verify the password
        const emailValidated = user.rows[0].email_validated
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(400).send('Invalid email or password.');
        }
        if (!user.rows[0].email_validated) {
            return res.status(400).send('Email has not been verified');
        }

        // Create a new JWT token
        const token = jwt.sign({
            id: user.rows[0].id,
            role: user.rows[0].name // Include the user's role in the token payload
        }, 'jwtPrivateKey');
        res.header('x-auth-token', token).send({
            id: user.rows[0].id,
            email: user.rows[0].email,
            companyName: user.rows[0].company_name,
            role: user.rows[0].name,
            token: token
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Error logging in.');
    }
});