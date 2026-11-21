import { CandidateProps } from '../../domain/candidate.entity';
import { CleanCandidate, DuplicateHit } from '../../domain/candidate-input-rules';

export const CANDIDATE_SORT_FIELDS = [
  'candidate_code',
  'name',
  'position',
  'department',
  'experience',
  'source',
  'stage',
  'applied_date',
] as const;
export type CandidateSortField = (typeof CANDIDATE_SORT_FIELDS)[number];

export interface CandidateFilterParams {
  q?: string;
  roleId?: number;
  depId?: number;
  source?: string;
  stage?: string;
  experienceType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: CandidateSortField;
  sortDir?: 'asc' | 'desc';
  /** Only the candidates handed to this employee (an employee who is not an Admin sees only these) */
  assignedTo?: number;
}

export interface CandidateStats {
  total: number;
  interviewing: number;
  selected: number;
  onboarding: number;
}

export interface CandidateDuplicateMatch {
  type: 'candidate' | 'employee';
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  stage?: string;
}

export interface MarkDecisionParams {
  decision: 'selected' | 'on_hold' | 'rejected';
  finalRoleId?: number;
  finalDepId?: number;
  offeredCtc?: number;
  expectedJoiningDate?: Date;
  reportingManagerId?: number;
  employmentType?: string;
  notes?: string;
  onHoldNotes?: string;
  onHoldReviewDate?: Date;
  rejectionReason?: string;
  rejectionNotes?: string;
  sendRegretEmail?: boolean;
}

export const CANDIDATE_REPOSITORY = Symbol('CANDIDATE_REPOSITORY');

export interface ICandidateRepository {
  create(data: CleanCandidate, createdBy?: number | null): Promise<CandidateProps>;
  update(candidateId: number, data: CleanCandidate, updatedBy?: number | null): Promise<CandidateProps>;
  getNextCandidateCode(): Promise<string>;
  findById(candidateId: number): Promise<CandidateProps | null>;
  findMany(params: CandidateFilterParams): Promise<{ items: CandidateProps[]; total: number }>;
  getStats(assignedTo?: number): Promise<CandidateStats>;
  checkDuplicates(phone: string, email: string): Promise<CandidateDuplicateMatch[]>;
  /** The first candidate (other than `excludeCandidateId`) or employee with this email or phone, or null */
  findDuplicate(email: string, phone: string, excludeCandidateId?: number): Promise<DuplicateHit | null>;
  /** Whether the role (designation) belongs to the department */
  roleBelongsToDepartment(roleId: number, depId: number): Promise<boolean>;
  /** Whether the employee exists, is not deleted and is Active */
  isActiveEmployee(empId: number): Promise<boolean>;
  /** The active candidate stage codes from Master Data */
  activeStageCodes(): Promise<string[]>;
  setAssignee(candidateId: number, empId: number | null, updatedBy?: number | null): Promise<CandidateProps>;
  updateStage(candidateId: number, stage: string, updatedBy?: number): Promise<CandidateProps>;
  markDecision(candidateId: number, data: MarkDecisionParams, decisionBy?: number): Promise<CandidateProps>;
  getNextEmployeeCode(): Promise<{ nextEmpId: number; nextEmpCode: string }>;
  convertToEmployee(
    candidateId: number,
    officeEmail: string,
    adminId?: number,
  ): Promise<{ employee: { emp_id: number; name: string; email: string; employee_code: string }; candidate: CandidateProps }>;
}
