const express = require('express');
const {authenticate} = require('../middleware/authenticate');
const db = require('../config/database');
const analytics_Button = 3;
const router = require('./router');
const {body, validationResult} = require("express-validator");
const {json} = require("express");

const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    "faculty",
    "subjectsHigher",
    "subjectsStandard",
    "additionalSubjects",
    "grade",
    "verified",
]

const prefix = "users";
const userAttributes = [
    "first_name",
    "last_name",
    "middle_name",
    "email",
    'avatar',
    'phone',
    'name',
    'iin',
    'gpa',
    'date_of_birth',
    'address',
    'description',
    'instagram_link',
    'telegram_link',
    'youtube_link',
    'facebook_link',
    'resume_link',
    'linkedin_link',
    'discord_link',
    "certificates",
    "hired_amount",
    "vacancy_amount",
    "branches_amount",
    "position",
    //
    "skills",
    "desired_position",
    "desired_salary_amount",
    "desired_schedule",
    "gender",
    "telegram",
    "address",
    "description",
    "major",
    "university_name",
    "specialization",
    "year",
    "company_name",
    "experience_start",
    "experience_end",
    "desired_job_position",
    "responsibility",
    "certificates",
    "program",
    "publish_year",

];
const universityAttributes = [
    'gallery',
    "student_amount",
    "graduate_amount",
    "highlighting_amount",
    'description',
    'web_link',
    'smart_contract_links',
    'average_gpa',
    'banner',
    "instagram_link",
    "telegram_link",
    "resume_link",
    "linkedin_link",
    "youtube_link",
    "facebook_link",
    "speciality_amount",
];

const getUserData = async (user_id) => {
    const user = await db.query(`
        SELECT users.id,
               users.first_name,
               users.last_name,
               users.middle_name,
               users.name,
               users.email,
               users.university_id,
               roles.name as role
        FROM users
                 INNER JOIN roles ON users.role_id = roles.id
        WHERE users.id = $1
    `, [user_id]);

    if (!user.rows.length) {
        return [];
    }
    let data = user.rows[0];
    for (let i = 0; i < userAttributes.length; i++) {
        const key = userAttributes[i];
        if (user.rows[0][key] !== undefined) continue;
        let attr = await db.query(
            'select * from content_fields where content_id = $1 and type = $2',
            [user_id, key]
        );
        data[key] = attr.rows.length ? attr.rows[0].value : null;
    }
    const university = await db.query(`
        select *
        from universities
        where id = $1`, [user.rows[0].university_id]);
    if (university.rows.length) {
        data['university_name'] = university.rows[0].name;
    }

    return data;
}

const getEmployerData = async (user_id) => {
    const user = await db.query(`
        SELECT users.id,
               users.first_name,
               users.last_name,
               users.middle_name,
               users.name,
               users.email,
               users.university_id,
               roles.name as role
        FROM users
                 INNER JOIN roles ON users.role_id = roles.id
        WHERE users.id = $1
    `, [user_id]);

    if (!user.rows.length) {
        return [];
    }
    let data = user.rows[0];
    for (let i = 0; i < employerAttributes.length; i++) {
        const key = employerAttributes[i];
        if (user.rows[0][key] !== undefined) continue;
        let attr = await db.query(
            'select * from content_fields where content_id = $1 and type = $2',
            [user_id, key]
        );
        data[key] = attr.rows.length ? attr.rows[0].value : null;
    }

    return data;
};

const getDiplomaData = async (user_id) => {
    const diploma = await db.query(`
        SELECT *
        FROM diplomas
        WHERE diplomas.user_id = $1
    `, [user_id]);

    if (!diploma.rows.length) {
        return [];
    }
    let data = diploma.rows[0];
    let diploma_id = data.id;
    for (let i = 0; i < diplomaAttributes.length; i++) {
        const key = diplomaAttributes[i];
        if (diploma.rows[0][key] !== undefined) continue;
        let attr = await db.query(
            'select * from content_fields where content_id = $1 and type = $2',
            [diploma_id, key]
        );
        data[key] = attr.rows.length ? attr.rows[0].value : null;
    }
    return data;
}
const getUniversityData = async (user_id) => {

    let data = {};
    for (let i = 0; i < universityAttributes.length; i++) {
        const key = universityAttributes[i];
        let attr = await db.query(
            'select * from content_fields where content_id = $1 and type = $2',
            [user_id, key]
        );
        data[key] = attr.rows.length ? attr.rows[0].value : null;
    }
    return data;
}
//old /account

// Upload route

