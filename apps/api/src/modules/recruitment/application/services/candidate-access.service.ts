import { ICandidateRepository } from '../ports/candidate.repository.port';
import { RecruitmentAccessPort } from '../ports/recruitment-services.port';
import { CandidateProps } from '../../domain/candidate.entity';
import { CandidateAccessDeniedError, CandidateNotFoundError } from '../../domain/candidate-input-rules';

/**
 * One place for who may see and change a candidate: an Admin every candidate; any other employee only the candidates
 * the Admin assigned to them. A candidate someone may not see is reported as not found, so its existence is not told.
 */
export class CandidateAccessService {
  constructor(
    private readonly candidates: ICandidateRepository,
    private readonly access: RecruitmentAccessPort,
  ) {}

  isAdmin(empId: number): Promise<boolean> {
    return this.access.isAdmin(empId);
  }

  async assertAdmin(empId: number, action = 'manage candidates'): Promise<void> {
    if (!(await this.access.isAdmin(empId))) {
      throw new CandidateAccessDeniedError(`Only an Admin can ${action}.`);
    }
  }

  /** The candidate, when the employee may see it */
  async loadVisible(candidateId: number, empId: number): Promise<{ candidate: CandidateProps; isAdmin: boolean }> {
    const candidate = await this.candidates.findById(candidateId);
    if (!candidate) throw new CandidateNotFoundError(candidateId);
    const isAdmin = await this.access.isAdmin(empId);
    if (!isAdmin && candidate.assignedToEmpId !== empId) throw new CandidateNotFoundError(candidateId);
    return { candidate, isAdmin };
  }

  /** The candidate, when the employee is an Admin */
  async loadForAdmin(candidateId: number, empId: number, action?: string): Promise<CandidateProps> {
    await this.assertAdmin(empId, action);
    const candidate = await this.candidates.findById(candidateId);
    if (!candidate) throw new CandidateNotFoundError(candidateId);
    return candidate;
  }
}
