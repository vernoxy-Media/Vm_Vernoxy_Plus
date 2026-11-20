import { ICandidateRepository, CandidateFilterParams } from '../ports/candidate.repository.port';
import { CandidateAccessService } from '../services/candidate-access.service';
import { CandidateProps } from '../../domain/candidate.entity';
import { CandidateStats } from '../ports/candidate.repository.port';

export interface CandidateListResult {
  items: CandidateProps[];
  total: number;
  stats: CandidateStats;
  /** Whether the viewer is an Admin (sees and manages everything) or sees only the candidates assigned to them */
  scope: 'all' | 'assigned';
}

export class ListCandidatesUseCase {
  constructor(
    private readonly candidateRepo: ICandidateRepository,
    private readonly access: CandidateAccessService,
  ) {}

  async execute(params: CandidateFilterParams, viewerId: number): Promise<CandidateListResult> {
    const isAdmin = await this.access.isAdmin(viewerId);
    const assignedTo = isAdmin ? params.assignedTo : viewerId;
    const [{ items, total }, stats] = await Promise.all([
      this.candidateRepo.findMany({ ...params, assignedTo }),
      this.candidateRepo.getStats(isAdmin ? undefined : viewerId),
    ]);
    return { items, total, stats, scope: isAdmin ? 'all' : 'assigned' };
  }
}
