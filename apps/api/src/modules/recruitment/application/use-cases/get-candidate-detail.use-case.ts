import { CandidateAccessService } from '../services/candidate-access.service';
import { CandidateProps } from '../../domain/candidate.entity';

export class GetCandidateDetailUseCase {
  constructor(private readonly access: CandidateAccessService) {}

  /** The candidate, for an Admin or for the employee it is assigned to */
  async execute(candidateId: number, viewerId: number): Promise<CandidateProps> {
    const { candidate } = await this.access.loadVisible(candidateId, viewerId);
    return candidate;
  }
}
