const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const TOKEN = '8542356222:AAHSpAkfAYAcIK0DPVc1aBMTdeAv-BIviDw';
const CHAT_ID = '-5279516670';

try {
    const db = new Database(dbPath);

    // Update all routers to have this token (since user only has 1, and wants to test)
    const info = db.prepare('UPDATE Router SET telegramBotToken = ?, telegramChatId = ?').run(TOKEN, CHAT_ID);

    console.log(`Updated ${info.changes} routers.`);

    db.close();
} catch (error) {
    console.error('Error:', error.message);
}
