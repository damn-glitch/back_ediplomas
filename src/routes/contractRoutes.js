const router = require('./router');
const prefix = "smart-contract"
const {contractAbi} = require("../const/api");
const db = require('../config/database');

router.post(`/${prefix}/generate`, async (req, res) => {
    const {name, symbol, CID, university_id} = req.body;
    const ethers = require('ethers');

    // Ethereum provider URL for Binance Smart Chain
    const providerUrl = 'https://site1.moralis-nodes.com/bsc-testnet/09bec9b736e740058ae4f723026e3540/'; // BSC Testnet
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);

    // FactoryInvest contract address and ABI
    const factoryContractAddress = '0x2f9914aAE53086204e565ecEbb51dA60D17460d3';
    const factoryContractABI = contractAbi; // Replace with your factory contract ABI

    // Private key of the account that will initiate the contract creation
    const privateKey = '9f9e3b9d1cfaa39d45c23c50bf8a67327f7671da9e7fcbedb2a9acea32f765d4'; // Replace with your actual private key
    console.log(2);

    // Function to create a new Diplomas contract
    let diplomaBaseURI = `ipfs://${CID}/`;
    const adminWallet = "0x984653E3757498e38eE10676e272366D7d45Fe71";
    try {
        const wallet = new ethers.Wallet(privateKey, provider);

        const factoryContract = new ethers.Contract(factoryContractAddress, factoryContractABI, wallet);

        const gasLimit = 5000000; // Adjust gas limit as needed
        const gasPrice = new ethers.utils.parseUnits('5', 'gwei'); // Example gas price: 5 Gwei

        const transaction = await factoryContract.createNewDiploma(name, symbol, diplomaBaseURI, adminWallet
            , {
                gasLimit: gasLimit, gasPrice: gasPrice
            }
        );
        const receipt = await transaction.wait();
        // Extract the contract address from the receipt
        const contractAddress = receipt.events[0].address; // Adjust the index based on your event structure

        const halfHourAgo = new Date();
        halfHourAgo.setMinutes(halfHourAgo.getMinutes() - 5);

        await db.query(
            `UPDATE diplomas
             SET smart_contract_link = $1,
                 visibility          = true
             WHERE university_id = $2
               AND smart_contract_link is null`,
            [
                `https://testnet.bscscan.com/address/${contractAddress}`,
                university_id ?? 1,
            ]
        );
        await db.query(
            `UPDATE diploma_generations
             SET finished_at = now()
             WHERE university_id = $1
               AND finished_at is null`,
            [
                university_id ?? 1,
            ]
        );
        console.log('New Diplomas contract created successfully. Contract Address:', contractAddress);
        return res.json(`https://testnet.bscscan.com/address/${contractAddress}`);
    } catch (error) {
        console.error('Error creating new Diplomas contract:', error);
        return res.status(500).json("Error generating smart-contract");

    }

    // Call the function to create a new Diplomas contract with your CID
});

