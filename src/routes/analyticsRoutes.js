const express = require('express');
const {authenticate} = require('../middleware/authenticate');
const db = require('../config/database');
const router = require('./router');
const prefix = "analytics";

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
];

const getUniversityData = async (university_id) => {
    const universities = await db.query(`
        SELECT users.id,
               users.name,
               users.university_id,
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

router.get(
    `/${prefix}/graduates-amount`,
    authenticate,
    async (req, res) => {
        try {
            const universityData = await getUniversityData(req.user.id);

            const graduatesAmount = await db.query(
                `SELECT COUNT(*) FROM graduates WHERE university_id = $1`,
                [universityData.university_id]
            );

            const bachelorGraduatesAmount = await db.query(
                `SELECT COUNT(*) FROM graduates WHERE university_id = $1 AND major = 'бакалавра'`,
                [universityData.university_id]
            );

            const masterGraduatesAmount = await db.query(
                `SELECT COUNT(*) 
                FROM graduates 
                WHERE university_id = $1 
                AND major IN ('магистра', 'магистра экономических наук', 'магистра бизнеса и управления', 'МBA');`,
                [universityData.university_id]
            );
            
            const data = {
                graduatesAmount: graduatesAmount.rows[0].count,
                bachelorGraduatesAmount: bachelorGraduatesAmount.rows[0].count,
                masterGraduatesAmount: masterGraduatesAmount.rows[0].count,
            }

            return res.status(200).json(data);

        } catch(error) {
            console.log('Error fetching graduates amount:', error);
            return res.status(500).send('Error fetching graduates amount.');
        }
});