const express = require('express');
// const bcrypt = require('bcryptjs');

const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

const createRolesTable = require('./src/tables/rolesTable');
const createUsersTable = require('./src/tables/usersTable');
const createUniversityTable = require('./src/tables/universityTable');
const createGraduatesTable = require('./src/tables/graduatesTable');
const createOTPTable = require('./src/tables/otpTable');


//const {Pool} = require('pg');
//const axios = require("axios");
const router = require('./src/routes/router');

const accountRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const smartContractRoutes = require('./src/routes/contractRoutes');
const graduateRoutes = require('./src/routes/graduateRoutes');
const otpRoutes = require('./src/routes/otpRoutes');
const validateIINRoutes = require('./src/routes/validateIINRoutes');
const diplomaRoutes = require('./src/routes/diplomaRoutes');
const db = require('./src/config/database');

app.use(cors());
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
app.use('/', router);

const fs = require('fs');
const {Client} = require('pg');

const caCert = fs.readFileSync('ca-certificate.crt');

const startServer = async () => {
    try {
        db.connect(); // Initialize the database connection
        console.log('Connected to the PostgreSQL database');

        await createRolesTable(db);
        await createUsersTable(db);
        await createUniversityTable(db);
        await createGraduatesTable(db);
        await createOTPTable(db);

        const port = 8080; // Start the server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
};

startServer();

router.get('/', async (req, res) => {
    res.json("Hi page");
})




