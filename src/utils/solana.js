const { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const bs58 = require('bs58');
const solanaConfig = require('../config/solana');

/**
 * Создает подключение к Solana сети
 */
function getConnection() {
    return new Connection(solanaConfig.rpcUrl, solanaConfig.commitment);
}

/**
 * Создает кошелек из приватного ключа
 * @param {string} privateKeyBase58 - Приватный ключ в формате base58
 * @returns {Keypair}
 */
function getWalletFromPrivateKey(privateKeyBase58) {
    try {
        const privateKeyBytes = bs58.decode(privateKeyBase58);
        return Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
        throw new Error(`Failed to create wallet from private key: ${error.message}`);
    }
}

/**
 * Получает кошелек из конфигурации
 */
function getWallet() {
    if (!solanaConfig.privateKey) {
        throw new Error('SOLANA_PRIVATE_KEY is not set in environment variables');
    }
    return getWalletFromPrivateKey(solanaConfig.privateKey);
}

/**
 * Получает баланс кошелька
 * @param {PublicKey} publicKey - Публичный ключ кошелька
 * @returns {Promise<number>} - Баланс в SOL
 */
async function getBalance(publicKey) {
    const connection = getConnection();
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9; // Конвертация lamports в SOL
}

/**
 * Проверяет, достаточно ли SOL для транзакции
 * @param {PublicKey} publicKey - Публичный ключ кошелька
 * @param {number} minBalance - Минимальный баланс в SOL
 * @returns {Promise<boolean>}
 */
async function hasEnoughBalance(publicKey, minBalance = 0.01) {
    const balance = await getBalance(publicKey);
    return balance >= minBalance;
}

/**
 * Отправляет транзакцию и ждет подтверждения
 * @param {Transaction} transaction - Транзакция для отправки
 * @param {Keypair} signer - Подписант транзакции
 * @returns {Promise<string>} - Подпись транзакции
 */
async function sendTransaction(transaction, signer) {
    const connection = getConnection();
    
    // Получаем последний блокхэш
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = signer.publicKey;
    
    // Подписываем транзакцию
    transaction.sign(signer);
    
    // Отправляем транзакцию
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
    });
    
    // Ждем подтверждения
    await connection.confirmTransaction(signature, 'confirmed');
    
    return signature;
}

/**
 * Создает Program Derived Address (PDA)
 * @param {Buffer[]} seeds - Массив seed для генерации PDA
 * @param {PublicKey} programId - ID программы
 * @returns {Promise<[PublicKey, number]>} - [PDA address, bump]
 */
async function findProgramAddress(seeds, programId) {
    const connection = getConnection();
    const programIdPubkey = new PublicKey(programId);
    return await PublicKey.findProgramAddress(seeds, programIdPubkey);
}

/**
 * Получает explorer URL для транзакции
 * @param {string} signature - Подпись транзакции
 * @returns {string} - URL для просмотра транзакции
 */
function getExplorerUrl(signature) {
    const baseUrl = solanaConfig.explorerUrl;
    const cluster = solanaConfig.network === 'mainnet-beta' ? '' : '?cluster=devnet';
    return `${baseUrl}/tx/${signature}${cluster ? cluster : ''}`;
}

/**
 * Получает explorer URL для адреса
 * @param {string} address - Адрес для просмотра
 * @returns {string} - URL для просмотра адреса
 */
function getExplorerAddressUrl(address) {
    const baseUrl = solanaConfig.explorerUrl;
    const cluster = solanaConfig.network === 'mainnet-beta' ? '' : '?cluster=devnet';
    return `${baseUrl}/account/${address}${cluster ? cluster : ''}`;
}

module.exports = {
    getConnection,
    getWallet,
    getWalletFromPrivateKey,
    getBalance,
    hasEnoughBalance,
    sendTransaction,
    findProgramAddress,
    getExplorerUrl,
    getExplorerAddressUrl
};
