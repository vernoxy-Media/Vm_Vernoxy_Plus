import { CandidateProps } from '../../domain/candidate.entity';

export interface CandidateFilterParams {
  q?: string;
  roleId?: number;
  depId?: number;
  source?: string;
  stage?: string;
  limit?: number;
  offset?: number;
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

export const CANDIDATE_REPOSITORY = Symbol('CANDIDATE_REPOSITORY');

export interface ICandidateRepository {
  create(data: Omit<CandidateProps, 'candidateId' | 'candidateCode' | 'createdAt' | 'updatedAt'>): Promise<CandidateProps>;
  getNextCandidateCode(): Promise<string>;
  findById(candidateId: number): Promise<CandidateProps | null>;
  findMany(params: CandidateFilterParams): Promise<{ items: CandidateProps[]; total: number }>;
  getStats(): Promise<CandidateStats>;
  checkDuplicates(phone: string, email: string): Promise<CandidateDuplicateMatch[]>;
}
