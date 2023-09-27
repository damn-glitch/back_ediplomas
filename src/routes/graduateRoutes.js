const express = require('express');
const {authenticate} = require('../middleware/authenticate');
const db = require('../config/database');
const router = require('./router');
const {body} = require("express-validator");

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
            .withMessage('Name must be a string.')
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
router.get('/graduate-details', authenticate, async (req, res) => {
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
        body('name')
            .notEmpty()
            .withMessage('Name is required.')
            .isString()
            .withMessage('Name must be a string.'),
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
    ],
    async (req, res) => {
        const errors = validationResult(req);
        return res.json("[]");
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

        const query_dict = {
            name: name ?? '',
            gpa: gpaL && gpaR ? [parseFloat(gpaL), parseFloat(gpaR)] : null,
            speciality: speciality ? speciality.split(',') : '',
            region: region ? region.split(',') : '',
            degree: degree ? degree.toLowerCase().split(',') : '',
            year: year ? year.split(',') : '',
        };

        try {
            let searchResult;
            let db_query =
                `SELECT fullnameeng
                 FROM graduates
                          INNER JOIN universities ON graduates.university_id = universities.id
                 WHERE `;
            const queryValues = [];

            let has_filters = false;
            let parameterIndex = 1;

            for (const [key, value] of Object.entries(query_dict)) {
                if (value === null || value === '') {
                    continue;
                }
                has_filters = true;
                console.log(value);
                switch (key) {
                    case 'name':
                        db_query += `fullNameKz LIKE $${parameterIndex++} AND `;
                        queryValues.push(`%${value}%`);
                        break;
                    case 'gpa':
                        db_query += `gpa > $${parameterIndex++} AND gpa < $${parameterIndex++} AND `;
                        queryValues.push(value[0]);
                        queryValues.push(value[1]);
                        break;
                    case 'speciality':
                        if (Array.isArray(value)) {
                            db_query += `(${value.map(() => `${key} LIKE $${parameterIndex++}`).join(' OR ')}) AND `;
                            queryValues.push(...value.map((v) => `%${v}%`));
                        } else {
                            db_query += `${key} LIKE $${parameterIndex++} AND `;
                            queryValues.push(`%${value}%`);
                        }
                        console.log(queryValues);
                        break;
                    case 'region':
                        if (Array.isArray(value)) {
                            db_query += `(${value.map(() => `${key} LIKE $${parameterIndex++}`).join(' OR ')}) AND `;
                            queryValues.push(...value.map((v) => `%${v}%`));
                        } else {
                            db_query += `${key} LIKE $${parameterIndex++} AND `;
                            queryValues.push(`%${value}%`);
                        }
                        break;
                    case 'degree':
                        if (Array.isArray(value)) {
                            db_query += `(${value.map(() => `major LIKE $${parameterIndex++}`).join(' OR ')}) AND `;
                            queryValues.push(...value.map((v) => `%${v}%`));
                        } else {
                            db_query += `${key} LIKE $${parameterIndex++} AND `;
                            queryValues.push(`%${value}%`);
                        }
                        break;
                    case 'year':
                        if (Array.isArray(value)) {
                            db_query += `(${value.map(() => `${key} = $${parameterIndex++}`).join(' OR ')}) AND `;
                            queryValues.push(...value);
                        } else {
                            db_query += `${key} = $${parameterIndex++} AND `;
                            queryValues.push(value);
                        }
                        break;
                }
            }

            if (!has_filters) {
                return res.status(400).send('Bad Request');
            }

            db_query = db_query.substring(0, db_query.length - 5);
            searchResult = await db.query(db_query, queryValues);
            return res.send(searchResult.rows);
        } catch (error) {
            console.error('Error searching graduates:', error);
            return res.status(500).send('Error searching graduates.');
        }
        return res.send([]);
    }
);