import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { join } from 'path';
import 'dotenv/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const dbPath = join(process.cwd(), 'prisma', 'dev.db');
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    super({ adapter });
  }

  async onModuleInit() {
    console.log('Connecting to database...');
    await this.$connect();
    // Enable WAL mode for better concurrency (fixes locking issues)
    await this.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
    console.log('Database connected successfully (WAL Mode enabled).');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Database disconnected.');
  }
}
