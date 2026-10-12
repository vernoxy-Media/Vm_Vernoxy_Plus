import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // dbmate ledger was moved to the dedicated `dbmate` schema (dbmate.schema_migrations),
  // so Prisma introspection in public schema naturally excludes it.
  async onModuleInit() {
    try {
      await this.$connect();
    } catch {
      // In offline / tooling contexts, connection failure does not prevent schema export
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
