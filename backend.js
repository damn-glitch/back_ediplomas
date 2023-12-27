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

const {contractAbi} = require("./src/const/api");
const temp = async () => {
    const name = '123', symbol = 'test', CID = 'bafybeibqbxka4jodsebysuiqdnhqowkzc7siy3jsbrjby4t5dur26xnnea', university_id = 1;
    console.log(name, symbol, CID, new Date());

    const ethers = require('ethers');

    // Ethereum provider URL for Binance Smart Chain
    const providerUrl = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);

    // FactoryInvest contract address and ABI
    const factoryContractAddress = '0xbac7239D8C4313a00AE1BCdE567c1D78bfaC84D7';
    const factoryContractABI = contractAbi; // Replace with your factory contract ABI

    // Private key of the account that will initiate the contract creation
    const privateKey = 'db13127e67c2ae2bab95a04f441bdfba70037151f357704c205896eb30ea1070';

    // Function to create a new Diplomas contract
    let diplomaBaseURI = `ipfs://${CID}/`;
    const adminWallet = "0x984653E3757498e38eE10676e272366D7d45Fe71";
    try {
        const wallet = new ethers.Wallet(privateKey, provider);

        const factoryContract = new ethers.Contract(factoryContractAddress, factoryContractABI, wallet);

        const transaction = await factoryContract.createNewDiploma(name, symbol, diplomaBaseURI, adminWallet);

        console.log(123)
        const receipt = await transaction.wait();
        console.log(receipt)
        // Extract the contract address from the receipt
        const contractAddress = receipt.events // Adjust the index based on your event structure

        console.log('New Diplomas contract created successfully. Contract Address:', contractAddress);
    } catch (error) {
        console.error('Error creating new Diplomas contract:', error);
    }

};


(async () => {
  try {
    // Call your async function here
    await temp();

    // The rest of your startup code can go here
    console.log('Server started successfully');
  } catch (error) {
    console.error('Error during startup:', error);
    process.exit(1); // Exit the process with an error code
  }
})();