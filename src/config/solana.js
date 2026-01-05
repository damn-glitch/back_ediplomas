const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    network: process.env.SOLANA_NETWORK || 'devnet', // 'devnet' | 'mainnet-beta'
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    privateKey: process.env.SOLANA_PRIVATE_KEY || '', // base58 encoded private key
    metaplexProgramId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    tokenMetadataProgramId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    explorerUrl: process.env.SOLANA_NETWORK === 'mainnet-beta' 
        ? 'https://solscan.io' 
        : 'https://solscan.io?cluster=devnet',
    commitment: 'confirmed' // 'processed' | 'confirmed' | 'finalized'
};
