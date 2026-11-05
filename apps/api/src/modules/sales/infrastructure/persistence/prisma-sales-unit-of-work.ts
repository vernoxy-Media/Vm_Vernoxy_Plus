import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SalesUnitOfWorkPort } from '../../application/ports/sales-unit-of-work.port';

@Injectable()
export class PrismaSalesUnitOfWork implements SalesUnitOfWorkPort {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => fn(tx), { timeout: 20000 });
  }
}
