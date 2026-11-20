import { ICandidateRepository } from '../ports/candidate.repository.port';
import { CandidateNotifierPort } from '../ports/recruitment-services.port';
import { CandidateAccessService } from '../services/candidate-access.service';
import { assertCandidateFitsData, todayInIndia } from '../services/candidate-checks';
import { CandidateProps } from '../../domain/candidate.entity';
import { CandidateInput, normalizeCandidateInput } from '../../domain/candidate-input-rules';

export class CreateCandidateUseCase {
  constructor(
    private readonly candidateRepo: ICandidateRepository,
    private readonly notifier: CandidateNotifierPort,
    private readonly access: CandidateAccessService,
  ) {}

  async execute(input: CandidateInput, actorId: number): Promise<CandidateProps> {
    await this.access.assertAdmin(actorId, 'add candidates');
    const clean = normalizeCandidateInput(input, todayInIndia());
    await assertCandidateFitsData(this.candidateRepo, clean);

    const created = await this.candidateRepo.create(clean, actorId);
    if (created.assignedToEmpId && created.assignedToEmpId !== actorId) {
      await this.notifier
        .candidateAssigned({
          empId: created.assignedToEmpId,
          candidateId: created.candidateId!,
          candidateCode: created.candidateCode,
          candidateName: created.name,
          actorId,
        })
        .catch(() => undefined);
    }
    return created;
  }
}
