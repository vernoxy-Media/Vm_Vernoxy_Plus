import { CreateNotificationUseCase } from '../../../notifications/public-api';
import { CandidateNotifierPort } from '../../application/ports/recruitment-services.port';

/** Candidate notifications through the shared notifications module (bell, pop-up and desktop push). */
export class NotificationsCandidateNotifierAdapter implements CandidateNotifierPort {
  constructor(private readonly createNotification: CreateNotificationUseCase) {}

  async candidateAssigned(input: { empId: number; candidateId: number; candidateCode: string; candidateName: string; actorId: number }): Promise<void> {
    await this.createNotification.execute({
      recipient_id: input.empId,
      kind: 'candidate_assigned',
      title: `Candidate assigned: ${input.candidateCode}`,
      body: `${input.candidateName} has been assigned to you. You can move them through the hiring stages.`,
      entity_type: 'CANDIDATE',
      entity_id: input.candidateId,
      created_by: input.actorId,
    });
  }
}
