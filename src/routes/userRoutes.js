const express = require('express');
const {authenticate} = require('../middleware/authenticate');
const db = require('../config/database');
const analytics_Button = 3;
const router = require('./router');
const {body, validationResult} = require("express-validator");
const {json} = require("express");
const bcrypt = require('bcryptjs');
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
    "diploma_iin",
    "diploma_phone",
    "diploma_email",
    "diploma_gpa",
    "diploma_region",
    "diploma_gender",
    "diploma_nationality",
    "diploma_faculty",
    "diploma_diploma_total",
    "diploma_smart_contract_cid",
    "faculty",
    "subjectsHigher",
    "subjectsStandard",
    "additionalSubjects",
    "grade",

    "diploma_student_id",
    "diploma_date_of_birth",
    "diploma_Number",
    "diploma_degree",
    "diploma_protocol_number",
    "diploma_grant",
    "diploma_diploma",
    "diploma_with_honor",
    "diploma_city",


]
const prefix = "users";
const userResumeAttributes = [
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
    "year_of_arrival",
    "graduation_year",
    "company_name",
    "experience_start",
    "experience_end",
    'experience_still_working',
    "desired_job_position",
    "responsibility",
    "certificates",
    "program",
    "publish_year",
    "field",
    "certificate_name",
]
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
    ...userResumeAttributes
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
const employerAttributes = [
    'avatar',
    'field',
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
        from users
        where users.university_id = $1`, [user.rows[0].university_id]);

    if (university.rows.length) {
        data['university_name'] = university.rows[0].name;
    }

    return data;
}

const getEmployersData = async (userIds) => {
    const usersData = await db.query(`
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
        WHERE users.id = ANY($1::int[])
    `, [userIds]);

    const userMap = new Map(usersData.rows.map(user => [user.id, user]));

    const attributesData = await db.query(`
        SELECT content_id, type, value
        FROM content_fields
        WHERE content_id = ANY($1::int[])
    `, [userIds]);

    for (let attr of attributesData.rows) {
        if (!userMap.get(attr.content_id)[attr.type]) {
            userMap.get(attr.content_id)[attr.type] = attr.value;
        }
    }

    return Array.from(userMap.values());
};

const getDiplomaData = async (user_id) => {
    const diploma = await db.query(`
        SELECT *
        FROM diplomas
        WHERE user_id = $1
    `, [user_id]);

    if (!diploma.rows.length) {
        return [];
    }
    let data = diploma.rows[0];

    for (let i = 0; i < diplomaAttributes.length; i++) {

        const key = diplomaAttributes[i];
        if (diploma.rows[0][key] !== undefined) continue;
        let attr = await db.query('select * from content_fields where content_id = $1 and type = $2 and deleted_at IS NULL', [data.id, key]);
        try {
            data[key] = attr.rows.length ? JSON.parse(attr.rows[0].value) : null;
        } catch (e) {
            data[key] = attr.rows.length ? attr.rows[0].value : null;
        }
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

const changePassword = async (oldPass, newPass, reNewPass, email) => {
    if (newPass !== reNewPass) {
        return;
    }

    try { 
        const user = await db.query('SELECT *, users.id FROM users INNER JOIN roles ON users.role_id = roles.id WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            console.error('User not found.');
            return;
        }

        if (!user.rows[0].password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPass, salt);
            db.query('UPDATE users set password = $1 where id = $2', [hashedPassword, user.rows[0]['id']]);
            return;
        } else {
            if (!oldPass) {
                console.error('All fields are required.');
                return;
            }
            const validPassword = await bcrypt.compare(oldPass, user.rows[0].password);
            if (!validPassword) {
                console.error('Invalid password.');
                return;
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPass, salt);
            db.query('UPDATE users set password = $1 where id = $2', [hashedPassword, user.rows[0]['id']]);        
        }
    } catch (error) {
        console.error('Error updating user password:', error);
        return;
    }

    console.log('gone through all of this');
};

const upload = multer({storage, fileFilter});

const multiparty = require('multiparty');
const http = require('http');
const util = require('util');
const generatePdf = require("../pdf");
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
            SELECT users.id, users.role_id, users.university_id
            FROM users
                     INNER JOIN roles ON users.role_id = roles.id
            WHERE users.id = $1
        `, [req.user.id]);

        if (user.rows.length > 0) {
            let data = await getUserData(req.user.id);
            let role = user.rows[0].role_id;
            let newData = {};
            if (role == 3 || role == "3") {
                let temp = await getDiplomaData(user.rows[0].id);
                data = {...data, ...temp}
            }
            if (role == 2) {
                let temp = await getUniversityData(user.rows[0].id);
                data = {...data, ...temp}
            }
            /* university name start */
            const university = await db.query(`
                SELECT *
                FROM users
                WHERE university_id = $1
                  AND role_id = 2
            `, [user.rows[0].university_id,]);
            if (university.rows.length) {
                data['university_name'] = university.rows[0].name;
            }
            return res.json(data);
        } else {
            return res.status(404).send('User not found.');
        }
    } catch (error) {
        console.error('Error fetching user account:', error);
        return res.status(500).send('Error fetching user account.' + error);
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
        console.log('Entered the profile!')
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
                            'insert into content_fields(content_id, type, value, created_at) values ($1, $2, $3, $4)', //need to copy
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

            if(attributes['newPassword'] && attributes['rePassword']){
                changePassword(attributes['password'], attributes['newPassword'], attributes['rePassword'], attributes['email']);
            }

            let data = await getUserData(req.user.id);
            if (user.rows[0].role_id == 2) {
                let temp = await getUniversityData(user.rows[0].id);
                data = {...data, ...temp}
            }
            if (user.rows[0].role_id == 3) {
                let temp = await getDiplomaData(user.rows[0].id);
                data = {...data, ...temp}
            }
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
            const users = await db.query(`SELECT *
                                          FROM users
                                          WHERE role_id = 1`);
            
            if (!users.rows.length) {
                return res.status(200).json([]);
            }

            const userIds = users.rows.map(user => user.id);

            const employersData = await getEmployersData(userIds);

            return res.status(200).json(employersData);
        } catch (error) {
            console.error("Error getting users:", error);
            return res.status(500).send("Error getting users.");
        }
    }
);

