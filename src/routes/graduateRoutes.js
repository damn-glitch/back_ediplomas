const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const db = require('../config/database');
const router = express.Router();

const validateName = (req, res, next) => {
  const name = req.query.name;
  if (!name) {
    return res.status(400).send('Field "name" is required.');
  }
  next();
};

const prepareGraduateDetails = (user) => {
  const data = [];
  const { gpa, iin, region, mobile, email } = user;

  if (gpa !== 0) {
    data.push({ value: gpa, label_en: 'GPA', label_ru: 'GPA' });
  }
  if (iin.length > 10) {
    data.push({ value: iin, label_en: 'IIN', label_ru: 'ИИН' });
  }
  if (region.length > 3) {
    data.push({ value: region, label_en: 'Region', label_ru: 'Регион' });
  }
  if (mobile.length > 3) {
    data.push({ value: '+' + mobile, label_en: 'Mobile', label_ru: 'Мобильный' });
  }
  if (email.length > 3) {
    data.push({ value: email, label_en: 'Email', label_ru: 'Почта' });
  }

  return data;
};

router.get('/graduate-details', authenticate, validateName, async (req, res) => {
  try {
    const name = req.query.name;
    const user = await db.query('SELECT * FROM graduates WHERE fullNameEng = $1', [name]);

    if (user.rows.length > 0) {
      const data = prepareGraduateDetails(user.rows[0]);
      res.json(data);
    } else {
      res.status(404).send('Graduate not found.');
    }
  } catch (error) {
    console.error('Error fetching graduates details:', error);
    res.status(500).send('Error fetching graduates details.');
  }
});

router.get('/graduates', authenticate, async (req, res) => {
  try {
    const graduates = await db.query('SELECT * FROM graduates');
    res.send(graduates.rows);
  } catch (error) {
    console.error('Error fetching graduates:', error);
    res.status(500).send('Error fetching graduates.');
  }
});

module.exports = router;
