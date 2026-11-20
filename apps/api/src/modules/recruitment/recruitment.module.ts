import { Logger, Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule, CreateNotificationUseCase } from '../notifications/public-api';
import {
  CandidateController,
  CandidateResumeController,
} from './presentation/controllers/candidate.controller';
import { CANDIDATE_REPOSITORY, ICandidateRepository } from './application/ports/candidate.repository.port';
import {
  CANDIDATE_MAILER,
  CANDIDATE_NOTIFIER,
  RECRUITMENT_ACCESS,
  CandidateMailerPort,
  CandidateNotifierPort,
  RecruitmentAccessPort,
} from './application/ports/recruitment-services.port';
import { PrismaCandidateRepository } from './infrastructure/persistence/prisma-candidate.repository';
import { RecruitmentAccessAdapter } from './infrastructure/adapters/recruitment-access.adapter';
import { SmtpCandidateMailerAdapter } from './infrastructure/adapters/smtp-candidate-mailer.adapter';
import { NotificationsCandidateNotifierAdapter } from './infrastructure/adapters/notifications-candidate-notifier.adapter';
import { CandidateAccessService } from './application/services/candidate-access.service';
import { CreateCandidateUseCase } from './application/use-cases/create-candidate.use-case';
import { ListCandidatesUseCase } from './application/use-cases/list-candidates.use-case';
import { GetCandidateDetailUseCase } from './application/use-cases/get-candidate-detail.use-case';
import { CheckDuplicateCandidateUseCase } from './application/use-cases/check-duplicate-candidate.use-case';
import { GetNextCandidateCodeUseCase } from './application/use-cases/get-next-candidate-code.use-case';
import { UpdateCandidateStageUseCase } from './application/use-cases/update-candidate-stage.use-case';
import { MarkCandidateDecisionUseCase } from './application/use-cases/mark-candidate-decision.use-case';
import { GetNextEmployeeCodeUseCase } from './application/use-cases/get-next-employee-code.use-case';
import { ConvertCandidateToEmployeeUseCase } from './application/use-cases/convert-candidate-to-employee.use-case';
import { UpdateCandidateUseCase } from './application/use-cases/update-candidate.use-case';
import { AssignCandidateUseCase } from './application/use-cases/assign-candidate.use-case';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [CandidateResumeController, CandidateController],
  providers: [
    {
      provide: CANDIDATE_REPOSITORY,
      useClass: PrismaCandidateRepository,
    },
    { provide: RECRUITMENT_ACCESS, useClass: RecruitmentAccessAdapter },
    { provide: CANDIDATE_MAILER, useClass: SmtpCandidateMailerAdapter },
    {
      provide: CANDIDATE_NOTIFIER,
      useFactory: (create: CreateNotificationUseCase) => new NotificationsCandidateNotifierAdapter(create),
      inject: [CreateNotificationUseCase],
    },
    // The application layer is plain TypeScript; Nest only puts the pieces together here
    {
      provide: CandidateAccessService,
      useFactory: (repo: ICandidateRepository, access: RecruitmentAccessPort) => new CandidateAccessService(repo, access),
      inject: [CANDIDATE_REPOSITORY, RECRUITMENT_ACCESS],
    },
    {
      provide: CreateCandidateUseCase,
      useFactory: (repo: ICandidateRepository, notifier: CandidateNotifierPort, access: CandidateAccessService) =>
        new CreateCandidateUseCase(repo, notifier, access),
      inject: [CANDIDATE_REPOSITORY, CANDIDATE_NOTIFIER, CandidateAccessService],
    },
    {
      provide: UpdateCandidateUseCase,
      useFactory: (repo: ICandidateRepository, notifier: CandidateNotifierPort, access: CandidateAccessService) =>
        new UpdateCandidateUseCase(repo, notifier, access),
      inject: [CANDIDATE_REPOSITORY, CANDIDATE_NOTIFIER, CandidateAccessService],
    },
    {
      provide: AssignCandidateUseCase,
      useFactory: (repo: ICandidateRepository, notifier: CandidateNotifierPort, access: CandidateAccessService) =>
        new AssignCandidateUseCase(repo, notifier, access),
      inject: [CANDIDATE_REPOSITORY, CANDIDATE_NOTIFIER, CandidateAccessService],
    },
    {
      provide: ListCandidatesUseCase,
      useFactory: (repo: ICandidateRepository, access: CandidateAccessService) => new ListCandidatesUseCase(repo, access),
      inject: [CANDIDATE_REPOSITORY, CandidateAccessService],
    },
    {
      provide: GetCandidateDetailUseCase,
      useFactory: (access: CandidateAccessService) => new GetCandidateDetailUseCase(access),
      inject: [CandidateAccessService],
    },
    {
      provide: UpdateCandidateStageUseCase,
      useFactory: (repo: ICandidateRepository, access: CandidateAccessService) => new UpdateCandidateStageUseCase(repo, access),
      inject: [CANDIDATE_REPOSITORY, CandidateAccessService],
    },
    {
      provide: MarkCandidateDecisionUseCase,
      useFactory: (repo: ICandidateRepository, mailer: CandidateMailerPort, access: CandidateAccessService) => {
        const logger = new Logger('Recruitment');
        return new MarkCandidateDecisionUseCase(repo, mailer, access, (m) => logger.error(m));
      },
      inject: [CANDIDATE_REPOSITORY, CANDIDATE_MAILER, CandidateAccessService],
    },
    {
      provide: ConvertCandidateToEmployeeUseCase,
      useFactory: (repo: ICandidateRepository, access: CandidateAccessService) => new ConvertCandidateToEmployeeUseCase(repo, access),
      inject: [CANDIDATE_REPOSITORY, CandidateAccessService],
    },
    CheckDuplicateCandidateUseCase,
    GetNextCandidateCodeUseCase,
    GetNextEmployeeCodeUseCase,
  ],
  exports: [CANDIDATE_REPOSITORY],
})
export class RecruitmentModule {}
