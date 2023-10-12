const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const {isRestrictedDomain} = require('../middleware/authenticate');
const router = require('./router');
const {body, validationResult} = require("express-validator");
const prefix = "smart-contract"
const web3 = require('web3');
const {contractAbi} = require("../const/api");

// router.post('/createNewDiplomaContract', async (req, res) => {
//     const {email, password} = req.body;
//
//
//     // Initialize Ethereum provider (MetaMask)
//     // const web3 = Web3();
//
//     // FactoryInvest contract address and ABI
//     const factoryContractAddress = '0xbac7239D8C4313a00AE1BCdE567c1D78bfaC84D7';
//     // Replace with your factory contract ABI
//     // Create a contract instance
//     const factoryContract = new web3.eth.Contract(contractAbi, factoryContractAddress);
//
//     // Function to create a new Diplomas contract
//     // const createNewDiploma = async (
//     const name = "KBTU";
//     const symbol = "KB23";
//     const diplomaBaseURI = "ipfs://bafybeicifpkgrawcktvbxgewklhrhtw6qeqhicob2gtvg2dlyrg66qruha/";
//     const adminDiploma = "0x984653E3757498e38eE10676e272366D7d45Fe71";
//     const CID = "bafybeicifpkgrawcktvbxgewklhrhtw6qeqhicob2gtvg2dlyrg66qruha";
//     // ) => {
//     try {
//         const accounts = await window.ethereum.enable();
//         const senderAddress = accounts[0];
//
//         // Call the createNewDiploma function in FactoryInvest contract
//         const transaction = await factoryContract.methods.createNewDiploma(name, symbol, diplomaBaseURI, adminDiploma, CID).send({
//             from: senderAddress,
//         });
//
//         console.log('New Diplomas contract created:', transaction.events.newDiplomas.returnValues.addressDiplom);
//     } catch (error) {
//         console.error('Error creating new Diplomas contract:', error);
//     }
//     // };
// });
router.post(`/${prefix}/generate`, async (req, res) => {
    const { name, symbol, CID } = req.body;
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

        const receipt = await transaction.wait();

        // Extract the contract address from the receipt
        const contractAddress = receipt.events[0].address; // Adjust the index based on your event structure

        console.log('New Diplomas contract created successfully. Contract Address:', contractAddress);
        return res.json(`https://testnet.bscscan.com/address/${contractAddress}`);
    } catch (error) {
        return res(error, 500);
        console.error('Error creating new Diplomas contract:', error);
    }

    // Call the function to create a new Diplomas contract with your CID
});






