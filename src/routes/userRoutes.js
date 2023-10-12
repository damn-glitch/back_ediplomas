const express = require('express');
const {authenticate} = require('../middleware/authenticate');
const db = require('../config/database');
const analytics_Button = 3;
const router = require('./router');
const {body} = require("express-validator");

const prefix = "users";
//old /account
router.get(`/${prefix}/profile`, authenticate, async (req, res) => {
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
            res.send(userData);
        } else {
            res.status(404).send('User not found.');
        }
    } catch (error) {
        console.error('Error fetching user account:', error);
        res.status(500).send('Error fetching user account.');
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
            res.send(userData);
        } else {
            res.status(404).send('User not found.');
        }
    } catch (error) {
        console.error('Error fetching user account:', error);
        res.status(500).send('Error fetching user account.');
    }
});
const user_attributes = [ "phone", "university_name", "certificate", "avatar"]
// old update /account
router.put(
    `/${prefix}/profile`,
    [
        body('companyName').notEmpty().withMessage('Company name is required.'),
        body('phone').notEmpty().withMessage('Phone number is required.'),
        body('email').optional(),
        body('certificate').optional(),
        body('avatar').optional(),
        body('background_photo').optional(),
        body('main_info').optional(),
        body('socail_links').optional(),
    ],
    authenticate,
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        const { companyName, phone, email, university_name, certificate, avatar, background_photo, socail_links } = req.body;

        try {
            const result = await db.query(
                'UPDATE users SET name = $1, phone = $2, university_name = $3, certificate = $4, avatar = $5, social = $6, social_links = $7 WHERE users.id = $8 RETURNING *',
                [companyName, phone, email, university_name, certificate, avatar, background_photo, socail_links, req.user.id]
            );

            if (result.rows.length > 0) {
                res.send({message: 'User updated successfully.'});
            } else {
                res.status(404).send('User not found.');
            }
        } catch (error) {
            console.error('Error updating user account:', error);
            res.status(500).send('Error updating user account.');
        }
    }
);
// Update account route (authenticated)
router.put('/account', authenticate, async (req, res) => {
    const {companyName} = req.body;

    if (!companyName) {
        return res.status(400).send('Company name is required.');
    }

    try {
        const result = await db.query(
            'UPDATE users SET name = $1 WHERE users.id = $2 RETURNING *',
            [companyName, req.user.id]
        );

        if (result.rows.length > 0) {
            res.send({message: 'User updated successfully.'});
        } else {
            res.status(404).send('User not found.');
        }
    } catch (error) {
        console.error('Error updating user account:', error);
        res.status(500).send('Error updating user account.');
    }
});


