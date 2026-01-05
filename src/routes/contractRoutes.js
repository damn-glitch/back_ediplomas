const router = require('./router');
const prefix = "smart-contract"
const {contractAbi} = require("../const/api");
const db = require('../config/database');
const solanaUtils = require('../utils/solana');
const metaplexUtils = require('../utils/metaplex');
const {body, validationResult} = require("express-validator");

router.post(`/${prefix}/generate`, async (req, res) => {
    const {name, symbol, CID, university_id} = req.body;
    const ethers = require('ethers');

    // Ethereum provider URL for Binance Smart Chain
    const providerUrl = 'https://tiniest-delicate-morning.bsc-testnet.quiknode.pro/ffe706f4e1cfb71f67d309fde115912917d40dd1/'; // BSC Testnet
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
            [ university_id ?? 1,]
        );
        console.log('New Diplomas contract created successfully. Contract Address:', contractAddress);
        return res.json(`https://testnet.bscscan.com/address/${contractAddress}`);
    } catch (error) {
        console.error('Error creating new Diplomas contract:', error);
        return res.status(500).json("Error generating smart-contract");

    }

    // Call the function to create a new Diplomas contract with your CID
});

// Новый эндпоинт для создания NFT дипломов на Solana
router.post(
    `/${prefix}/generate-solana`,
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('symbol').notEmpty().withMessage('Symbol is required'),
        body('CID').notEmpty().withMessage('CID is required'),
        body('university_id').optional().isInt().withMessage('University ID must be an integer')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, symbol, CID, university_id } = req.body;

        try {
            // Получаем кошелек из конфигурации
            const wallet = solanaUtils.getWallet();

            // Проверяем баланс кошелька
            const hasBalance = await solanaUtils.hasEnoughBalance(wallet.publicKey, 0.1);
            if (!hasBalance) {
                return res.status(400).json({
                    error: 'Insufficient SOL balance. Please fund the wallet.',
                    balance: await solanaUtils.getBalance(wallet.publicKey)
                });
            }

            // Формируем IPFS URI
            const ipfsUri = metaplexUtils.getIpfsUri(CID);

            // Проверяем, существует ли коллекция для университета
            let collectionMint = null;
            let collectionMetadata = null;

            // Пытаемся найти существующую коллекцию в БД
            const existingCollection = await db.query(
                `SELECT solana_collection_address, solana_collection_metadata 
                 FROM universities 
                 WHERE id = $1 AND solana_collection_address IS NOT NULL`,
                [university_id ?? 1]
            );

            if (existingCollection.rows.length > 0 && existingCollection.rows[0].solana_collection_address) {
                // Используем существующую коллекцию
                collectionMint = new (require('@solana/web3.js').PublicKey)(existingCollection.rows[0].solana_collection_address);
                if (existingCollection.rows[0].solana_collection_metadata) {
                    collectionMetadata = new (require('@solana/web3.js').PublicKey)(existingCollection.rows[0].solana_collection_metadata);
                }
            } else {
                // Создаем новую коллекцию для университета
                const collectionName = `${name} Diplomas`;
                const collectionSymbol = symbol.substring(0, 10); // Solana ограничивает длину символа

                const collectionResult = await metaplexUtils.createCollection(
                    collectionName,
                    collectionSymbol,
                    ipfsUri,
                    wallet
                );

                collectionMint = collectionResult.collectionMint;
                collectionMetadata = collectionResult.collectionMetadata;

                // Сохраняем информацию о коллекции в БД
                await db.query(
                    `UPDATE universities 
                     SET solana_collection_address = $1, 
                         solana_collection_metadata = $2
                     WHERE id = $3`,
                    [
                        collectionMint.toString(),
                        collectionMetadata.toString(),
                        university_id ?? 1
                    ]
                );
            }

            // Получаем все дипломы университета, которые еще не выгружены в Solana
            const diplomas = await db.query(
                `SELECT id, name_en, name_ru, name_kz, diploma_smart_contract_cid
                 FROM diplomas
                 WHERE university_id = $1 
                   AND solana_mint_address IS NULL
                   AND visibility = true`,
                [university_id ?? 1]
            );

            if (diplomas.rows.length === 0) {
                return res.status(404).json({
                    error: 'No diplomas found to upload to Solana',
                    message: 'All diplomas for this university are already uploaded or not visible'
                });
            }

            const results = [];
            const errors = [];

            // Создаем NFT для каждого диплома
            for (const diploma of diplomas.rows) {
                try {
                    const diplomaName = diploma.name_en || diploma.name_ru || diploma.name_kz || `Diploma #${diploma.id}`;
                    const diplomaSymbol = symbol.substring(0, 10);
                    const diplomaUri = diploma.diploma_smart_contract_cid 
                        ? metaplexUtils.getIpfsUri(diploma.diploma_smart_contract_cid)
                        : ipfsUri;

                    // Создаем NFT для диплома
                    const nftResult = await metaplexUtils.createDiplomaNFT({
                        name: `${diplomaName} - ${name}`,
                        symbol: diplomaSymbol,
                        uri: diplomaUri,
                        collectionMint: collectionMint,
                        collectionMetadata: collectionMetadata,
                        payer: wallet,
                        owner: wallet.publicKey // Можно изменить на адрес владельца диплома
                    });

                    // Сохраняем информацию о NFT в БД
                    await db.query(
                        `UPDATE diplomas
                         SET solana_mint_address = $1,
                             solana_collection_address = $2,
                             solana_signature = $3,
                             solana_explorer_url = $4,
                             blockchain_type = 'solana'
                         WHERE id = $5`,
                        [
                            nftResult.mint.toString(),
                            collectionMint.toString(),
                            nftResult.signature,
                            solanaUtils.getExplorerUrl(nftResult.signature),
                            diploma.id
                        ]
                    );

                    results.push({
                        diploma_id: diploma.id,
                        mint_address: nftResult.mint.toString(),
                        signature: nftResult.signature,
                        explorer_url: solanaUtils.getExplorerUrl(nftResult.signature)
                    });
                } catch (error) {
                    console.error(`Error creating NFT for diploma ${diploma.id}:`, error);
                    errors.push({
                        diploma_id: diploma.id,
                        error: error.message
                    });
                }
            }

            // Обновляем статус генерации дипломов
            await db.query(
                `UPDATE diploma_generations
                 SET finished_at = now()
                 WHERE university_id = $1
                   AND finished_at is null`,
                [university_id ?? 1]
            );

            return res.json({
                success: true,
                collection_mint: collectionMint.toString(),
                collection_explorer_url: solanaUtils.getExplorerAddressUrl(collectionMint.toString()),
                nfts_created: results.length,
                nfts: results,
                errors: errors.length > 0 ? errors : undefined,
                message: `Successfully created ${results.length} NFT(s) on Solana ${require('../config/solana').network}`
            });

        } catch (error) {
            console.error('Error creating Solana NFTs:', error);
            return res.status(500).json({
                error: 'Error generating Solana NFTs',
                message: error.message,
                details: error.stack
            });
        }
    }
);

