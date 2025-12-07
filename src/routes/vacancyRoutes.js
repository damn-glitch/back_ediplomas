const express = require('express');
const {authenticate} = require('../middleware/authenticate');
const db = require('../config/database');
const router = require('./router');
const {body, validationResult} = require("express-validator");
const socketIoService = require('../socket.io.service');

const prefix = "vacancy";

const vacancyStatuses = {
    "processing": "processing",
    "invited": "invited",
    "rejected": "rejected",
};

router.post(
    `/${prefix}/apply`, 
    [body('employer').notEmpty().withMessage('Employer must not be empty')], 
    authenticate, async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        const {employer} = req.body;

        try {
            const user = await db.query(`
                SELECT id, role_id
                FROM users
                WHERE id = $1 AND role_id = 3
            `, [req.user.id]);

            if (user.rows.length === 0) {
                console.log(req.user.id);
                return res.status(403).send('Forbidden');
            }

            const employerUser = await db.query(`
                SELECT id, role_id
                FROM users
                WHERE id = $1 AND role_id = 1
            `, [employer]);

            if (employerUser.rows.length === 0) {
                return res.status(404).send('Employer/vacancy not found.');
            }

            const application = await db.query(`
                SELECT id
                FROM applications
                WHERE student_id = $1 AND employer_id = $2
            `, [req.user.id, employer]);

            if (application.rows.length > 0) {
                return res.status(400).send('Application already exists.');
            }

            const currentTimeStamp = new Date(Date.now());

            await db.query(`
                INSERT INTO applications (student_id, employer_id, status, created_at)
                VALUES ($1, $2, $3, $4)
            `, [req.user.id, employer, "processing", currentTimeStamp]);

            const io = socketIoService.getInstance();
            io.to(`employer-${employer}`).emit('new-application', {
                studentId: req.user.id,
            });
            console.log('New application from student:', req.user.id);

            return res.status(201).send('Application submitted.');
        } catch (error) {
            console.error('Error applying for vacancy:', error);
            return res.status(500).send('Error applying for vacancy.');
        }
});

router.put(
    `/${prefix}/status`, 
    [
        body('application_id').notEmpty().withMessage('Application must not be empty'), 
        body('status').notEmpty().withMessage('Status must not be empty')
    ], 
    authenticate, 
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        const {application_id, status} = req.body;

        try {
            const user = await db.query(`
                SELECT id, role_id
                FROM users
                WHERE id = $1 AND role_id = 1
            `, [req.user.id]);

            if (user.rows.length === 0) {
                return res.status(403).send('Forbidden');
            }

            const applicationRecord = await db.query(`
                SELECT id
                FROM applications
                WHERE id = $1
            `, [application_id]);

            if (applicationRecord.rows.length === 0) {
                return res.status(404).send('Application not found.');
            }

            if (!Object.values(vacancyStatuses).includes(status)) {
                return res.status(400).send('Invalid status.');
            }

            await db.query(`
                UPDATE applications
                SET status = $1
                WHERE id = $2
            `, [status, application_id]);

            return res.status(200).send('Application status updated.');
        } catch (error) {
            console.error('Error updating application status:', error);
            return res.status(500).send('Error updating application status.');
        }
});

