const dotenv = require('dotenv')
dotenv.config();
const fs = require('fs');
const {Client} = require('pg');


const caCert = fs.readFileSync('ca-certificate.crt');

const db = new Client({
    host: '109.248.170.239',
    database: 'postgres',
    port: 5432,
    user: 'postgres',
    password: "7Vow1e2v0v7x",

});

module.exports = db;