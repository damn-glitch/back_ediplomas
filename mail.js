const axios = require('axios');
const express = require('express');
const app = express();

app.get('/validate-otp', (req, res) => {
  const otp = req.query.otp;

  let data;

  if (!otp) {
    try {
      const otp = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      const url = 'https://api.elasticemail.com/v2/email/send';
      const apiKey = '269E440A75CE8313CAC9E266D2CA62DFE024880F89428750C42FA3D1062DD89CE2D7DD1648897EC9E41DFE9AB3F8D0F0';

      const queryParams = {
        apikey: apiKey,
        subject: 'Pin code to log in: ' + otp,
        from: 'info@jasaim.kz',
        bodyText: 'Use it ot authenticate on Unipass',
        to: 'nurikwy@gmail.com'
      };

      axios.get(url, { params: queryParams })
        .then(response => {
          data = response.json;
        })
        .catch(error => {
        });
    } catch (error) {
      return res.json(error.message);
    }
    return data;
  }
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
