const express = require('express');
const db = require('../config/database');

const router = express.Router();

router.get('/dont-touch-this', async (req, res) => {
    try {
        const file = require('../data_back.json'); 
        for (let i = 540; i < file.length; i++) {
            const data = file[i];

            const {
                Fullname_kz,
                Fullname_eng,
                Year,
                Degree,
                speciality,
                GPA,
                IIN,
                Region,
                Region2,
                mobile,
                email,
            } = data;

            const query = `
                INSERT INTO graduates 
                (fullNameEng, fullNameKz, major, speciality, IIN, university_id, gpa, year, region, mobile, email) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `;
            const values = [
                Fullname_eng.trim(),
                Fullname_kz.trim(),
                Degree.split(' степень ')[1].trim(),
                speciality.split('«')[1].split('»')[0].trim(),
                IIN.toString(),
                1,
                GPA ? parseFloat(GPA) : 0,
                Year && Year !== '-' ? parseInt(Year.split(', ')[1]) : 0,
                Region && Region.length > 3 ? Region : Region2 || '',
                mobile || '',
                email || '',
            ];

            await db.query(query, values);
            console.log(i + ': Data inserted successfully!');
        }

        res.status(200).send('Data insertion completed.');
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('Error inserting data.');
    }
});

module.exports = router;
