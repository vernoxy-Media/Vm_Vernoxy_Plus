import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CandidateController } from './presentation/controllers/candidate.controller';
import { CANDIDATE_REPOSITORY } from './application/ports/candidate.repository.port';
import { PrismaCandidateRepository } from './infrastructure/persistence/prisma-candidate.repository';
import { CreateCandidateUseCase } from './application/use-cases/create-candidate.use-case';
import { ListCandidatesUseCase } from './application/use-cases/list-candidates.use-case';
import { GetCandidateDetailUseCase } from './application/use-cases/get-candidate-detail.use-case';
import { CheckDuplicateCandidateUseCase } from './application/use-cases/check-duplicate-candidate.use-case';
import { GetNextCandidateCodeUseCase } from './application/use-cases/get-next-candidate-code.use-case';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CandidateController],
  providers: [
    {
      provide: CANDIDATE_REPOSITORY,
      useClass: PrismaCandidateRepository,
    },
    CreateCandidateUseCase,
    ListCandidatesUseCase,
    GetCandidateDetailUseCase,
    CheckDuplicateCandidateUseCase,
    GetNextCandidateCodeUseCase,
  ],
  exports: [CANDIDATE_REPOSITORY],
})
export class RecruitmentModule {}
