const db = require('../config/database');
const router = require('./router');
const {url, ipfsUrl} = require('../const/constants');
const axios = require("axios");
const {body, validationResult} = require("express-validator");
const prefix = "diploma"

const attributes = [
    "diploma_distinction_en",
    "diploma_distinction_ru",
    "diploma_distinction_kz",
    "diploma_degree_en",
    "diploma_degree_ru",
    "diploma_degree_kz",
    "diploma_protocol_en",
    "diploma_protocol_ru",
    "diploma_protocol_kz",
]
router.get(
    `/${prefix}`,
    async (req, res) => {
        try {
            // Extract page and per_page parameters from the request query
            const {page = 1, per_page = 25, university_id = null} = req.query;

            // Convert page and per_page to integers
            const pageNumber = page;
            const perPageNumber = per_page;

            // Validate that page and per_page are positive integers
            if (isNaN(pageNumber) || isNaN(perPageNumber) || pageNumber <= 0 || perPageNumber <= 0) {
                return res.status(400).json({error: 'Invalid page or per_page parameter.'});
            }

            // Calculate the offset based on page and per_page
            const offset = (pageNumber - 1) * perPageNumber;

            // Fetch diplomas from the database based on the offset and limit
            const diplomaItems = await db.query(`
                        SELECT *
                        FROM diplomas ${university_id ? `WHERE university_id = ${university_id}` : ""}
                        ORDER BY id DESC
                        LIMIT $1 OFFSET $2`,
                [perPageNumber, offset,]);

            // Return the fetched diplomas
            return res.json(diplomaItems.rows);
        } catch (error) {
            console.error('Error sending OTP:', error);
            return res.status(500).json({error: 'Failed to send OTP.'});
        }
    }
);
router.get(`/${prefix}/:diploma_id`, async (req, res) => {
    const diploma_id = req.params.diploma_id;
    try {
        if (!diploma_id) {
            return res.status(400).json({"error": `diploma_id is required after ${prefix}/ must be diploma_id (number)`})
        }
        // Fetch diplomas from the database based on the offset and limit
        const diplomaItem = await db.query(`
            SELECT id
            FROM diplomas
            WHERE id = $1
        `, [diploma_id]);
        if (diplomaItem.rows.length === 0) {
            return res.status(404).json({"error": "Diploma not found"});
        }
        const diplomaId = diplomaItem.rows[0].id;
        const diploma = await getDiplomaFields(diplomaId);

        return res.json(diploma);
    } catch (error) {
        console.error('Error sending OTP:', error);
        return res.status(500).json({error: 'Failed to send OTP.'});
    }
});

const getDiplomaFields = async (diploma_id) => {
    const item = await db.query(`
        SELECT *
        FROM diplomas
        WHERE id = $1
    `, [diploma_id]);

    if (!item.rows.length) {
        return [];
    }
    let data = item.rows[0];
    for (let i = 0; i < attributes.length; i++) {
        const key = attributes[i];
        if (item.rows[0][key] !== undefined) continue;
        let attr = await db.query(
            'select * from content_fields where content_id = $1 and type = $2 and deleted_at IS NULL',
            [diploma_id, key]
        );
        data[key] = attr.rows.length ? attr.rows[0].value : null;
    }
    return data;
}