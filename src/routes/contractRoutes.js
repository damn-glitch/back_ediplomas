const router = require('./router');
const prefix = "smart-contract"
const {contractAbi} = require("../const/api");
const db = require('../config/database');

router.post(`/${prefix}/generate`, async (req, res) => {
    const {name, symbol, CID, university_id} = req.body;

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

        const receipt = await transaction.wait();

        // Extract the contract address from the receipt
        const contractAddress = receipt.events[0].address; // Adjust the index based on your event structure
        await db.query(
            'UPDATE diplomas SET smart_contract_link = $1 WHERE university_id = $2',
            [university_id, `https://testnet.bscscan.com/address/${contractAddress}`]
        );
        console.log('New Diplomas contract created successfully. Contract Address:', contractAddress);
        return res.json(`https://testnet.bscscan.com/address/${contractAddress}`);
    } catch (error) {
        console.error('Error creating new Diplomas contract:', error);
        return res(error, 500);
    }

    // Call the function to create a new Diplomas contract with your CID
});






