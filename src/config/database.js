const dotenv = require('dotenv')
dotenv.config();
const fs = require('fs');
const {Client} = require('pg');


const caCert = fs.readFileSync('ca-certificate.crt');

const db = new Client({
    host: 'localhost', 
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: "rootUser", 
    ssl: {
        ca: caCert,
    },
});

module.exports = db;