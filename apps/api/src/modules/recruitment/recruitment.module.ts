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
import { UpdateCandidateStageUseCase } from './application/use-cases/update-candidate-stage.use-case';
import { MarkCandidateDecisionUseCase } from './application/use-cases/mark-candidate-decision.use-case';
import { GetNextEmployeeCodeUseCase } from './application/use-cases/get-next-employee-code.use-case';
import { ConvertCandidateToEmployeeUseCase } from './application/use-cases/convert-candidate-to-employee.use-case';

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
    UpdateCandidateStageUseCase,
    MarkCandidateDecisionUseCase,
    GetNextEmployeeCodeUseCase,
    ConvertCandidateToEmployeeUseCase,
  ],
  exports: [CANDIDATE_REPOSITORY],
})
export class RecruitmentModule {}
