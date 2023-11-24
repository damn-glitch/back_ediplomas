const dotenv = require('dotenv')
dotenv.config();
const {Client} = require('pg');

const db = new Client({
    host: '109.248.170.239',
    database: 'postgres',
    port: 5432,
    user: 'postgres',
    password: "7Vow1e2v0v7x",

});

module.exports = db;