const express = require('express');
// const bcrypt = require('bcryptjs');

const bodyParser = require('body-parser');
const cors = require('cors');
const {authenticate} = require('./src/middleware/authenticate');
const db = require('./src/config/database');

const app = express();

const createRolesTable = require('./src/tables/rolesTable');
const createUsersTable = require('./src/tables/usersTable');
const createUniversityTable = require('./src/tables/universityTable');
const createGraduatesTable = require('./src/tables/graduatesTable');
const createOTPTable = require('./src/tables/otpTable');


//const {Pool} = require('pg');
//const axios = require("axios");
const router = require('./src/routes/registrationRoutes');

const authRoutes = require('./src/routes/authRoutes');
const dataRoutes = require('./src/routes/dataRoutes');
const graduateRoutes = require('./src/routes/graduateRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const searchRoutes = require('./src/routes/searchRoutes');
const validateIINRoutes = require('./src/routes/validateIINRoutes');
const otpRoutes = require('./src/routes/verifyotpRoutes');
const verifyotpRoutes = require('./src/routes/verifyotpRoutes');
const passwordResetRoutes = require('./src/routes/passwordResetRoutes');

app.use(cors());
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
app.use(authenticate);
app.use('/', router);
app.use('/authRoutes', authRoutes);
app.use('/dataRoutes', dataRoutes);
app.use('/graduates', graduateRoutes);
app.use('/account', accountRoutes);
app.use('/search', searchRoutes);
app.use('/validate-iin', validateIINRoutes);
app.use('/otp', otpRoutes);
app.use('/verify-otp', verifyotpRoutes);
app.use('/password-reset', passwordResetRoutes);

const fs = require('fs');
const {Client} = require('pg');

const caCert = fs.readFileSync('ca-certificate.crt');

const startServer = async () => {
    try {
        const db = new Client({
            host: 'app-43e769b3-e8b1-4072-b097-9e5a2dea2499-do-user-14279801-0.b.db.ondigitalocean.com',
            port: 25060,
            database: 'db',
            user: 'db',
            password: 'AVNS_ggbxdEEyvuBkDaQeqFQ',
            ssl: {
                ca: caCert,
            },
        });
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






