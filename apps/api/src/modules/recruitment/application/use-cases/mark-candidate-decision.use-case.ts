import { ICandidateRepository, MarkDecisionParams } from '../ports/candidate.repository.port';
import { CandidateMailerPort } from '../ports/recruitment-services.port';
import { CandidateAccessService } from '../services/candidate-access.service';
import { todayInIndia } from '../services/candidate-checks';
import { CandidateProps } from '../../domain/candidate.entity';
import { CandidateValidationError, optionalCtc } from '../../domain/candidate-input-rules';

export interface MarkDecisionInput {
  decision: 'selected' | 'on_hold' | 'rejected';
  final_role_id?: number;
  final_dep_id?: number;
  offered_ctc?: number;
  expected_joining_date?: string;
  reporting_manager_id?: number;
  employment_type?: string;
  notes?: string;
  on_hold_review_date?: string;
  on_hold_notes?: string;
  rejection_reason?: string;
  rejection_notes?: string;
  send_regret_email?: boolean;
}

export interface MarkDecisionResult {
  candidate: CandidateProps;
  /** What happened to the regret email asked for with a rejection */
  regretEmail: 'not_requested' | 'sent' | 'failed';
}

export class MarkCandidateDecisionUseCase {
  constructor(
    private readonly candidateRepository: ICandidateRepository,
    private readonly mailer: CandidateMailerPort,
    private readonly access: CandidateAccessService,
    /** Where a mail failure is written for the administrator (the server log) */
    private readonly logError: (message: string) => void = () => undefined,
  ) {}

  async execute(candidateId: number, dto: MarkDecisionInput, decisionBy: number): Promise<MarkDecisionResult> {
    const candidate = await this.access.loadForAdmin(candidateId, decisionBy, 'record a hiring decision');

    if (candidate.convertedToEmpId || candidate.stage === 'joined') {
      throw new CandidateValidationError(
        `Candidate has already been converted to employee ${candidate.convertedToEmpCode || `EMP-${candidate.convertedToEmpId}`}. Hiring decision cannot be changed.`,
      );
    }

    if (dto.decision === 'rejected') {
      if (!dto.rejection_reason) throw new CandidateValidationError('Rejection reason is required.', 'rejection_reason');
      if (dto.rejection_reason.toLowerCase() === 'other' && !dto.rejection_notes?.trim()) {
        throw new CandidateValidationError('Notes are required when the rejection reason is "Other".', 'rejection_notes');
      }
    } else if (dto.decision === 'on_hold') {
      if (!dto.on_hold_notes?.trim() && !dto.notes?.trim()) {
        throw new CandidateValidationError('A note is required when putting a candidate On Hold.', 'on_hold_notes');
      }
    } else if (dto.decision === 'selected') {
      if (!dto.expected_joining_date) throw new CandidateValidationError('Expected joining date is required for selection.', 'expected_joining_date');
      if (dto.expected_joining_date.slice(0, 10) < todayInIndia()) {
        throw new CandidateValidationError('Expected joining date should be today or a future date, not a past date.', 'expected_joining_date');
      }
    }
    const offeredCtc = optionalCtc(dto.offered_ctc, 'offered_ctc', 'Offered CTC');

    const params: MarkDecisionParams = {
      decision: dto.decision,
      finalRoleId: dto.final_role_id || candidate.roleId,
      finalDepId: dto.final_dep_id || candidate.depId,
      offeredCtc: offeredCtc ?? undefined,
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

    const updated = await this.candidateRepository.markDecision(candidateId, params, decisionBy);

    let regretEmail: MarkDecisionResult['regretEmail'] = 'not_requested';
    if (dto.decision === 'rejected' && dto.send_regret_email) {
      // The rejection is saved either way; the screen says whether the email went out
      try {
        await this.mailer.sendRegretEmail({ to: updated.email, candidateName: updated.name, position: updated.roleName ?? null });
        regretEmail = 'sent';
      } catch (err) {
        regretEmail = 'failed';
        this.logError(`Regret email for candidate #${candidateId} was not sent: ${(err as Error).message}`);
      }
    }
    return { candidate: updated, regretEmail };
  }
}
