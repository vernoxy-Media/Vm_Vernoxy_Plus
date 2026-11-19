import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HomeDashboardController } from './presentation/home-dashboard.controller';
import { GetHomeDashboardUseCase } from './application/use-cases/get-home-dashboard.use-case';
import { HomeDashboardRepositoryPort } from './application/ports/home-dashboard.repository.port';
import { PrismaHomeDashboardRepository } from './infrastructure/prisma-home-dashboard.repository';

/**
 * Main User Dashboard (BFD VM-004): one read-only endpoint that gathers each person's dashboard.
 * It adds no permissions: every figure is scoped with the rule the owning module already applies.
 */
@Module({
  imports: [AuthModule],
  controllers: [HomeDashboardController],
  providers: [
    { provide: HomeDashboardRepositoryPort, useClass: PrismaHomeDashboardRepository },
    {
      provide: GetHomeDashboardUseCase,
      useFactory: (repo: HomeDashboardRepositoryPort) => new GetHomeDashboardUseCase(repo),
      inject: [HomeDashboardRepositoryPort],
    },
  ],
})
export class HomeDashboardModule {}
