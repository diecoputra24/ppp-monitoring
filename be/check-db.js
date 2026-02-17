const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./prisma/dev.db',
        },
    },
});

async function main() {
    try {
        const routers = await prisma.router.findMany();
        console.log('Routers in DB (prisma/dev.db):', routers.length);
        routers.forEach((r) => {
            console.log(`- ${r.name} (${r.host})`);
            console.log(
                `  Token: ${r.telegramBotToken ? r.telegramBotToken.substring(0, 10) + '...' : 'NULL'}`
            );
            console.log(`  ChatID: ${r.telegramChatId}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
