import { defineConfig } from 'prisma/config';
import 'dotenv/config';
import { join } from 'path';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    datasource: {
        url: `file:${join(process.cwd(), 'prisma', 'dev.db')}`,
    },
});
