const dotenv = require('dotenv')
dotenv.config();
const fs = require('fs');
const {Client} = require('pg');


const caCert = fs.readFileSync('ca-certificate.crt');

const db = new Client({
    host: process.env.DB_HOST, //SECURED HOST IN .env
    port: 25060,
    database: 'db',
    user: 'db',
    password: process.env.DB_PASSWORD, //SECURED PASSWORD IN .env
    ssl: {
        ca: caCert,
    },
});

module.exports = db;