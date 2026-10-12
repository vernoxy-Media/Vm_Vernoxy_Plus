import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CrmUnitOfWorkPort } from '../../application/ports/unit-of-work.port';

@Injectable()
export class PrismaCrmUnitOfWork implements CrmUnitOfWorkPort {
  constructor(private readonly prisma: PrismaService) {}

  async runInTransaction<T>(work: (tx: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return work(tx);
    });
  }
}
