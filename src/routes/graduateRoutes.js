const express = require('express');
const { authenticate } = require('../middleware/authenticate'); 
const db = require('../config/database'); 
const router = express.Router();

router.get('/graduate-details', authenticate, async (req, res) => {
    try {
        const name = req.query.name;
        if (!name) {
            return res.status(400).send('Field "name" is required.');
        }

        const user = await db.query('SELECT * FROM graduates WHERE fullNameEng = $1 ', [
            name,
        ]);

        if (user.rows.length > 0) {
            const data = [];
            if (user.rows[0].gpa !== 0) {
                data.push({ value: user.rows[0].gpa, label_en: 'GPA', label_ru: 'GPA' });
            }
            if (user.rows[0].iin.length > 10) {
                data.push({ value: user.rows[0].iin, label_en: 'IIN', label_ru: 'ИИН' });
            }
            if (user.rows[0].region.length > 3) {
                data.push({ value: user.rows[0].region, label_en: 'Region', label_ru: 'Регион' });
            }
            if (user.rows[0].mobile.length > 3) {
                data.push({ value: '+' + user.rows[0].mobile, label_en: 'Mobile', label_ru: 'Мобильный' });
            }
            if (user.rows[0].email.length > 3) {
                data.push({ value: user.rows[0].email, label_en: 'Email', label_ru: 'Почта' });
            }
            res.json(data);
        } else {
            res.status(404).send('Graduate not found.');
        }
    } catch (error) {
        console.error('Error fetching graduates details:', error);
        res.status(500).send('Error fetching graduates details.');
    }
});

// Graduates route (authenticated)
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

