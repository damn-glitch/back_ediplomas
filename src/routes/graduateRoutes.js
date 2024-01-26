const express = require('express');
const {authenticate} = require('../middleware/authenticate');
const db = require('../config/database');
const router = require('./router');
const {body, validationResult} = require("express-validator");

const prefix = "graduates";
const validateName = (req, res, next) => {
    const name = req.query.name;
    if (!name) {
        return res.status(400).send('Field "name" is required.');
    }
    next();
};

const prepareGraduateDetails = (user) => {
    const data = [];
    const {gpa, iin, region, mobile, email} = user;

    if (gpa !== 0) {
        data.push({value: gpa, label_en: 'GPA', label_ru: 'GPA'});
    }
    if (iin.length > 10) {
        data.push({value: iin, label_en: 'IIN', label_ru: 'ИИН'});
    }
    if (region.length > 3) {
        data.push({value: region, label_en: 'Region', label_ru: 'Регион'});
    }
    if (mobile.length > 3) {
        data.push({value: '+' + mobile, label_en: 'Mobile', label_ru: 'Мобильный'});
    }
    if (email.length > 3) {
        data.push({value: email, label_en: 'Email', label_ru: 'Почта'});
    }

    return data;
};

//old /graduate-details
router.get(
    `/${prefix}`,
    [
        body('name')
            .notEmpty()
            .withMessage('Name is required.')
            .isString()
            .withMessage('Name must be a string.'),
    ],
    authenticate,
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        try {
            const name = req.query.name;
            const user = await db.query('SELECT * FROM graduates WHERE fullNameEng = $1', [name]);

            if (user.rows.length > 0) {
                const data = prepareGraduateDetails(user.rows[0]);
                return res.json(data);
            } else {
                return res.status(404).send('Graduate not found.');
            }
        } catch (error) {
            console.error('Error fetching graduate details:', error);
            return res.status(500).send('Error fetching graduate details.');
        }
    }
);
router.get('/graduate-details', authenticate, validateName, async (req, res) => {
    try {
        const name = req.query.name;
        const user = await db.query('SELECT * FROM graduates WHERE fullNameEng = $1', [name]);

        if (user.rows.length > 0) {
            const data = prepareGraduateDetails(user.rows[0]);
            return res.json(data);
        } else {
            return res.status(404).send('Graduate not found.');
        }
    } catch (error) {
        console.error('Error fetching graduates details:', error);
        return res.status(500).send('Error fetching graduates details.');
    }
});
const getGraduateDetails = async (id) => {
    try {
        const user = await db.query('SELECT * FROM graduates WHERE id = $1', [id]);

        if (user.rows.length > 0) {
            const data = prepareGraduateDetails(user.rows[0]);
            return res.json(data);
        } else {
            return res.status(404).send('Graduate not found.');
        }
    } catch (error) {
        console.error('Error fetching graduates details:', error);
        return res.status(500).send('Error fetching graduates details.');
    }
}

//old /graduate-details
router.get(`/${prefix}`, authenticate, async (req, res) => {
    try {
        const graduates = await db.query('SELECT * FROM graduates');
        return res.send(graduates.rows);
    } catch (error) {
        console.error('Error fetching graduates:', error);
        return res.status(500).send('Error fetching graduates.');
    }
});


