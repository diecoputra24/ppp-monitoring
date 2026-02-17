const Database = require('better-sqlite3');
const path = require('path');

// Try to open the DB at be/prisma/dev.db
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
console.log('Opening DB at:', dbPath);

try {
    const db = new Database(dbPath, { readonly: true });

    // Check if table exists
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Router';").get();
    if (!tableCheck) {
        console.log('Router table not found!');
        process.exit(1);
    }

    const rows = db.prepare('SELECT id, name, host, telegramBotToken, telegramChatId FROM Router').all();
    console.log(`Found ${rows.length} routers.`);
    rows.forEach(r => {
        console.log(`Router: ${r.name} (${r.host})`);
        console.log(`  Token: ${r.telegramBotToken}`);
        console.log(`  ChatId: ${r.telegramChatId}`);
    });

    db.close();
} catch (error) {
    console.error('Error:', error.message);
}
