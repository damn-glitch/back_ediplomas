const express = require('express');
const { authenticate } = require('../middleware/auth'); 
const db = require('../config/database'); 

const router = express.Router();

router.get('/account', authenticate, async (req, res) => {
    try {
        const user = await db.query(`
            SELECT id, email, company_name, role_id
            FROM users
            INNER JOIN roles ON users.role_id = roles.id
            WHERE id = $1
        `, [req.user.id]);

        if (user.rows.length > 0) {
            const userData = {
                id: user.rows[0].id,
                email: user.rows[0].email,
                companyName: user.rows[0].company_name,
                analyticsButton: user.rows[0].role_id === 3
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

// Update account route (authenticated)
app.put('/account', authenticate, async (req, res) => {
    const {companyName} = req.body;

    if (!companyName) {
        return res.status(400).send('Company name is required.');
    }

    try {
        const result = await db.query(
            'UPDATE users SET company_name = $1 WHERE id = $2 RETURNING *',
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

module.exports = router;

