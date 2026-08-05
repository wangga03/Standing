require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USERNAME?.replace(/'/g, ''),
    password: process.env.DB_PASSWORD?.replace(/'/g, ''),
    database: process.env.DB_DATABASE?.replace(/'/g, ''),
    ssl: { rejectUnauthorized: true }
};

async function init() {
    try {
        console.log('Connecting to TiDB via mysql2...');
        const conn = await mysql.createConnection(dbConfig);
        
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS \`groups\` (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            )
        `);
        console.log('Table "groups" checked/created.');

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS teams (
                id VARCHAR(255) PRIMARY KEY,
                groupId VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                logo TEXT,
                win INT DEFAULT 0,
                draw INT DEFAULT 0,
                lose INT DEFAULT 0,
                gf INT DEFAULT 0,
                ga INT DEFAULT 0
            )
        `);
        console.log('Table "teams" checked/created.');
        
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS matches (
                id VARCHAR(255) PRIMARY KEY,
                groupId VARCHAR(255) NOT NULL,
                team1Id VARCHAR(255) NOT NULL,
                team2Id VARCHAR(255) NOT NULL,
                team1Score INT NOT NULL,
                team2Score INT NOT NULL,
                matchDate DATE NOT NULL,
                matchTime TIME NOT NULL
            )
        `);
        console.log('Table "matches" checked/created.');

        console.log('Initialization complete.');
        await conn.end();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

init();