// Set up multer storage and file filter
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${Date.now()}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({storage, fileFilter});

const multiparty = require('multiparty');
const http = require('http');
const util = require('util');
router.post('/upload', upload.single('file'), (req, res) => {
    try {

        // // Access the uploaded file details from req.file
        const {filename} = req.file;
        const filePath = "uploads/" + filename;
        // Return a response to the client with the relative path
        res.json(filePath);
    } catch (error) {
        console.error('Error uploading file:', error.message);
        res.status(500).json({error: 'Error uploading file.'});
    }
});

router.get(`/${prefix}/profile`, authenticate, async (req, res) => {
    try {
        const user = await db.query(`
            SELECT users.id, role_id
            FROM users
                     INNER JOIN roles ON users.role_id = roles.id
            WHERE users.id = $1
        `, [req.user.id]);

        if (user.rows.length > 0) {
            let data = await getUserData(req.user.id);
            let role = user.rows[0].role_id;
            let newData = {};
            if (role == 3) {
                let temp = await getDiplomaData(user.rows[0].id);
                data = {...data, ...temp}
            }
            if (role == 2) {
                let temp = await getUniversityData(user.rows[0].id);
                data = {...data, ...temp}
            }
            return res.json(data);
        } else {
            return res.status(404).send('User not found.');
        }
    } catch (error) {
        console.error('Error fetching user account:', error);
        return res.status(500).send('Error fetching user account.');
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
            let data = await getUserData(req.user.id);
            res.json(data);
        } else {
            res.status(404).send('User not found.');
        }
    } catch (error) {
        console.error('Error fetching user account:', error);
        res.status(500).send('Error fetching user account.');
    }
});

router.post(`/${prefix}/profile`, [
        body('attributes')
            .notEmpty()
            .withMessage('User attributes must not be empty.'),
    ],
    authenticate,
    async (req, res) => {
        const errors = validationResult(req);
        console.log(errors)
        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        const {attributes} = req.body;
        console.log(attributes)

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
            let mergedAttributes = userAttributes;
            if (user.rows[0].role_id == 2) {
                mergedAttributes = mergedAttributes.concat(universityAttributes);
            }
            for (let i = 0; i < mergedAttributes.length; i++) {
                const key = mergedAttributes[i];
                if (user.rows[0][key] !== undefined && Object.keys(attributes).includes(key)) {
                    await db.query(
                        `update users
                         set ${key} = $1
                         where id = $2`,
                        [attributes[key], req.user.id,]
                    );
                } else if (Object.keys(attributes).includes(key)) {
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
            let data = await getUserData(req.user.id);
            if (user.rows[0].role_id == 2) {
                let temp = await getUniversityData(user.rows[0].id);
                data = {...data, ...temp}
            }
            console.log(321)
            return res.json(data);
        } catch (error) {
            console.error('Error updating user account:', error);
            res.status(500).send('Error updating user account.');
        }
    });
// Update account route (authenticated)

router.put('/account', authenticate, async (req, res) => {
    const {companyName} = req.body;

    if (!companyName) {
        return res.status(400).send('Company name is required.');
    }

    try {
        const result = await db.query('UPDATE users SET name = $1 WHERE users.id = $2 RETURNING *', [companyName, req.user.id]);

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

router.post(`/${prefix}/sign-xml-with-ds`, [body('xml')
        .notEmpty()
        .withMessage('xml is required.')
    ],
    authenticate, async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }
        const {xml, signed_by} = req.body;

        try {
            const user = await db.query(`
                SELECT *
                FROM users
                         INNER JOIN roles ON users.role_id = roles.id
                WHERE users.id = $1
            `, [req.user.id]);

            if (user.rows.length > 0) {
                db.query(`INSERT INTO signed_xmls(user_id, value, signed_by)
                          values ($1, $2, $3)`, [req.user.id, xml, signed_by,])
                return res.json("success");
            } else {
                return res.status(404).send('User not found.');
            }
        } catch (error) {
            console.error('Error fetching user account:', error);
            return res.status(500).send('Error fetching user account.');
        }
    });

const getFavoriteDiplomas = async (user_id) => {
    const favoriteDiplomas = await db.query(
        `
            SELECT *
            FROM favorite_diplomas
            WHERE user_id = $1
        `,
        [user_id]
    );

    const diplomaIds = favoriteDiplomas.rows.map((diploma) => diploma.diploma_id);

    const diplomas = await db.query(
        `
            SELECT *
            FROM diplomas
            WHERE id = ANY ($1)
        `,
        [diplomaIds]
    );

    return diplomas.rows;
}

router.post(
    `/${prefix}/favorite-diplomas/toogle`,
    [
        body("diploma_id").notEmpty().withMessage("Diploma ID is required."),
    ],
    authenticate,
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        const {diploma_id} = req.body;

        try {
            const user = await db.query(
                `
                    SELECT *
                    FROM users
                    WHERE id = $1
                `,
                [req.user.id]
            );

            if (user.rows.length <= 0) {
                return res.status(404).send("User not found.");
            }

            const favoriteDiploma = await db.query(
                `
                    SELECT *
                    FROM favorite_diplomas
                    WHERE user_id = $1
                      AND diploma_id = $2
                `,
                [req.user.id, diploma_id]
            );

            if (favoriteDiploma.rows.length > 0) {
                db.query(
                    `
                        DELETE
                        FROM favorite_diplomas
                        WHERE user_id = $1
                          AND diploma_id = $2
                    `,
                    [req.user.id, diploma_id]
                );

                const diplomas = await getFavoriteDiplomas(req.user.id);
                return res.status(200).json(diplomas);
            }

            db.query(
                `INSERT INTO favorite_diplomas(user_id, diploma_id, created_at)
                 values ($1, $2, $3)`,
                [req.user.id, diploma_id, new Date()]
            );

            const diplomas = await getFavoriteDiplomas(req.user.id);
            return res.status(200).json(diplomas);

        } catch (error) {
            console.error("Error adding favorite diploma:", error);
            return res.status(500).send("Error adding favorite diploma.");
        }
    });

router.get(
    `/${prefix}/favorite-diplomas/get`,
    authenticate,
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        try {
            const user = await db.query(
                `
                    SELECT *
                    FROM users
                    WHERE id = $1
                `,
                [req.user.id]
            );

            if (user.rows.length <= 0) {
                return res.status(404).send("User not found.");
            }

            const diplomas = await getFavoriteDiplomas(req.user.id);

            return res.status(200).json(diplomas);

        } catch (error) {
            console.error("Error getting favorite diplomas:", error);
            return res.status(500).send("Error getting favorite diplomas.");
        }
    }
);

