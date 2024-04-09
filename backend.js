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
const createUsers = require('./src/routes/createUsers');
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
        const response = await axios.get('https://agile-search.onrender.com/reset', {withCredentials: true});
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
// const {contractAbi} = require("./src/const/api");
// const { ethers } = require('ethers');
//
// const providerUrl = 'https://warmhearted-small-firefly.bsc-testnet.quiknode.pro/5c446e722477d15baab0625234961809b8976385/'; // BSC Testnet
// const privateKey = '9f9e3b9d1cfaa39d45c23c50bf8a67327f7671da9e7fcbedb2a9acea32f765d4'; // Replace with your actual private key
// const factoryContractAddress = '0x2f9914aAE53086204e565ecEbb51dA60D17460d3';
// const factoryContractABI = contractAbi; // Replace with your factory contract ABI
//
// async function createDiploma(name, symbol, CID, adminWallet) {
//   try {
//     const provider = new ethers.providers.JsonRpcProvider(providerUrl);
//     const wallet = new ethers.Wallet(privateKey, provider);
//     const factoryContract = new ethers.Contract(factoryContractAddress, factoryContractABI, wallet);
//
//     const diplomaBaseURI = `ipfs://${CID}/`;
//
//     const gasLimit = 5000000; // Adjust gas limit as needed
//     const gasPrice = new ethers.utils.parseUnits('5', 'gwei'); // Example gas price: 5 Gwei
//
//     const transaction = await factoryContract.createNewDiploma(name, symbol, diplomaBaseURI, adminWallet
//             , {
//                 gasLimit: gasLimit, gasPrice: gasPrice
//             }
//         );
//
//     console.log('Transaction hash:', transaction);
//
//     const receipt = await transaction.wait();
//     console.log('Diploma contract created at:', receipt.events[0].address); // Adjust index based on event structure
//
//   } catch (error) {
//     console.error('Error creating diploma:', error);
//   }
// }
//
// // Call the function with your data
// // Example usage
// const name = 'My Diploma';
// const symbol = 'DIPLOMA';
// const diplomaBaseURI = 'https://example.com/diplomas/';
// const adminWallet = '0x740FC3b6517673FA5C999BC45Ed4D02f397C19b1';
//
// createDiploma(name, symbol, diplomaBaseURI, adminWallet);
//
// // async function start() {
// //     try {
// //         const name = '123';
// //         const symbol = '3213';
// //         const CID = '312313';
// //         const university_id = 3;
// //
// //         const providerUrl = 'https://warmhearted-small-firefly.bsc-testnet.quiknode.pro/5c446e722477d15baab0625234961809b8976385/';
// //         const provider = new ethers.providers.Web3Provider(providerUrl);
// //         await provider.send("eth_requestAccounts", []);
// //         console.log(provider);
// //         const factoryContractAddress = '0x2f9914aAE53086204e565ecEbb51dA60D17460d3';
// //         const factoryContractABI = contractAbi; // Replace with your factory contract ABI
// //
// //         const privateKey = '9f9e3b9d1cfaa39d45c23c50bf8a67327f7671da9e7fcbedb2a9acea32f765d4';
// //
// //         let diplomaBaseURI = `ipfs://${CID}/`;
// //         const adminWallet = "0x984653E3757498e38eE10676e272366D7d45Fe71";
// //
// //         // const wallet = new ethers.Wallet(privateKey, provider);
// //         //
// //         // const factoryContract = new ethers.Contract(factoryContractAddress, factoryContractABI, wallet);
// //         // const transaction = await factoryContract.createNewDiploma(name, symbol, diplomaBaseURI, adminWallet);
// //         //
// //         // const receipt = await transaction.wait();
// //         //
// //         // const contractAddress = receipt.events[0].address; // Adjust the index based on your event structure
// //         // console.log(contractAddress);
// //     } catch (error) {
// //         console.error('Error creating new Diplomas contract:', error);
// //     }
// // }
