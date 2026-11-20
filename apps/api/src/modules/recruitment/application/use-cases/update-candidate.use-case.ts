import { ICandidateRepository } from '../ports/candidate.repository.port';
import { CandidateNotifierPort } from '../ports/recruitment-services.port';
import { CandidateAccessService } from '../services/candidate-access.service';
import { assertCandidateFitsData, todayInIndia } from '../services/candidate-checks';
import { CandidateProps } from '../../domain/candidate.entity';
import { CandidateInput, CandidateValidationError, normalizeCandidateInput } from '../../domain/candidate-input-rules';

const isoDay = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** The saved candidate in the shape the form sends, so a partial edit is checked as the whole candidate */
function asInput(c: CandidateProps): CandidateInput {
  return {
    name: c.name,
    phone: c.phone,
    email: c.email,
    gender_id: c.genderId,
    current_location: c.currentLocation,
    resume_url: c.resumeUrl,
    resume_filename: c.resumeFilename,
    resume_size: c.resumeSize,
    resume_mime: c.resumeMime,
    role_id: c.roleId,
    dep_id: c.depId,
    experience_type: c.experienceType,
    exp_years: c.expYears,
    exp_months: c.expMonths,
    current_company: c.currentCompany,
    current_designation: c.currentDesignation,
    current_ctc: c.currentCtc,
    expected_ctc: c.expectedCtc,
    notice_period: c.noticePeriod,
    serving_notice_lwd: isoDay(c.servingNoticeLwd),
    key_skills: c.keySkills,
    source: c.source,
    source_portal: c.sourcePortal,
    referred_by_emp_id: c.referredByEmpId,
    consultancy_name: c.consultancyName,
    college_name: c.collegeName,
    source_details: c.sourceDetails,
    notes: c.notes,
    stage: c.stage,
    assigned_to_emp_id: c.assignedToEmpId,
  };
}

export class UpdateCandidateUseCase {
  constructor(
    private readonly candidateRepo: ICandidateRepository,
    private readonly notifier: CandidateNotifierPort,
    private readonly access: CandidateAccessService,
  ) {}

  async execute(candidateId: number, patch: CandidateInput, actorId: number): Promise<CandidateProps> {
    const existing = await this.access.loadForAdmin(candidateId, actorId, 'edit candidates');
    if (existing.convertedToEmpId) {
      throw new CandidateValidationError(
        `This candidate is already the employee ${existing.convertedToEmpCode}. Edit the employee profile instead.`,
      );
    }

    // The stage changes from the stage menu and the decision form, never from this form
    const merged: CandidateInput = { ...asInput(existing), ...patch, stage: existing.stage };
    // A last working day saved earlier may have passed since; it only has to be in the future when it is changed
    const savedLwd = isoDay(existing.servingNoticeLwd);
    const today = savedLwd && merged.serving_notice_lwd === savedLwd && savedLwd < todayInIndia() ? savedLwd : todayInIndia();
    const clean = normalizeCandidateInput(merged, today);
    await assertCandidateFitsData(this.candidateRepo, clean, {
      candidateId,
      previous: { stage: existing.stage, assignedToEmpId: existing.assignedToEmpId, referredByEmpId: existing.referredByEmpId },
    });

    const updated = await this.candidateRepo.update(candidateId, clean, actorId);
    if (updated.assignedToEmpId && updated.assignedToEmpId !== existing.assignedToEmpId && updated.assignedToEmpId !== actorId) {
      await this.notifier
        .candidateAssigned({ empId: updated.assignedToEmpId, candidateId, candidateCode: updated.candidateCode, candidateName: updated.name, actorId })
        .catch(() => undefined);
    }
    return updated;
  }
}
