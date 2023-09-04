const dotenv = require('dotenv')
dotenv.config();
export const otp = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
export const url = 'https://api.elasticemail.com/v2/email/send';
export const apiKey = process.env.API_KEY;