router.get(
    `/${prefix}/search`,
    [
        body('gpaL')
            .optional()
            .isFloat()
            .withMessage('GPA left boundary must be a number.'),
        body('gpaR')
            .optional()
            .isFloat()
            .withMessage('GPA right boundary must be a number.'),
        body('specialities')
            .optional()
            .isArray()
            .withMessage('Specialities must be an array.')
            .isString()
            .withMessage('Each speciality must be a string.'),
        body('region')
            .optional()
            .isArray()
            .withMessage('Regions must be an array.')
            .isString()
            .withMessage('Each region must be a string.'),
        body('degree')
            .optional()
            .isArray()
            .withMessage('Degrees must be an array.')
            .isString()
            .withMessage('Each degree must be a string.'),
        body('year')
            .optional()
            .isArray()
            .withMessage('Years must be an array.')
            .isInt()
            .withMessage('Each year must be an integer.'),
        body('university_id')
            .optional()
            .isArray()
            .withMessage('University_id must be an array.')
            .isInt()
            .withMessage('Each id must be an integer.'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        const name = req.query.name;
        const gpaL = req.query.gpaL;
        const gpaR = req.query.gpaR;
        const speciality = req.query.specialities;
        const region = req.query.region;
        const degree = req.query.degree;
        const year = req.query.year;
        const university_id = req.query.university_id;
        const ratingL = req.query.ratingL;
        const ratingR = req.query.ratingR;

        const query_dict = {
            name: name ?? '',
            gpa: gpaL && gpaR ? [parseFloat(gpaL), parseFloat(gpaR)] : null,
            speciality: speciality,
            region: region,
            degree: degree,
            year: year,
            university_id: university_id,
            rating: ratingL && ratingR ? [parseFloat(ratingL), parseFloat(ratingR)] : null,
        };
        let contentIds = [0];
        let hasFields = false;
        let hasColumns = false;
        try {
            for (const [key, value] of Object.entries(query_dict)) {
                if (!value) continue;

                let fieldsQuery = null;
                console.log(key, value);
                if (key === 'gpa' || key === 'region' || key === 'year') {
                    hasFields = true;
                }
                switch (key) {
                    case 'gpa' : {
                        fieldsQuery = await db.query(`
                            SELECT content_id
                            FROM content_fields
                            WHERE type = 'diploma_gpa'
                              AND value > $1
                              AND value < $2
                        `, [value[0], value[1]]);
                        break;
                    }
                    case 'region' : {
                        fieldsQuery = await db.query(`
                            SELECT content_id
                            FROM content_fields
                            WHERE type = 'diploma_region'
                              AND value like $1
                        `, [`%${value}%`]);
                        break;
                    }
                    case 'year' : {
                        fieldsQuery = await db.query(`
                            SELECT content_id
                            FROM content_fields
                            WHERE type = 'diploma_year'
                              AND value = $1
                        `, [value]);
                        break;
                    }
                }
                if (fieldsQuery && fieldsQuery.rows && fieldsQuery.rows.length) {

                    let ids = fieldsQuery.rows.map(row => parseInt(row.content_id))

                    if (contentIds.includes(0)) {
                        contentIds = ids;
                    } else {
                        contentIds = ids.filter(value => contentIds.includes(value))
                    }

                }
            }

            let query = `select name_en
                         from diplomas
                         where`;

            for (const [key, value] of Object.entries(query_dict)) {
                if (!value) continue;

                if (key === 'name' || key === 'speciality' || key === 'degree' || key === 'university_id') {
                    hasColumns = true;
                }

                switch (key) {
                    case 'name' :
                        query += `(name_en ilike '%${value}%' or name_ru ilike '%${value}%' or name_kz ilike '%${value}%') AND`;
                        break;
 
                    case 'speciality':
                    case 'degree':
                        query += `(speciality_en ilike '%${value}%' or speciality_ru ilike '%${value}%' or speciality_kz ilike '%${value}%') AND`;
                        break;
                    case 'university_id':
                        query += `(university_id = ${value}) AND`;
                        break;
                    case 'rating':
                        query += `(rating > ${value[0]} AND rating < ${value[1]}) AND`;
                        break;
                }
            }

            let names = [];
            let diplomas = [];

            if (hasFields) {
                diplomas = await db.query(`${query} (visibility = true) AND id = ANY ($1)`, [contentIds]);
            } else if (hasColumns) {
                diplomas = await db.query(`${query} visibility = true`);
            }

            if ((hasColumns || hasFields) && diplomas.rows.length) {
                names = diplomas.rows;
            }

            return res.json(names);
        } catch (error) {
            console.error('Error searching graduates:', error);
            return res.status(500).send('Error searching graduates.');
        }
    }
);