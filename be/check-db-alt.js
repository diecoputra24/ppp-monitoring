const Database = require('better-sqlite3');
const path = require('path');

// Check be/dev.db
const dbPath = path.join(process.cwd(), 'dev.db');
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
    if (error.code === 'SQLITE_CANTOPEN') {
        console.log('Could not open db, likely does not exist.');
    } else {
        console.error('Error:', error.message);
    }
}
