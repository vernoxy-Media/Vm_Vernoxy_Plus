import { ICandidateRepository } from '../ports/candidate.repository.port';
import { CandidateAccessService } from '../services/candidate-access.service';
import { CandidateProps } from '../../domain/candidate.entity';
import { CandidateValidationError, isPlainStage } from '../../domain/candidate-input-rules';

export class UpdateCandidateStageUseCase {
  constructor(
    private readonly candidateRepository: ICandidateRepository,
    private readonly access: CandidateAccessService,
  ) {}

  /**
   * Moves a candidate to another pipeline stage. The Admin and the employee the candidate is assigned to may do it.
   * Selected, On Hold and Rejected go through the decision form, Onboarding through the conversion, and a candidate
   * that already became an employee keeps its stage.
   */
  async execute(candidateId: number, stage: string, actorId: number): Promise<CandidateProps> {
    const { candidate, isAdmin } = await this.access.loadVisible(candidateId, actorId);
    const target = (stage ?? '').trim().toLowerCase();
    if (!target) throw new CandidateValidationError('Please choose a stage.', 'stage');

    if (candidate.convertedToEmpId || candidate.stage === 'joined' || candidate.stage === 'onboarding') {
      throw new CandidateValidationError(
        candidate.convertedToEmpId
          ? `This candidate is already the employee ${candidate.convertedToEmpCode}. The stage cannot be changed.`
          : 'A candidate in Onboarding or Joined cannot be moved to another stage.',
        'stage',
      );
    }
    if (target === candidate.stage) return candidate;

    const known = await this.candidateRepository.activeStageCodes();
    if (!known.includes(target)) throw new CandidateValidationError('Please choose a stage from the list.', 'stage');

    // "Did not join" closes a selected candidate who never came; only the Admin decides that
    const closingNoShow = target === 'did_not_join' && candidate.stage === 'selected';
    if (closingNoShow && !isAdmin) throw new CandidateValidationError('Only an Admin can mark a candidate as Did not join.', 'stage');
    if (!closingNoShow && !isPlainStage(target)) {
      throw new CandidateValidationError(
        target === 'onboarding'
          ? 'Convert the selected candidate to an employee to start Onboarding.'
          : 'Selected, On Hold and Rejected are recorded with the decision form.',
        'stage',
      );
    }

    return this.candidateRepository.updateStage(candidateId, target, actorId);
  }
}