router.get(
    `/${prefix}/universities/get`, async (req, res) => {
        try {
            const users = await db.query(
                `
                    SELECT *
                    FROM users
                    WHERE role_id = 2
                `
            );

            for (let i = 0; i < users.rows.length; i++) {
                let data = await getUserData(users.rows[i].id);
                let temp = await getUniversityData(users.rows[i].id);
                data = {...data, ...temp}
                users.rows[i] = data;
            }

            return res.status(200).json(users.rows);
        } catch (error) {
            console.error("Error getting users:", error);
            return res.status(500).send("Error getting users.");
        }
    });

router.put(
    `/${prefix}/visibility`,
    authenticate,
    async (req, res) => {
        console.log('hello visible');
        console.log(req.body.visibility);
        try {
            const user = await db.query(`
                SELECT users.id, role_id
                FROM users
                         INNER JOIN roles ON users.role_id = roles.id
                WHERE users.id = $1
            `, [req.user.id]);

            console.log(user.rows);

            if (user.rows.length > 0) {
                let role = user.rows[0].role_id;

                if (role == 3) {
                    console.log('user is student');
                    const query = `UPDATE diplomas
                                   SET visibility = $1
                                   WHERE id = $2 RETURNING *`;
                    const result = await db.query(query, [req.body.visibility, user.rows[0].id]);
                    console.log(result.rows);

                    if (result.rows.length > 0) {
                        return res.status(200).send({message: 'User updated successfully.'});
                    } else {
                        return res.status(404).send('User not found.');
                    }

                } else {
                    return res.status(404).send('User not found.');
                }
            } else {
                return res.status(404).send('User not found.');
            }

        } catch (error) {
            console.error("Error updating user visibility:", error);
            return res.status(500).send("Error updating user visibility.");
        }
    }
)

router.get(
    `/${prefix}/employers/get`, async (req, res) => {
        try {
            const users = await db.query(
                `
                    SELECT *
                    FROM users
                    WHERE role_id = 1
                `
            );

            for (let i = 0; i < users.rows.length; i++) {
                let data = await getEmployerData(users.rows[i].id);
                // let temp = await getUniversityData(users.rows[i].id);
                users.rows[i] = data;
            }

            return res.status(200).json(users.rows);
        } catch (error) {
            console.error("Error getting users:", error);
            return res.status(500).send("Error getting users.");
        }
    });