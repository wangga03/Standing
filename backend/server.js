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
    const { groupId, name, logo, win, draw, lose, gf, ga } = req.body;
    try {
        await pool.query(
            'UPDATE teams SET groupId = ?, name = ?, logo = ?, win = ?, draw = ?, lose = ?, gf = ?, ga = ? WHERE id = ?',
            [groupId, name, logo || '', win || 0, draw || 0, lose || 0, gf || 0, ga || 0, id]
        );
        res.json({ id, groupId, name, logo, win, draw, lose, gf, ga });
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

// --- MATCHES ENDPOINTS ---

// Helper to recalculate team stats
async function recalculateTeamStats(teamId) {
    // Sum matches where team is team1
    const [matches1] = await pool.query('SELECT * FROM matches WHERE team1Id = ?', [teamId]);
    // Sum matches where team is team2
    const [matches2] = await pool.query('SELECT * FROM matches WHERE team2Id = ?', [teamId]);
    
    let win = 0, draw = 0, lose = 0, gf = 0, ga = 0;

    for (const m of matches1) {
        gf += m.team1Score;
        ga += m.team2Score;
        if (m.team1Score > m.team2Score) win++;
        else if (m.team1Score === m.team2Score) draw++;
        else lose++;
    }

    for (const m of matches2) {
        gf += m.team2Score;
        ga += m.team1Score;
        if (m.team2Score > m.team1Score) win++;
        else if (m.team2Score === m.team1Score) draw++;
        else lose++;
    }

    // Update team
    await pool.query(
        'UPDATE teams SET win = ?, draw = ?, lose = ?, gf = ?, ga = ? WHERE id = ?',
        [win, draw, lose, gf, ga, teamId]
    );
}

// Get all matches
app.get('/api/matches', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM matches ORDER BY matchDate DESC, matchTime DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a match
app.post('/api/matches', async (req, res) => {
    const { id, groupId, team1Id, team2Id, team1Score, team2Score, matchDate, matchTime } = req.body;
    try {
        await pool.query(
            'INSERT INTO matches (id, groupId, team1Id, team2Id, team1Score, team2Score, matchDate, matchTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, groupId, team1Id, team2Id, team1Score, team2Score, matchDate, matchTime]
        );
        
        // Recalculate stats for both teams
        await recalculateTeamStats(team1Id);
        await recalculateTeamStats(team2Id);

        res.json(req.body);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Edit a match
app.put('/api/matches/:id', async (req, res) => {
    const { id } = req.params;
    const { groupId, team1Id, team2Id, team1Score, team2Score, matchDate, matchTime } = req.body;
    try {
        // Find old match to know which teams to recalculate if teams were changed
        const [oldMatchRows] = await pool.query('SELECT * FROM matches WHERE id = ?', [id]);
        if (oldMatchRows.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }
        const oldMatch = oldMatchRows[0];

        await pool.query(
            'UPDATE matches SET groupId = ?, team1Id = ?, team2Id = ?, team1Score = ?, team2Score = ?, matchDate = ?, matchTime = ? WHERE id = ?',
            [groupId, team1Id, team2Id, team1Score, team2Score, matchDate, matchTime, id]
        );
        
        // Recalculate stats for old and new teams in case they were changed
        const teamsToUpdate = new Set([oldMatch.team1Id, oldMatch.team2Id, team1Id, team2Id]);
        for (const tid of teamsToUpdate) {
            await recalculateTeamStats(tid);
        }

        res.json({ id, groupId, team1Id, team2Id, team1Score, team2Score, matchDate, matchTime });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a match
app.delete('/api/matches/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Find the match first to know which teams to recalculate
        const [matchRows] = await pool.query('SELECT * FROM matches WHERE id = ?', [id]);
        if (matchRows.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        const match = matchRows[0];
        await pool.query('DELETE FROM matches WHERE id = ?', [id]);
        
        // Recalculate stats for both teams
        await recalculateTeamStats(match.team1Id);
        await recalculateTeamStats(match.team2Id);
        
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
