/**
 * Скрипт для конвертации приватного ключа из формата Solflare (массив байтов) в base58
 * 
 * Использование:
 * node convert-private-key.js
 * 
 * Или измените массив privateKeyArray ниже на ваш приватный ключ
 */

const bs58 = require('bs58');

// Ваш приватный ключ из Solflare (массив байтов)
const privateKeyArray = [];

try {
    // Конвертируем массив байтов в Buffer
    const privateKeyBuffer = Buffer.from(privateKeyArray);
    
    // Конвертируем в base58
    const privateKeyBase58 = bs58.encode(privateKeyBuffer);
    
    console.log('='.repeat(60));
    console.log('Приватный ключ в формате base58:');
    console.log('='.repeat(60));
    console.log(privateKeyBase58);
    console.log('='.repeat(60));
    console.log('\nДобавьте это значение в ваш .env файл:');
    console.log(`SOLANA_PRIVATE_KEY=${privateKeyBase58}`);
    console.log('\n⚠️  ВАЖНО: Никогда не делитесь этим ключом и не коммитьте его в репозиторий!');
    
} catch (error) {
    console.error('Ошибка при конвертации:', error.message);
    process.exit(1);
}
