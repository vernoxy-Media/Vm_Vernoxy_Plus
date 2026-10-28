import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY,
  ICandidateRepository,
  MarkDecisionParams,
} from '../ports/candidate.repository.port';
import { CandidateProps } from '../../domain/candidate.entity';
import { MarkCandidateDecisionDto } from '../../presentation/dto/candidate.dto';

@Injectable()
export class MarkCandidateDecisionUseCase {
  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepository: ICandidateRepository,
  ) {}

  async execute(
    candidateId: number,
    dto: MarkCandidateDecisionDto,
    decisionBy?: number,
  ): Promise<CandidateProps> {
    const candidate = await this.candidateRepository.findById(candidateId);
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found.`);
    }

    // Specific validation according to rules
    if (dto.decision === 'rejected') {
      if (!dto.rejection_reason) {
        throw new BadRequestException('Rejection reason is required.');
      }
      if (
        dto.rejection_reason.toLowerCase() === 'other' &&
        (!dto.rejection_notes || !dto.rejection_notes.trim())
      ) {
        throw new BadRequestException('Notes are required when rejection reason is "Other".');
      }
    } else if (dto.decision === 'on_hold') {
      if (!dto.on_hold_notes && !dto.notes) {
        throw new BadRequestException('Note is required when marking a candidate On Hold.');
      }
    } else if (dto.decision === 'selected') {
      if (!dto.expected_joining_date) {
        throw new BadRequestException('Expected joining date is required for selection.');
      }
    }

    const params: MarkDecisionParams = {
      decision: dto.decision,
      finalRoleId: dto.final_role_id || candidate.roleId,
      finalDepId: dto.final_dep_id || candidate.depId,
      offeredCtc: dto.offered_ctc,
      expectedJoiningDate: dto.expected_joining_date ? new Date(dto.expected_joining_date) : undefined,
      reportingManagerId: dto.reporting_manager_id,
      employmentType: dto.employment_type || 'Full-time',
      notes: dto.notes,
      onHoldReviewDate: dto.on_hold_review_date ? new Date(dto.on_hold_review_date) : undefined,
      onHoldNotes: dto.on_hold_notes,
      rejectionReason: dto.rejection_reason,
      rejectionNotes: dto.rejection_notes,
      sendRegretEmail: dto.send_regret_email,
    };

    return this.candidateRepository.markDecision(candidateId, params, decisionBy);
  }
}
