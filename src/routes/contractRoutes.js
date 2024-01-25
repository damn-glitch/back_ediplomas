const router = require('./router');
const prefix = "smart-contract"
const {contractAbi} = require("../const/api");
const db = require('../config/database');

router.post(`/${prefix}/generate`, async (req, res) => {
    const {name, symbol, CID, university_id} = req.body;
    const ethers = require('ethers');

    // Ethereum provider URL for Binance Smart Chain
    const providerUrl = 'https://dimensional-dimensional-pond.bsc-testnet.quiknode.pro/fef4b7cdf6e13ad3fbc9511535148de95567039e/';
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);

    // FactoryInvest contract address and ABI
    const factoryContractAddress = '0xbac7239D8C4313a00AE1BCdE567c1D78bfaC84D7';
    const factoryContractABI = contractAbi; // Replace with your factory contract ABI

    // Private key of the account that will initiate the contract creation
    const privateKey = 'db13127e67c2ae2bab95a04f441bdfba70037151f357704c205896eb30ea1070';
    console.log(2);

    // Function to create a new Diplomas contract
    let diplomaBaseURI = `ipfs://${CID}/`;
    console.log(3);

    // let diplomaBaseURI = `ipfs://${CID}/`;
    // https://bafybeibmoteyrrcehcv24bh6hyufhrymydshct742hp3malh7nyb4fppom.ipfs.nftstorage.link/
    const adminWallet = "0x984653E3757498e38eE10676e272366D7d45Fe71";
    try {
        console.log(4);
        const wallet = new ethers.Wallet(privateKey, provider);

        console.log(4.1);
        const factoryContract = new ethers.Contract(factoryContractAddress, factoryContractABI, wallet);

        console.log(4.2);
        const transaction = await factoryContract.createNewDiploma(name, symbol, diplomaBaseURI, adminWallet);

        console.log(4.3);
        const receipt = await transaction.wait();

        console.log(4.4);
        // Extract the contract address from the receipt
        const contractAddress = receipt.events[0].address; // Adjust the index based on your event structure
        console.log(5);

        const halfHourAgo = new Date();
        halfHourAgo.setMinutes(halfHourAgo.getMinutes() - 5);

        await db.query(
            `UPDATE diplomas SET smart_contract_link = $1 WHERE university_id = $2 AND smart_contract_link is null`,
            [
                `https://testnet.bscscan.com/address/${contractAddress}`,
                university_id ?? 1,
            ]
        );
        console.log('New Diplomas contract created successfully. Contract Address:', contractAddress);
        console.log(6);
        return res.json(`https://testnet.bscscan.com/address/${contractAddress}`);
    } catch (error) {
        console.log(7);
        console.error('Error creating new Diplomas contract:', error);
        return res.status(500).json(error);
    }

    // Call the function to create a new Diplomas contract with your CID
});






