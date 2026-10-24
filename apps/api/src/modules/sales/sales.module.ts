import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { LeadController } from './presentation/lead.controller';
import {
  LEAD_REPOSITORY_TOKEN,
  LeadRepositoryPort,
} from './domain/ports/lead.repository.port';
import { PrismaLeadRepository } from './infrastructure/persistence/prisma-lead.repository';
import {
  ListLeadsUseCase,
  GetLeadDetailUseCase,
  CreateLeadUseCase,
  UpdateLeadUseCase,
  UpdateLeadStageUseCase,
  ConvertLeadUseCase,
  DeleteLeadUseCase,
  GetLeadMastersUseCase,
} from './application/use-cases/lead.use-cases';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LeadController],
  providers: [
    {
      provide: LEAD_REPOSITORY_TOKEN,
      useClass: PrismaLeadRepository,
    },
    {
      provide: ListLeadsUseCase,
      useFactory: (repo: LeadRepositoryPort) => new ListLeadsUseCase(repo),
      inject: [LEAD_REPOSITORY_TOKEN],
    },
    {
      provide: GetLeadDetailUseCase,
      useFactory: (repo: LeadRepositoryPort) => new GetLeadDetailUseCase(repo),
      inject: [LEAD_REPOSITORY_TOKEN],
    },
    {
      provide: CreateLeadUseCase,
      useFactory: (repo: LeadRepositoryPort) => new CreateLeadUseCase(repo),
      inject: [LEAD_REPOSITORY_TOKEN],
    },
    {
      provide: UpdateLeadUseCase,
      useFactory: (repo: LeadRepositoryPort) => new UpdateLeadUseCase(repo),
      inject: [LEAD_REPOSITORY_TOKEN],
    },
    {
      provide: UpdateLeadStageUseCase,
      useFactory: (repo: LeadRepositoryPort) => new UpdateLeadStageUseCase(repo),
      inject: [LEAD_REPOSITORY_TOKEN],
    },
    {
      provide: ConvertLeadUseCase,
      useFactory: (repo: LeadRepositoryPort) => new ConvertLeadUseCase(repo),
      inject: [LEAD_REPOSITORY_TOKEN],
    },
    {
      provide: DeleteLeadUseCase,
      useFactory: (repo: LeadRepositoryPort) => new DeleteLeadUseCase(repo),
      inject: [LEAD_REPOSITORY_TOKEN],
    },
    {
      provide: GetLeadMastersUseCase,
      useFactory: (repo: LeadRepositoryPort) => new GetLeadMastersUseCase(repo),
      inject: [LEAD_REPOSITORY_TOKEN],
    },
  ],
  exports: [
    LEAD_REPOSITORY_TOKEN,
    ListLeadsUseCase,
    CreateLeadUseCase,
    UpdateLeadUseCase,
  ],
})
export class SalesModule {}
