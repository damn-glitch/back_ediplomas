const axios = require('axios');
const express = require('express');
const app = express();
const { url, apiKey } = require('../src/const/constants');

app.get('/validate-otp', (req, res) => {
  const otp = req.query.otp;

  if (!otp) {
    try {
      const generatedOtp = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      const queryParams = {
        apikey: apiKey,
        subject: 'Pin code to log in: ' + generatedOtp,
        from: 'info@jasaim.kz',
        bodyText: 'Use it to authenticate on Unipass',
        to: 'nurikwy@gmail.com'
      };

      axios.get(url, { params: queryParams })
        .then(() => {
          res.json({ message: 'OTP sent successfully', otp: generatedOtp });
        })
        .catch(error => {
          console.error(error);
          res.status(500).json({ message: 'Error sending OTP via email' });
        });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error generating OTP' });
    }
  } else {
    res.json({ message: 'OTP already provided', otp });
  }
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
