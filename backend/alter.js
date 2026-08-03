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

async function alter() {
    try {
        const conn = await mysql.createConnection(dbConfig);
        await conn.execute('ALTER TABLE teams MODIFY COLUMN logo MEDIUMTEXT');
        console.log('Successfully altered logo column to MEDIUMTEXT');
        await conn.end();
    } catch (e) {
        console.error('Error:', e.message);
    }
}

alter();