router.get(
    `/${prefix}/applications`,
    authenticate,
    async (req, res) => {
        try {
            const user = await db.query(`
                SELECT id, role_id
                FROM users
                WHERE id = $1
            `, [req.user.id]);

            if (user.rows.length === 0) {
                return res.status(404).send('User not found.');
            }

            if (user.rows[0].role_id == 3) {
                const applications = await db.query(`
                SELECT 
                    applications.id, 
                    applications.employer_id, 
                    applications.status, 
                    applications.created_at, 
                    users.name AS employer_name, 
                    content_fields.value AS field
                FROM 
                    applications
                INNER JOIN 
                    users ON applications.employer_id = users.id
                LEFT JOIN 
                    content_fields ON applications.employer_id = content_fields.content_id AND content_fields.type = 'field'
                WHERE 
                    applications.student_id = $1
                `, [req.user.id]);

                return res.json(applications.rows);
            } else if (user.rows[0].role_id == 1) {
                const applications = await db.query(`
                    SELECT 
                        applications.id, 
                        applications.student_id, 
                        applications.status, 
                        applications.created_at, 
                        users.name AS student_name,
                        users.email AS student_email,
                        diplomas.university_id AS university_id,
                        diplomas.year AS year,
                        diplomas.speciality_en AS speciality_en,
                        diplomas.speciality_ru AS speciality_ru,
                        diplomas.speciality_kz AS speciality_kz,
                        diplomas.name_en AS name_en,
                        diplomas.name_ru AS name_ru,
                        diplomas.name_kz AS name_kz,
                        diplomas.rating AS rating,
                        diplomas.gpa AS gpa,
                        diplomas.id AS diploma_id,
                        cf_1.value AS diploma_email,
                        cf_2.value AS diploma_city,
                        cf_3.value AS diploma_nationality,
                        cf_4.value AS diploma_phone,
                        cf_5.value AS diploma_region,
                        cf_6.value AS diploma_date_of_birth,
                        cf_7.value AS diploma_degree
                    FROM 
                        applications
                    INNER JOIN 
                        users ON applications.student_id = users.id
                    LEFT JOIN 
                        diplomas ON applications.student_id = diplomas.user_id
                    LEFT JOIN
                        content_fields AS cf_1 ON diplomas.id = cf_1.content_id AND cf_1.type = 'diploma_email'
                    LEFT JOIN
                        content_fields AS cf_2 ON diplomas.id = cf_2.content_id AND cf_2.type = 'diploma_city'
                    LEFT JOIN
                        content_fields AS cf_3 ON diplomas.id = cf_3.content_id AND cf_3.type = 'diploma_nationality'
                    LEFT JOIN
                        content_fields AS cf_4 ON diplomas.id = cf_4.content_id AND cf_4.type = 'diploma_phone'
                    LEFT JOIN
                        content_fields AS cf_5 ON diplomas.id = cf_5.content_id AND cf_5.type = 'diploma_region'
                    LEFT JOIN
                        content_fields AS cf_6 ON diplomas.id = cf_6.content_id AND cf_6.type = 'diploma_date_of_birth'
                    LEFT JOIN
                        content_fields AS cf_7 ON diplomas.id = cf_7.content_id AND cf_7.type = 'diploma_degree'
                    WHERE 
                        applications.employer_id = $1
                `, [req.user.id]);

                return res.json(applications.rows);
            } else {
                return res.status(403).send('Forbidden');
            }
        } catch (error) {
            console.error('Error fetching applications:', error);
            return res.status(500).send('Error fetching applications.');
        }
});

router.post(
    `/${prefix}/invite`,
    [body('student').notEmpty().withMessage('Student must not be empty')],
    authenticate, async (req, res) => {
        const errors = validationResult(req);

        console.log('entered');

        if (!errors.isEmpty()){
            return res.status(400).json(errors);
        }

        const {student} = req.body;

        try {
            const user = await db.query(`
                SELECT id, role_id
                FROM users
                WHERE id = $1 AND role_id = 1 
            `, [req.user.id]);

            if (user.rows.length === 0){
                return res.status(403).send('Forbidden');
            }

            const studentUser = await db.query(`
                SELECT id, role_id
                FROM users
                WHERE id = $1 AND role_id = 3
            `, [student]);

            if (studentUser.rows.length === 0) {
                return res.status(404).send('Student not found');
            }

            const currentTimeStamp = new Date(Date.now());

            await db.query(`
                INSERT INTO applications (student_id, employer_id, status, created_at)
                VALUES ($1, $2, $3, $4)
            `,[student, req.user.id, 'invited', currentTimeStamp]);

            return res.status(201).send('Application submitted.');
        } catch (error) {
            console.error('Error submitting the application: ', error);
            return res.status(500).send('Error submitting the application');
        }
});