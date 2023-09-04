const dotenv = require('dotenv')
dotenv.config();
module.export = {
    otp : String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
    url : 'https://api.elasticemail.com/v2/email/send',
    apiKey : process.env.API_KEY,
};
