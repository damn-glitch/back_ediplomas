const express = require('express');
const db = require('../config/database'); 
const router = require('./router');


router.get('/search', async (req, res) => {
    const name = req.query.name;
    const gpaL = req.query.gpaL;
    const gpaR = req.query.gpaR;
    const speciality = req.query.specialities;
    const region = req.query.region;
    const degree = req.query.degree;
    const year = req.query.year;

    const query_dict = {
        name: name ?? "",
        gpa: gpaL && gpaR ? [parseFloat(gpaL), parseFloat(gpaR)] : null,
        speciality: speciality ? speciality.split(',') : "",
        region: region ? region.split(',') : "",
        degree: degree ? degree.toLowerCase().split(',') : "",
        year: year ? year.split(',') : "",
    };

    try {
        let searchResult;
        let db_query = `SELECT fullNameEng
                        FROM graduates
                        INNER JOIN universities ON graduates.university_id = universities.id
                        WHERE `;
        const queryValues = [];

        let has_filters = false;
        let parameterIndex = 1;

        for (const [key, value] of Object.entries(query_dict)) {
            if (value === null || value === "") {
                continue;
            }
            has_filters = true;
            console.log(value);
            switch (key) {
                case "name":
                    db_query += `fullNameKz LIKE $${parameterIndex++} AND `;
                    queryValues.push(`%${value}%`);
                    break;
                case "gpa":
                    db_query += `gpa > $${parameterIndex++} AND gpa < $${parameterIndex++} AND `;
                    queryValues.push(value[0]);
                    queryValues.push(value[1]);
                    break;
                case "speciality":
                    if (Array.isArray(value)) {
                        db_query += `(${value.map(() => `${key} LIKE $${parameterIndex++}`).join(" OR ")}) AND `;
                        queryValues.push(...value.map(v => `%${v}%`));
                    } else {
                        db_query += `${key} LIKE $${parameterIndex++} AND `;
                        queryValues.push(`%${value}%`);
                    }
                    console.log(queryValues);
                    break;
                case "region":
                    if (Array.isArray(value)) {
                        db_query += `(${value.map(() => `${key} LIKE $${parameterIndex++}`).join(" OR ")}) AND `;
                        queryValues.push(...value.map(v => `%${v}%`));
                    } else {
                        db_query += `${key} LIKE $${parameterIndex++} AND `;
                        queryValues.push(`%${value}%`);
                    }
                    break;
                case "degree":
                    if (Array.isArray(value)) {
                        db_query += `(${value.map(() => `major LIKE $${parameterIndex++}`).join(" OR ")}) AND `;
                        queryValues.push(...value.map(v => `%${v}%`));
                    } else {
                        db_query += `${key} LIKE $${parameterIndex++} AND `;
                        queryValues.push(`%${value}%`);
                    }
                    break;
                case "year":
                    if (Array.isArray(value)) {
                        db_query += `(${value.map(() => `${key} = $${parameterIndex++}`).join(" OR ")}) AND `;
                        queryValues.push(...value);
                    } else {
                        db_query += `${key} = $${parameterIndex++} AND `;
                        queryValues.push(value);
                    }
                    break;
            }
        }

        if (!has_filters) {
            res.status(400).send('Bad Request');
            return;
        }

        db_query = db_query.substring(0, db_query.length - 5);
        searchResult = await db.query(db_query, queryValues);
        res.send(searchResult.rows);
    } catch (error) {
        console.error('Error searching graduates:', error);
        res.status(500).send('Error searching graduates.');
    }
});

module.exports = router;
