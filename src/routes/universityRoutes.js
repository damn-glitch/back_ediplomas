const express = require('express');
const {authenticate} = require('../middleware/authenticate');
const db = require('../config/database');
const analytics_Button = 3;
const router = require('./router');
const {body, validationResult} = require("express-validator");
const {json} = require("express");

const prefix = "university";

const universityAttributes = [
    "email",
    'avatar',
    'phone',
    'name',
    'phone',
    'preview_image',
    'speciality_amount',
    'student_amount',
    'graduate_amount',
    'description',
    'notification_accept_news',
    'notification_accept_change',
    'notification_accept_device',
    'social_links',
    "certificates",
    "web_link",
    "instagram_link",
    "telegram_link",
    "resume_link",
    "linkedin_link",
    "youtube_link",
    "facebook_link",
];
//old /account
router.get(`/${prefix}`, authenticate, async (req, res) => {
    try {
        const universities = await db.query(`
            SELECT users.id, role_id
            FROM users
                     INNER JOIN roles ON users.role_id = roles.id
            WHERE roles.id = $1
        `, [2,]);

        if (universities.rows.length > 0) {
            let data = await getUniversityData(req.user.id);
            return res.json(data);
        } else {
            return res.status(404).send('Universities not found.');
        }
    } catch (error) {
        console.error('Error fetching universities:', error);
        return res.status(500).send('Error fetching universities.');
    }
});
router.get('/account', authenticate, async (req, res) => {
    try {
        const user = await db.query(`
            SELECT users.id, email, name, role_id
            FROM users
                     INNER JOIN roles ON users.role_id = roles.id
            WHERE users.id = $1
        `, [req.user.id]);

        if (user.rows.length > 0) {
            const userData = {
                id: user.rows[0].id,
                email: user.rows[0].email,
                companyName: user.rows[0].name,
                analyticsButton: user.rows[0].role_id === analytics_Button
            };
            let data = await getUniversityData(req.user.id);
            res.json(data);
        } else {
            res.status(404).send('User not found.');
        }
    } catch (error) {
        console.error('Error fetching user account:', error);
        res.status(500).send('Error fetching user account.');
    }
});

// old update /account
router.post(`/${prefix}/profile`, [body('attributes').notEmpty().withMessage('User attributes must not be empty.'),], authenticate, async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json(errors);
    }

    const {attributes} = req.body;

    const user = await db.query(`
        SELECT users.id,
               users.first_name,
               users.last_name,
               users.middle_name,
               users.name,
               users.email,
               role_id
        FROM users
                 INNER JOIN roles ON users.role_id = roles.id
        WHERE users.id = $1
    `, [req.user.id]);

    if (!user.rows.length) {
        res.status(404).send('User not found.');
    }

    try {
        //update attributes
        for (let i = 0; i < userAttributes.length; i++) {
            const key = userAttributes[i];
            if (user.rows[0][key] !== undefined && attributes[key]) {
                console.log(key, attributes[key]);
                await db.query(
                    `update users
                     set ${key} = $1
                     where id = $2`,
                    [attributes[key], req.user.id,]
                );
            } else if (attributes[key]) {
                let attr = await db.query(
                    'select * from content_fields where content_id = $1 and type = $2',
                    [req.user.id, key]
                );
                if (!attr.rows.length) {
                    await db.query(
                        'insert into content_fields(content_id, type, value, created_at) values ($1, $2, $3, $4)',
                        [req.user.id, key, attributes[key], new Date(),]
                    );
                } else {
                    await db.query(
                        'update content_fields set value = $1 where type = $2 and content_id = $3',
                        [attributes[key], key, req.user.id,]
                    );
                }
            }
        }
        let data = await getUniversityData(req.user.id);
        return res.json(data);
    } catch (error) {
        console.error('Error updating user account:', error);
        res.status(500).send('Error updating user account.');
    }
});
// Update account route (authenticated)
const getUniversityData = async (university_id) => {
    const universities = await db.query(`
        SELECT users.id,
               users.name,
               users.email,
               roles.name as role
        FROM users
                 INNER JOIN roles ON users.role_id = roles.id
        WHERE users.id = $1
    `, [university_id]);

    if (!universities.rows.length) {
        return [];
    }
    let data = universities.rows[0];
    for (let i = 0; i < universityAttributes.length; i++) {
        const key = universityAttributes[i];
        if (universities.rows[0][key] !== undefined) continue;
        let attr = await db.query(
            'select * from content_fields where content_id = $1 and type = $2',
            [university_id, key]
        );
        data[key] = attr.rows.length ? attr.rows[0].value : null;
    }
    return data;
}


