import { ConflictException } from '@nestjs/common';
import { CandidateDuplicateMatch } from './ports/candidate.repository.port';

/**
 * BFD Section 4 Part 4: a person who is already an employee, or already a candidate (any stage),
 * cannot be added again. The Admin opens the old record (and reopens it) instead.
 */
export function assertNoDuplicate(matches: CandidateDuplicateMatch[]): void {
  const employee = matches.find((m) => m.type === 'employee');
  if (employee) {
    throw new ConflictException({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      code: 'CANDIDATE_IS_EMPLOYEE',
      detail: `This person is already employee ${employee.code}.`,
    });
  }
  const candidate = matches.find((m) => m.type === 'candidate');
  if (candidate) {
    throw new ConflictException({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      code: 'DUPLICATE_CANDIDATE',
      detail: `This person already exists as ${candidate.code}. Open that record instead of adding a new one.`,
    });
  }
}
