const {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    TransactionInstruction
} = require('@solana/web3.js');
const {
    createCreateMetadataAccountV3Instruction,
    createCreateMetadataAccountInstruction,
    PROGRAM_ID
} = require('@metaplex-foundation/mpl-token-metadata');
const TOKEN_METADATA_PROGRAM_ID = PROGRAM_ID;
const {
    createInitializeMintInstruction,
    createMintToInstruction,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    getMinimumBalanceForRentExemptMint,
    createAssociatedTokenAccount
} = require('@solana/spl-token');
const solanaUtils = require('./solana');
const solanaConfig = require('../config/solana');
const solanaConst = require('../const/solana');

/**
 * Создает NFT коллекцию для университета
 * @param {string} collectionName - Название коллекции
 * @param {string} collectionSymbol - Символ коллекции
 * @param {string} collectionUri - URI метаданных коллекции (IPFS)
 * @param {Keypair} payer - Кошелек, который платит за транзакцию
 * @returns {Promise<{collectionMint: PublicKey, collectionMetadata: PublicKey, signature: string}>}
 */
async function createCollection(collectionName, collectionSymbol, collectionUri, payer) {
    const connection = solanaUtils.getConnection();
    
    // Создаем новый mint для коллекции
    const collectionMint = Keypair.generate();
    
    // Получаем адрес метаданных коллекции
    const [collectionMetadata] = await PublicKey.findProgramAddress(
        [
            Buffer.from('metadata'),
            new PublicKey(TOKEN_METADATA_PROGRAM_ID).toBuffer(),
            collectionMint.publicKey.toBuffer()
        ],
        new PublicKey(TOKEN_METADATA_PROGRAM_ID)
    );
    
    // Получаем адрес master edition
    const [collectionMasterEdition] = await PublicKey.findProgramAddress(
        [
            Buffer.from('metadata'),
            new PublicKey(TOKEN_METADATA_PROGRAM_ID).toBuffer(),
            collectionMint.publicKey.toBuffer(),
            Buffer.from('edition')
        ],
        new PublicKey(TOKEN_METADATA_PROGRAM_ID)
    );
    
    const transaction = new Transaction();
    
    // Получаем минимальный баланс для rent
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);
    
    // Инструкция создания mint аккаунта
    transaction.add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: collectionMint.publicKey,
            space: MINT_SIZE,
            lamports: mintRent,
            programId: TOKEN_PROGRAM_ID
        })
    );
    
    // Инициализация mint
    transaction.add(
        createInitializeMintInstruction(
            collectionMint.publicKey,
            0, // decimals для NFT всегда 0
            payer.publicKey,
            payer.publicKey
        )
    );
    
    // Создание метаданных коллекции
    transaction.add(
        createCreateMetadataAccountV3Instruction(
            {
                metadata: collectionMetadata,
                mint: collectionMint.publicKey,
                mintAuthority: payer.publicKey,
                payer: payer.publicKey,
                updateAuthority: payer.publicKey
            },
            {
                createMetadataAccountArgsV3: {
                    data: {
                        name: collectionName,
                        symbol: collectionSymbol,
                        uri: collectionUri,
                        sellerFeeBasisPoints: 0,
                        creators: null,
                        collection: null,
                        uses: null
                    },
                    isMutable: true
                }
            }
        )
    );
    
    // Подписываем транзакцию
    transaction.sign(collectionMint, payer);
    
    // Отправляем транзакцию
    const signature = await solanaUtils.sendTransaction(transaction, payer);
    
    return {
        collectionMint: collectionMint.publicKey,
        collectionMetadata: collectionMetadata,
        collectionMasterEdition: collectionMasterEdition,
        signature: signature
    };
}

/**
 * Создает NFT для диплома
 * @param {Object} params - Параметры NFT
 * @param {string} params.name - Название NFT
 * @param {string} params.symbol - Символ NFT
 * @param {string} params.uri - URI метаданных (IPFS CID)
 * @param {PublicKey} params.collectionMint - Адрес mint коллекции
 * @param {PublicKey} params.collectionMetadata - Адрес метаданных коллекции
 * @param {Keypair} params.payer - Кошелек, который платит за транзакцию
 * @param {PublicKey} params.owner - Владелец NFT (опционально, по умолчанию payer)
 * @returns {Promise<{mint: PublicKey, metadata: PublicKey, signature: string}>}
 */
