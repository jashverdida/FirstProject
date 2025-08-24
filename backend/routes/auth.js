const express = require('express');
const bcrypt = require('bcryptjs');
const { dbAsync } = require('../database/config');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user in database
        const user = await dbAsync.get(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register endpoint (admin only in real implementation)
router.post('/register', async (req, res) => {
    try {
        const { username, password, role = 'cashier' } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insert user
        await dbAsync.insert(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );

        res.json({ message: 'User created successfully' });

    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
