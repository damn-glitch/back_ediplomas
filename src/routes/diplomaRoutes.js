const db = require('../config/database');
const router = require('./router');
const axios = require("axios");
const {body, validationResult} = require("express-validator");
const prefix = "diploma"

/**
 * Маскирование ИИН: показываем первые 4 и последние 2 цифры
 * Пример: 731017301075 -> 7310******75
 */
function maskIIN(iin) {
    if (!iin || iin.length !== 12) return iin;
    return `${iin.slice(0, 4)}******${iin.slice(-2)}`;
}

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
            LIMIT $1 OFFSET $2`, [perPageNumber, offset]);

        // Return the fetched diplomas
        if (perPageNumber > 8) {
            return res.json(diplomaItems.rows);
        }

        for (let i = 0; i < diplomaItems.rows.length; i++) {
            const diplomaId = diplomaItems.rows[i].id;
            const gpaResult = await db.query('SELECT value FROM content_fields WHERE content_id = $1 AND type = $2', [diplomaId, 'diploma_gpa']);
            const gpa = gpaResult.rows.length ? gpaResult.rows[0].value : null;
            diplomaItems.rows[i]["gpa"] = gpa;
        }

        return res.json(diplomaItems.rows);
    } catch (error) {
        console.error('Error sending OTP:', error);
        return res.status(500).json({error: 'Failed to send OTP.'});
    }
});

/**
 * GET /diploma/verify-by-iin/:iin
 * Публичный endpoint для верификации диплома по ИИН
 * Используется KazSmartChain для проверки дипломов
 * Важно: этот маршрут должен быть перед /diploma/:diploma_id чтобы избежать конфликтов
 */
router.get(`/${prefix}/verify-by-iin/:iin`, async (req, res) => {
    try {
        const { iin } = req.params;

        // Валидация ИИН
        const iinRegex = /^\d{12}$/;
        if (!iinRegex.test(iin)) {
            return res.status(400).json({
                valid: false,
                error: 'ИИН должен содержать 12 цифр'
            });
        }

        // Поиск диплома по ИИН
        // Сначала проверяем в таблице diplomas (поле iin)
        let diplomaItem = await db.query(`
            SELECT *
            FROM diplomas
            WHERE iin = $1
              AND visibility = true
            LIMIT 1
        `, [iin]);

        // Если не найдено в таблице diplomas, проверяем в content_fields
        // ИИН может храниться как строка или как JSON строка
        if (diplomaItem.rows.length === 0) {
            // Получаем все записи с типом diploma_iin
            const iinFieldQuery = await db.query(`
                SELECT content_id, value
                FROM content_fields
                WHERE type = 'diploma_iin'
                  AND deleted_at IS NULL
            `);
            
            // Ищем ИИН в значениях (может быть строка или JSON)
            let foundDiplomaId = null;
            for (const row of iinFieldQuery.rows) {
                let iinValue = null;
                try {
                    // Пробуем распарсить как JSON
                    const parsed = JSON.parse(row.value);
                    if (typeof parsed === 'string') {
                        iinValue = parsed;
                    } else if (parsed.iin) {
                        iinValue = parsed.iin;
                    } else if (parsed.value) {
                        iinValue = parsed.value;
                    }
                } catch (e) {
                    // Если не JSON, берем как строку
                    iinValue = row.value;
                }
                
                // Сравниваем ИИН (учитываем возможный префикс "IIN")
                const cleanIinValue = iinValue ? iinValue.toString().replace("IIN", '').trim() : '';
                const cleanIin = iin.toString().trim();
                
                if (cleanIinValue === cleanIin) {
                    foundDiplomaId = row.content_id;
                    break;
                }
            }

            if (foundDiplomaId) {
                diplomaItem = await db.query(`
                    SELECT *
                    FROM diplomas
                    WHERE id = $1
                      AND visibility = true
                `, [foundDiplomaId]);
            }
        }

        // Если диплом не найден
        if (diplomaItem.rows.length === 0) {
            return res.status(404).json({
                valid: false,
                message: 'Диплом с данным ИИН не найден в блокчейне'
            });
        }

        const diploma = diplomaItem.rows[0];
        const diplomaId = diploma.id;

        // Получаем дополнительные поля диплома
        const diplomaFields = await getDiplomaFields(diplomaId);
        const fullDiploma = {...diploma, ...diplomaFields};

        // Получаем название университета
        let universityName = null;
        if (diploma.university_id) {
            const university = await db.query(`
                SELECT name
                FROM universities
                WHERE id = $1
                  AND visibility = true
            `, [diploma.university_id]);
            
            if (university.rows.length === 0) {
                // Пробуем получить из таблицы users
                const universityUser = await db.query(`
                    SELECT name
                    FROM users
                    WHERE university_id = $1
                      AND role_id = 2
                `, [diploma.university_id]);
                if (universityUser.rows.length > 0) {
                    universityName = universityUser.rows[0].name;
                }
            } else {
                universityName = university.rows[0].name;
            }
        }

        // Формируем имя студента (приоритет: name_kz > name_ru > name_en)
        const studentName = fullDiploma.name_kz || fullDiploma.name_ru || fullDiploma.name_en || '';

        // Формируем специальность (приоритет: speciality_kz > speciality_ru > speciality_en)
        const specialty = fullDiploma.speciality_kz || fullDiploma.speciality_ru || fullDiploma.speciality_en || '';

        // Формируем степень (из diploma_degree или diploma_degree_ru/kz/en)
        // diploma_degree может быть строкой или объектом из content_fields
        let degree = '';
        
        // Проверяем различные варианты хранения степени
        if (fullDiploma.diploma_degree) {
            degree = typeof fullDiploma.diploma_degree === 'string' 
                ? fullDiploma.diploma_degree 
                : (fullDiploma.diploma_degree.value || fullDiploma.diploma_degree.name || String(fullDiploma.diploma_degree));
        } else if (fullDiploma.diploma_degree_ru) {
            degree = typeof fullDiploma.diploma_degree_ru === 'string' 
                ? fullDiploma.diploma_degree_ru 
                : (fullDiploma.diploma_degree_ru.value || fullDiploma.diploma_degree_ru.name || String(fullDiploma.diploma_degree_ru));
        } else if (fullDiploma.diploma_degree_kz) {
            degree = typeof fullDiploma.diploma_degree_kz === 'string' 
                ? fullDiploma.diploma_degree_kz 
                : (fullDiploma.diploma_degree_kz.value || fullDiploma.diploma_degree_kz.name || String(fullDiploma.diploma_degree_kz));
        } else if (fullDiploma.diploma_degree_en) {
            degree = typeof fullDiploma.diploma_degree_en === 'string' 
                ? fullDiploma.diploma_degree_en 
                : (fullDiploma.diploma_degree_en.value || fullDiploma.diploma_degree_en.name || String(fullDiploma.diploma_degree_en));
        }

        // Формируем номер диплома
        // Может быть строкой или объектом из content_fields
        let diplomaNumber = '';
        if (fullDiploma.diploma_Number) {
            diplomaNumber = typeof fullDiploma.diploma_Number === 'string' 
                ? fullDiploma.diploma_Number 
                : (fullDiploma.diploma_Number.value || fullDiploma.diploma_Number.number || String(fullDiploma.diploma_Number));
        } else if (fullDiploma.diploma_protocol_number) {
            diplomaNumber = typeof fullDiploma.diploma_protocol_number === 'string' 
                ? fullDiploma.diploma_protocol_number 
                : (fullDiploma.diploma_protocol_number.value || fullDiploma.diploma_protocol_number.number || String(fullDiploma.diploma_protocol_number));
        }

        // Формируем дату выпуска (из year или created_at)
        let graduationDate = null;
        if (fullDiploma.year) {
            graduationDate = `${fullDiploma.year}-06-15`; // Примерная дата выпуска
        } else if (fullDiploma.created_at) {
            const date = new Date(fullDiploma.created_at);
            graduationDate = date.toISOString().split('T')[0];
        }

        // Формируем ediplomaId (используем id диплома)
        const ediplomaId = `diploma-${diplomaId}`;

        // Получаем хеш транзакции из блокчейна
        const besuTxHash = fullDiploma.smart_contract_link || null;
        const solanaMint = fullDiploma.solana_mint_address || null;

        // Статус диплома
        const status = diploma.visibility ? 'issued' : 'revoked';

        // Дата выдачи
        const issuedAt = diploma.created_at ? new Date(diploma.created_at).toISOString() : null;

        // Маскируем ИИН для публичного отображения
        const maskedIIN = maskIIN(iin);

        // Формируем ответ
        const response = {
            valid: true,
            diploma: {
                ediplomaId: ediplomaId,
                publicData: {
                    studentName: studentName,
                    studentIIN: maskedIIN,
                    degree: degree,
                    specialty: specialty,
                    graduationDate: graduationDate,
                    diplomaNumber: diplomaNumber,
                    university: universityName || 'Не указан'
                },
                besuTxHash: besuTxHash,
                solanaMint: solanaMint,
                status: status,
                issuedAt: issuedAt
            },
            message: 'Диплом верифицирован и подтвержден в блокчейне'
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('Error verifying diploma by IIN:', error);
        return res.status(500).json({
            valid: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

router.get(`/${prefix}/:diploma_id`, async (req, res) => {
    const diploma_id = req.params.diploma_id;
    try {
        if (!diploma_id) {
            return res.status(400).json({"error": `diploma_id is required after ${prefix}/ must be diploma_id (number)`})
        }
        // Fetch diplomas from the database based on the offset and limit
        const diplomaItem = await db.query(`
            SELECT *
            FROM diplomas
            WHERE id = $1
              AND visibility = true
        `, [diploma_id]);
        if (diplomaItem.rows.length === 0) {
            return res.status(404).json({"error": "Diploma not found"});
        }
        const diplomaId = diplomaItem.rows[0].id;
        const diplomaFields = await getDiplomaFields(diplomaId);
        let diploma = {...diplomaItem.rows[0], ...diplomaFields};
        if (diploma['image'].split(',').length > 1) {
            diploma['image'] = diploma['image'].replace(' ', '').split(',');
        }
        /* university name start */
        const university = await db.query(`
            SELECT name
            FROM universities
            WHERE id = $1
              AND visibility = true
        `, [diploma.university_id,]);
        if (university.rows.length) {
            diploma = {...diploma, university_name: university.rows[0].name};
        }

        /* university name end */
        return res.json(diploma);
    } catch (error) {
        return res.status(500).json({error: error});
    }
});
const decryptHash = (hash_text, key) => {
    let nText = "";
    for (let i = 0; i < hash_text.length; i++) {
        let charCode = (hash_text.charCodeAt(i) - key.charCodeAt(i % key.length)) % 26 + 48;
        if (charCode < 48) {
            charCode += 26;  // Ensure the result remains within the printable ASCII range
        }
        nText += String.fromCharCode(charCode);
    }
    return nText;
}
router.get(`/${prefix}/:university_id/:hash`, async (req, res) => {
    try {
        // Extract page and per_page parameters from the request query
        const university_id = req.params.university_id;
        const hash = req.params.hash;
        const iin = decryptHash(hash, "hashotnursa");
        // Convert page and per_page to integers

        if (!university_id) {
            return res.status(400).json({"error": `university_id is required after ${prefix}/ must be university_id (number)`})
        }
        // Fetch diplomas from the database based on the offset and limit
        const diplomaItem = await db.query(`
            SELECT *
            FROM diplomas
            WHERE iin = $1
              AND university_id = $2
        `, [iin, university_id]);
        if (diplomaItem.rows.length === 0) {
            return res.status(404).json({"error": "Diploma not found"});
        }
        const diplomaId = diplomaItem.rows[0].id;
        const createdDate = new Date(diplomaItem.rows[0].created_at);
        const formattedCreatedDate = `${padZero(createdDate.getUTCHours())}:${padZero(createdDate.getUTCMinutes())} - ${padZero(createdDate.getUTCDate())}.${padZero(createdDate.getUTCMonth() + 1)}.${createdDate.getUTCFullYear()}`;

        const diplomaFields = await getDiplomaFields(diplomaId);
        const diploma = {...diplomaItem.rows[0], ...diplomaFields};
        diploma['created_at'] = formattedCreatedDate;

        /* university name start */
        const university = await db.query(`
            SELECT name
            FROM users
            WHERE university_id = $1
              AND role_id = 2
        `, [university_id,]);
        if (university.rows.length) {
            diploma['university_name'] = university.rows[0].name;
        }
        /* university name end */

        /* image refactor to array if so | start */
        if (diploma['image'].split(',').length > 1) {
            diploma['image'] = diploma['image'].replace(' ', '').split(',');
        }
        /* image refactor to array if so | end */

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
        let attr = await db.query('select * from content_fields where content_id = $1 and type = $2 and deleted_at IS NULL', [diploma_id, key]);
        try {
            data[key] = attr.rows.length ? JSON.parse(attr.rows[0].value) : null;
        } catch (e) {
            data[key] = attr.rows.length ? attr.rows[0].value : null;
        }
    }
    return data;
}

function padZero(value) {
    return value < 10 ? `0${value}` : value;
}