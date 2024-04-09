const db = require('../config/database');
const router = require('./router');
const bcrypt = require('bcrypt');
const axios = require("axios");
const {body, validationResult} = require("express-validator");
const prefix = "temp"
const fs = require("fs");
const getDiplomaFields = async (diploma_id) => {
    try {
        const item = await db.query(`
            SELECT id
            FROM diplomas
            WHERE id = $1
        `, [diploma_id]);

        if (!item.rows.length) {
            return null; // Return null if no diploma is found
        }

        const data = item.rows[0];

        const diplomaAttributes = ['diploma_email', 'diploma_phone'];

        for (const key of diplomaAttributes) {
            if (data[key] === undefined) {
                const attr = await db.query('SELECT value FROM content_fields WHERE content_id = $1 AND type = $2 AND deleted_at IS NULL', [diploma_id, key]);
                if (attr.rows.length > 0) {
                    try {
                        data[key] = JSON.parse(attr.rows[0].value);
                    } catch (e) {
                        data[key] = attr.rows[0].value;
                    }
                }
            }
        }

        return data;
    } catch (error) {
        console.error('Error fetching diploma fields:', error);
        throw error; // Rethrow the error to the caller
    }
};

function strRand(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

router.get(`/${prefix}`, async (req, res) => {
    try {
        const university_id = 3;
        const diplomaItems = await db.query(`
            SELECT diplomas.id,
                   diplomas.name_kz,
                   diplomas.name_en,
                   diplomas.university_id,
                   content_fields.value as email
            FROM diplomas
                     left join content_fields
                               on content_fields.content_id = diplomas.id and content_fields.type = 'diploma_email'
            WHERE university_id = $1
        `, [university_id]);

        if (diplomaItems.rows.length === 0) {
            console.log({"error": "Diploma not found"});
            return; // Exit the function if no diplomas are found
        }

        let counter = 1;
        let data = [];
        let sql = "insert into users(name, first_name, middle_name, last_name, email, password, email_validated, role_id) values"; // 3
        for (const item of diplomaItems.rows) {
            let temp = item.name_kz.split(" ");
            let second_name = temp[0];
            let first_name = temp[1];
            let middle_name = temp.length > 2 ? temp[2] : null;
            let email = JSON.parse(item.email) ?? item.name_en.split(" ").join("_") + "@pmail.kz";
            let password = strRand(8);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            data.push({counter: counter, name: item.name_kz, email: email, password: password});
            sql += `\n('${item.name_kz}','${first_name}',${middle_name ? `'${middle_name}'` : null},'${second_name}','${email}','${hashedPassword}',${true},${3}),`;
            console.log(
                counter,
                item.name_kz
            );
            counter++;
        }

        fs.writeFile("data.json", JSON.stringify(data), (error) => {
            if (error) {
                console.error(error);
                throw error;
            }
            console.log("data.json written correctly");
        });
        fs.writeFile("data.sql", sql, (error) => {
            if (error) {
                console.error(error);
                throw error;
            }
            console.log("data.json written correctly");
        });

        return res.json("ok");
    } catch (error) {
        console.error('Error fetching diplomas:', error);
        return res.status(400).json(error)
    }
});