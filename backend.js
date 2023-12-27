const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
app.use(cors());

const createRolesTable = require('./src/tables/rolesTable');
const createUsersTable = require('./src/tables/usersTable');
const createUniversityTable = require('./src/tables/universityTable');
const createGraduatesTable = require('./src/tables/graduatesTable');
const createOTPTable = require('./src/tables/otpTable');

//const {Pool} = require('pg');
const axios = require("axios");
const router = require('./src/routes/router');

const accountRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const smartContractRoutes = require('./src/routes/contractRoutes');
const graduateRoutes = require('./src/routes/graduateRoutes');
const otpRoutes = require('./src/routes/otpRoutes');
const validateIINRoutes = require('./src/routes/validateIINRoutes');
const diplomaRoutes = require('./src/routes/diplomaRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const db = require('./src/config/database');


app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));


app.use('/', router);
const fs = require('fs');
const {Client} = require('pg');
const path = require('path');

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const startServer = async () => {
    try {
        await db.connect(); // Initialize the database connection
        // console.log('Connected to the PostgreSQL database');

        await createRolesTable(db);
        await createUsersTable(db);
        await createUniversityTable(db);
        await createGraduatesTable(db);
        await createOTPTable(db);

        const port = 8080; // Start the server
        const halfHourAgo = new Date(Date.now());
        // halfHourAgo.setMinutes(halfHourAgo.getMinutes() - 5);
        // Get the current date and time in UTC
        const currentDateUTC = new Date();

        // Create a formatter with the desired timezone ('Asia/Dhaka')
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Dhaka', // Set your desired timezone here, e.g., 'Asia/Dhaka' for GMT+6
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });

        // Format the date according to the specified timezone
        const formattedDate = formatter.format(currentDateUTC);

        console.log(formattedDate);

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`, formattedDate);
        });
    } catch (error) {
        console.error('Error:', error);
    }
};

const sendHttpRequest = async () => {
    try {
        const response = await axios.get('https://agile-job-desc-denerator.onrender.com/reset', {withCredentials: true});
        console.log('HTTP request successful:', response.data);
    } catch (error) {
        console.error('Error sending HTTP request:', error.message);
    }

    try {
        const response = await axios.get('https://agile-job-search.onrender.com/reset', {withCredentials: true});
        console.log('HTTP request successful:', response.data);
    } catch (error) {
        console.error('Error sending HTTP request:', error.message);
    }

    try {
        const response = await axios.get('https://agile-job-student.onrender.com/reset', {withCredentials: true});
        console.log('HTTP request successful:', response.data);
    } catch (error) {
        console.error('Error sending HTTP request:', error.message);
    }
};

const intervalInMilliseconds = 14 * 60 * 1000; // 14 minutes
setInterval(sendHttpRequest, intervalInMilliseconds);

startServer();

router.get('/', async (req, res) => {
    res.json("Hi page");
})




