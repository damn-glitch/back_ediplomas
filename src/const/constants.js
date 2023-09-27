const dotenv = require('dotenv')
dotenv.config();
module.exports = {
    url : 'https://api.elasticemail.com/v2/email/send',
    apiKey : process.env.API_KEY,
};
