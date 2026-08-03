require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend files directly to avoid CORS/file:// issues
app.use(express.static(path.join(__dirname, '../frontend')));

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USERNAME?.replace(/'/g, ''),
    password: process.env.DB_PASSWORD?.replace(/'/g, ''),
    database: process.env.DB_DATABASE?.replace(/'/g, ''),
    ssl: { rejectUnauthorized: true }
};

let pool;
async function initDb() {
    pool = mysql.createPool(dbConfig);
}
initDb();

// Get all groups
app.get('/api/groups', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM \`groups\`');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a group
app.post('/api/groups', async (req, res) => {
    const { id, name } = req.body;
    try {
        await pool.query('INSERT INTO \`groups\` (id, name) VALUES (?, ?)', [id, name]);
        res.json({ id, name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a group
app.delete('/api/groups/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM \`groups\` WHERE id = ?', [id]);
        await pool.query('DELETE FROM teams WHERE groupId = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all teams
app.get('/api/teams', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM teams');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a team
app.post('/api/teams', async (req, res) => {
    const { id, groupId, name, logo, win, draw, lose, gf, ga } = req.body;
    try {
        await pool.query(
            'INSERT INTO teams (id, groupId, name, logo, win, draw, lose, gf, ga) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, groupId, name, logo || '', win || 0, draw || 0, lose || 0, gf || 0, ga || 0]
        );
        res.json(req.body);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a team
app.put('/api/teams/:id', async (req, res) => {
    const { id } = req.params;
    const { name, logo, win, draw, lose, gf, ga } = req.body;
    try {
        await pool.query(
            'UPDATE teams SET name = ?, logo = ?, win = ?, draw = ?, lose = ?, gf = ?, ga = ? WHERE id = ?',
            [name, logo || '', win || 0, draw || 0, lose || 0, gf || 0, ga || 0, id]
        );
        res.json({ id, name, logo, win, draw, lose, gf, ga });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a team
app.delete('/api/teams/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM teams WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
