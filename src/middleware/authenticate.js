// Middleware for authentication
const jwt = require('jsonwebtoken');
require('dotenv').config();

const restrictedDomains = [
    'gmail.com',
    'mail.ru',
    'outlook.com',
    'yahoo.com',
    // Add more restricted domains here
];

function isRestrictedDomain(email) {
    const domain = email.split('@')[1];
    return restrictedDomains.includes(domain);
}

function authenticate(req, res, next) {
    const token = req.header('x-auth-token');
    console.log(token);
    if (!token) return res.status(400).send('Access denied. No token provided.');

    try {
        const jwtPrivateKey = "process.env.JWT_PRIVATE_KEY";
        if (!jwtPrivateKey){
            throw new Error('JWT private key is not set');
        }
        console.log(jwtPrivateKey)
        req.user = jwt.verify(token, jwtPrivateKey);
        next();
    } catch (error) {
        res.status(401).send('Invalid token.');
    }
}

module.exports = {
    isRestrictedDomain,
    authenticate
};