router.get(
    `/${prefix}/employers/search`,
    [
        body('field')
            .optional()
            .isArray()
            .withMessage('Field must be an array.')
            .isString()
            .withMessage('Field must be a string.'),
        body('text')
            .optional()
            .isString()
            .withMessage('Name must be a string.'),
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }

        console.log(req.query);

        const field = req.query.field;
        const name = req.query.text;

        let contentIds = [0];

        try {
            fieldsQuery = await db.query(`
                SELECT content_id
                FROM content_fields
                WHERE type = 'field'
                  AND value = $1`, [field]);

            if (fieldsQuery && fieldsQuery.rows && fieldsQuery.rows.length) {
                let ids = fieldsQuery.rows.map(row => parseInt(row.content_id))

                if (contentIds.includes(0)) {
                    contentIds = ids;
                } else {
                    contentIds = ids.filter(value => contentIds.includes(value))
                }
            }

            console.log(contentIds);

            let query = `SELECT name
                         FROM users
                         WHERE role_id = 1
                           AND id = ANY ($1)`;

            let names = [];
            let employers = [];

            if (name && name.length > 0 && contentIds.includes(0)){
                query = `SELECT name
                            FROM users
                            WHERE role_id = 1
                            AND name ILIKE ($1)`;

                employers = await db.query(query, [`%${name}%`]);
                names = employers.rows;
                console.log(names);
                return res.status(200).json(names);
            } else if (name && name.length > 0 && !contentIds.includes(0)) {
                query = `SELECT name
                            FROM users
                            WHERE role_id = 1
                            AND id = ANY ($1)
                            AND name ILIKE ($2)`;

                employers = await db.query(query, [contentIds, `%${name}%`]);
                names = employers.rows;
                console.log(names);
                return res.status(200).json(names);
            }

            employers = await db.query(query, [contentIds]);

            names = employers.rows;
            console.log(names);
            return res.status(200).json(names);
        } catch (error) {
            console.error("Error searching employers:", error);
            return res.status(500).send("Error searching employers.");
        }
    }
);

router.get(
    `/${prefix}/employers/:user_id`,
    async (req, res) => {

        const user_id = req.params.user_id;

        try {
            if (!user_id) {
                return res.status(400).json({"error": `diploma_id is required after ${prefix}/ must be diploma_id (number)`})
            }

            const user = await db.query(`
                SELECT users.id, role_id
                FROM users
                         INNER JOIN roles ON users.role_id = roles.id
                WHERE users.id = $1
                  AND role_id = 1
            `, [user_id]);

            if (user.rows.length > 0) {
                let data = await getUserData(user_id);
                return res.json(data);
            } else {
                return res.status(404).send('User not found.');
            }
        } catch (error) {
            console.error("Error searching universities:", error);
            return res.status(500).send("Error searching universities.");
        }
    }
);

router.get(
    `/${prefix}/resume-generate`,
    authenticate,
    async (req, res) => {
        try {
            let data = await getUserData(req.user.id);
            let temp = await getDiplomaData(req.user.id);
            data = {...data, ...temp}
            let timeValues = {
                "full": "Полная занятость",
                "partly": "Частичная занятость",
                "project": "Проектная работа",
                "intern": "Стажировка",
            }
            let sample = {
                "fullname": `${data["last_name"]} ${data["first_name"]} ${data["middle_name"]}`,
                "avatar": data["avatar"],
                "position": data["desired_position"],
                "salary": data["desired_salary_amount"] + "₸",
                "time": timeValues[data["desired_schedule"]],
                "dateOfBirth": data["date_of_birth"],
                "phone": data["phone"],
                "email": data["email"],
                "address": data["address"],
                "telegram": data["telegram"],
                "skills": JSON.parse(data["skills"]),
                "education": {
                    "name": data["university_name"],
                    "date_to": data["year"],
                    "speciality": data["speciality_ru"]
                },
                "experience": {
                    "name": data["company_name"],
                    "job_title": data["desired_job_position"],
                    "date_from": data["experience_start"],
                    "date_to": data["experience_still_working"] ? null : data["experience_end"],
                    "job_description": data["responsibility"] ?? "",
                },
                "certificate": {
                    "name": data["certificate_name"],
                    "dates": data["publish_year"],
                    "description": data["program"],
                }
            };
            let link = await generatePdf(sample);
            return res.json(link);

        } catch (error) {
            console.log(error)
            return res.status(500).send(`Error ${error}`);
        }
    })
;
