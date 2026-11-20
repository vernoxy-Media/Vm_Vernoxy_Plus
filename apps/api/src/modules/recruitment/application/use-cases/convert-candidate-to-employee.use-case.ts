import { ICandidateRepository } from '../ports/candidate.repository.port';
import { CandidateAccessService } from '../services/candidate-access.service';
import { CandidateProps } from '../../domain/candidate.entity';
import { CandidateValidationError, emailAddress } from '../../domain/candidate-input-rules';

export class ConvertCandidateToEmployeeUseCase {
  constructor(
    private readonly candidateRepo: ICandidateRepository,
    private readonly access: CandidateAccessService,
  ) {}

  async execute(
    candidateId: number,
    officeEmail: string,
    adminId: number,
  ): Promise<{
    employee: { emp_id: number; name: string; email: string; employee_code: string };
    candidate: CandidateProps;
  }> {
    const candidate = await this.access.loadForAdmin(candidateId, adminId, 'convert candidates to employees');
    const email = emailAddress(officeEmail, 'office_email');

    if (candidate.convertedToEmpId) {
      throw new CandidateValidationError(
        `Candidate has already been converted to employee ${candidate.convertedToEmpCode || `EMP-${candidate.convertedToEmpId}`}.`,
      );
    }
    if (candidate.stage !== 'selected') {
      throw new CandidateValidationError('Only a Selected candidate can be converted to an employee. Record the selection first.');
    }

    return this.candidateRepo.convertToEmployee(candidateId, email, adminId);
  }
}
