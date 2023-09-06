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
const router = require('./src/routes/registrationRoutes');

const authRoutes = require('./src/routes/login');
const dataRoutes = require('./src/routes/dataRoutes');
const graduateRoutes = require('./src/routes/graduateRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const searchRoutes = require('./src/routes/searchRoutes');
const validateIINRoutes = require('./src/routes/validateIINRoutes');
const verifyotpRoutes = require('./src/routes/verifyotpRoutes');
const passwordResetRoutes = require('./src/routes/passwordResetRoutes');

app.use(cors());
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
app.use('/register', router);
app.use('/login', authRoutes);
app.use('/dataRoutes', dataRoutes);
app.use('/graduate-details', graduateRoutes);
app.use('/account', accountRoutes);
app.use('/search', searchRoutes);
app.use('/validate-iin', validateIINRoutes);
app.use('/verify-otp', verifyotpRoutes);
app.use('/password-reset', passwordResetRoutes);

const fs = require('fs');
const {Client} = require('pg');

const caCert = fs.readFileSync('ca-certificate.crt');

const startServer = async () => {
    try {
        const db = new Client({
            host: 'localhost', 
            port: 5432,
            database: 'postgres',
            user: 'postgres',
            password: "rootUser", 

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






