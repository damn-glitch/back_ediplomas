const express = require('express');
const db = require('../config/database'); 
const router = require('./router');


router.get('/validate-iin', async (req, res) => {
    let name = req.query.name;
    let iin = req.query.iin;

    try {
        let searchResult;
        let db_query = `SELECT fullNameEng
                        FROM graduates 
                        WHERE `;
        const queryValues = [];
        let has_filters = false;
        if (name && name.trim() != "" && iin && iin.trim() != "") {
            has_filters = true;
        }
        name = name.trim();
        iin = iin.toString().trim();
        db_query += `fullNameEng LIKE $1 AND `;
        queryValues.push(`%${name}%`);
        db_query += `iin = $2`;
        queryValues.push(iin);

        if (!has_filters) {
            return res.status(400).send('Bad Request');
        }
        searchResult = await db.query(db_query, queryValues);
        if (searchResult.rows.length == 0) {
            return res.json(false);
        }

        return res.json(true);

    } catch (error) {
        console.error('Error validating IIN:', error);
        res.status(500).send('Error validating IIN.');
    }
    return res.json(false);
});


