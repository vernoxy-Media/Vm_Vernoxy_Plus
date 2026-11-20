import { ICandidateRepository } from '../ports/candidate.repository.port';
import { CandidateNotifierPort } from '../ports/recruitment-services.port';
import { CandidateAccessService } from '../services/candidate-access.service';
import { CandidateProps } from '../../domain/candidate.entity';
import { CandidateValidationError } from '../../domain/candidate-input-rules';

export class AssignCandidateUseCase {
  constructor(
    private readonly candidateRepo: ICandidateRepository,
    private readonly notifier: CandidateNotifierPort,
    private readonly access: CandidateAccessService,
  ) {}

  /** The Admin hands the candidate to an active employee (or takes it back with null), who is told about it */
  async execute(candidateId: number, empId: number | null, actorId: number): Promise<CandidateProps> {
    const candidate = await this.access.loadForAdmin(candidateId, actorId, 'assign candidates');
    if (empId !== null && (!Number.isInteger(empId) || empId <= 0)) {
      throw new CandidateValidationError('Please select an employee.', 'assigned_to_emp_id');
    }
    if (empId === (candidate.assignedToEmpId ?? null)) return candidate;
    if (empId !== null && !(await this.candidateRepo.isActiveEmployee(empId))) {
      throw new CandidateValidationError('A candidate can only be assigned to an active employee.', 'assigned_to_emp_id');
    }

    const updated = await this.candidateRepo.setAssignee(candidateId, empId, actorId);
    if (empId !== null && empId !== actorId) {
      await this.notifier
        .candidateAssigned({ empId, candidateId, candidateCode: updated.candidateCode, candidateName: updated.name, actorId })
        .catch(() => undefined);
    }
    return updated;
  }
}
