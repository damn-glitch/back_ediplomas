const db = require('../config/database');
const router = require('./router');
const axios = require("axios");
const {body, validationResult} = require("express-validator");
const prefix = "diploma"

const diplomaAttributes = [
    "diploma_distinction_en",
    "diploma_distinction_ru",
    "diploma_distinction_kz",
    "diploma_degree_en",
    "diploma_degree_ru",
    "diploma_degree_kz",
    "diploma_protocol_en",
    "diploma_protocol_ru",
    "diploma_protocol_kz",

    "diploma_iin",
    "diploma_phone",
    "diploma_email",
    "diploma_gpa",
    "diploma_region",
    "diploma_gender",
    "diploma_nationality",
    "diploma_grant",
    "diploma_faculty",
    "diploma_diploma_total",

    "diploma_smart_contract_cid",

    "faculty",
    "subjectsHigher",
    "subjectsStandard",
    "additionalSubjects",
    "grade",
    "verified",
]
router.get(`/${prefix}`, async (req, res) => {
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
                        FROM diplomas ${university_id ? `WHERE university_id = ${university_id} AND visibility = true` : "WHERE visibility = true"}
                        ORDER BY id, gpa DESC
                        LIMIT $1 OFFSET $2`,
                [perPageNumber, offset]);

            // Return the fetched diplomas
            if (perPageNumber > 8) {
                return res.json(diplomaItems.rows);
            }

            for (let i = 0; i < diplomaItems.rows.length; i++) {
                const diplomaId = diplomaItems.rows[i].id;
                const gpaResult = await db.query(
                    'SELECT value FROM content_fields WHERE content_id = $1 AND type = $2',
                    [diplomaId, 'diploma_gpa']
                );
                const gpa = gpaResult.rows.length ? gpaResult.rows[0].value : null;
                diplomaItems.rows[i]["gpa"] = gpa;
            }

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
              AND visibility = true
        `, [diploma_id]);
        if (diplomaItem.rows.length === 0) {
            return res.status(404).json({"error": "Diploma not found"});
        }
        const diplomaId = diplomaItem.rows[0].id;
        const diploma = await getDiplomaFields(diplomaId);

        return res.json(diploma);
    } catch (error) {
        console.error('Error sending OTP:', error);
        return res.status(500).json({error: error});
    }
});

const getDiplomaFields = async (diploma_id) => {
    const item = await db.query(`
        SELECT *
        FROM diplomas
        WHERE id = $1
          AND visibility = true
    `, [diploma_id]);

    if (!item.rows.length) {
        return [];
    }
    let data = item.rows[0];

    const createdDate = new Date(item.rows[0].created_at);
    const formattedCreatedDate = `${padZero(createdDate.getUTCHours())}:${padZero(createdDate.getUTCMinutes())} - ${padZero(createdDate.getUTCDate())}.${padZero(createdDate.getUTCMonth() + 1)}.${createdDate.getUTCFullYear()}`;

    data['created_at'] = formattedCreatedDate;
    if (item.rows[0].university_id) {
        const xmls = await db.query(`
            select signed_xmls.signed_by, signed_xmls.created_at
            from signed_xmls
                     inner join users
                                on users.id = signed_xmls.user_id
            where users.university_id = $1`, [item.rows[0].university_id]);
        if (xmls.rows.length) {
            data['signed_by'] = xmls.rows[0].signed_by;
            const dateObject = new Date(xmls.rows[0].created_at);
            const formattedDate = `${padZero(dateObject.getUTCHours())}:${padZero(dateObject.getUTCMinutes())} - ${padZero(dateObject.getUTCDate())}.${padZero(dateObject.getUTCMonth() + 1)}.${dateObject.getUTCFullYear()}`;
            data['signed_at'] = formattedDate;
        }
    }

    for (let i = 0; i < diplomaAttributes.length; i++) {
        const key = diplomaAttributes[i];
        if (item.rows[0][key] !== undefined) continue;
        let attr = await db.query(
            'select * from content_fields where content_id = $1 and type = $2 and deleted_at IS NULL',
            [diploma_id, key]
        );
        data[key] = attr.rows.length ? attr.rows[0].value : null;
    }
    return data;
}

function padZero(value) {
    return value < 10 ? `0${value}` : value;
}
