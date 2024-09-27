const express = require('express');
const db = require('../config/database'); 
const router = require('./router');
const {body} = require("express-validator");

const prefix = "iin"

router.get(
  `/${prefix}/validate`,
  [
    body('name')
      .notEmpty()
      .withMessage('Name is required.')
      .isString()
      .withMessage('Name must be a string.'),
    body('iin')
      .notEmpty()
      .withMessage('IIN is required.')
      .isNumeric()
      .withMessage('IIN must be a numeric value.')
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json(errors);
    }

    const { name, iin } = req.query;

    try {
      let searchResult;
      let db_query = `SELECT fullNameEng
                      FROM graduates 
                      WHERE `;
      const queryValues = [];

      db_query += `fullNameEng LIKE $1 AND `;
      queryValues.push(`%${name.trim()}%`);

      db_query += `iin = $2`;
      queryValues.push(iin.toString().trim());

      searchResult = await db.query(db_query, queryValues);

      if (searchResult.rows.length === 0) {
        return res.json(false);
      }

      return res.json(true);
    } catch (error) {
      console.error('Error validating IIN:', error);
      res.status(500).send('Error validating IIN.');
    }
  });
router.get(`/validate-iin`, async (req, res) => {
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