async function createDiplomaNFT({ name, symbol, uri, collectionMint, collectionMetadata, payer, owner = null }) {
    const connection = solanaUtils.getConnection();
    const ownerPubkey = owner || payer.publicKey;
    
    // Создаем новый mint для NFT
    const nftMint = Keypair.generate();
    
    // Получаем адрес метаданных NFT
    const [nftMetadata] = await PublicKey.findProgramAddress(
        [
            Buffer.from('metadata'),
            new PublicKey(TOKEN_METADATA_PROGRAM_ID).toBuffer(),
            nftMint.publicKey.toBuffer()
        ],
        new PublicKey(TOKEN_METADATA_PROGRAM_ID)
    );
    
    // Получаем адрес master edition
    const [nftMasterEdition] = await PublicKey.findProgramAddress(
        [
            Buffer.from('metadata'),
            new PublicKey(TOKEN_METADATA_PROGRAM_ID).toBuffer(),
            nftMint.publicKey.toBuffer(),
            Buffer.from('edition')
        ],
        new PublicKey(TOKEN_METADATA_PROGRAM_ID)
    );
    
    // Получаем адрес associated token account
    const associatedTokenAccount = await getAssociatedTokenAddress(
        nftMint.publicKey,
        ownerPubkey
    );
    
    const transaction = new Transaction();
    
    // Получаем минимальный баланс для rent
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);
    
    // Инструкция создания mint аккаунта
    transaction.add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: nftMint.publicKey,
            space: MINT_SIZE,
            lamports: mintRent,
            programId: TOKEN_PROGRAM_ID
        })
    );
    
    // Инициализация mint
    transaction.add(
        createInitializeMintInstruction(
            nftMint.publicKey,
            0, // decimals для NFT всегда 0
            payer.publicKey,
            payer.publicKey
        )
    );
    
    // Проверяем, существует ли associated token account
    const accountInfo = await connection.getAccountInfo(associatedTokenAccount);
    if (!accountInfo) {
        // Создание associated token account (если не существует)
        transaction.add(
            createAssociatedTokenAccountInstruction(
                payer.publicKey,
                associatedTokenAccount,
                ownerPubkey,
                nftMint.publicKey
            )
        );
    }
    
    // Минт токена в associated token account
    transaction.add(
        createMintToInstruction(
            nftMint.publicKey,
            associatedTokenAccount,
            payer.publicKey,
            1 // Количество (для NFT всегда 1)
        )
    );
    
    // Создание метаданных NFT
    transaction.add(
        createCreateMetadataAccountV3Instruction(
            {
                metadata: nftMetadata,
                mint: nftMint.publicKey,
                mintAuthority: payer.publicKey,
                payer: payer.publicKey,
                updateAuthority: payer.publicKey
            },
            {
                createMetadataAccountArgsV3: {
                    data: {
                        name: name,
                        symbol: symbol,
                        uri: uri,
                        sellerFeeBasisPoints: 0,
                        creators: null,
                        collection: {
                            verified: false,
                            key: collectionMint
                        },
                        uses: null
                    },
                    isMutable: true
                }
            }
        )
    );
    
    // Подписываем транзакцию
    transaction.sign(nftMint, payer);
    
    // Отправляем транзакцию
    const signature = await solanaUtils.sendTransaction(transaction, payer);
    
    return {
        mint: nftMint.publicKey,
        metadata: nftMetadata,
        masterEdition: nftMasterEdition,
        associatedTokenAccount: associatedTokenAccount,
        signature: signature
    };
}

/**
 * Формирует IPFS URI из CID
 * @param {string} cid - IPFS Content Identifier
 * @returns {string} - Полный IPFS URI
 */
function getIpfsUri(cid) {
    const { ipfsUrl } = require('../const/constants');
    return `${ipfsUrl}/${cid}`;
}

module.exports = {
    createCollection,
    createDiplomaNFT,
    getIpfsUri
};
