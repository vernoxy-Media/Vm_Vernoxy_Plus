export interface CandidateProps {
  candidateId?: number;
  candidateCode: string;
  name: string;
  phone: string;
  email: string;
  genderId?: number | null;
  currentLocation?: string | null;
  resumeUrl?: string | null;
  resumeFilename?: string | null;
  resumeSize?: number | null;
  resumeMime?: string | null;
  roleId: number;
  depId: number;
  experienceType: 'fresher' | 'experienced';
  expYears: number;
  expMonths: number;
  currentCompany?: string | null;
  currentDesignation?: string | null;
  currentCtc?: number | null;
  expectedCtc?: number | null;
  noticePeriod?: string | null;
  servingNoticeLwd?: Date | null;
  keySkills: string[];
  source: string;
  sourcePortal?: string | null;
  referredByEmpId?: number | null;
  consultancyName?: string | null;
  collegeName?: string | null;
  sourceDetails?: string | null;
  notes?: string | null;
  stage: string;
  rejectionReason?: string | null;
  rejectionNotes?: string | null;
  convertedToEmpId?: number | null;
  roleName?: string;
  departmentName?: string;
  referredByName?: string;
  genderLabel?: string;
  createdBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Candidate {
  constructor(private readonly props: CandidateProps) {}

  get candidateId(): number | undefined {
    return this.props.candidateId;
  }

  get candidateCode(): string {
    return this.props.candidateCode;
  }

  get name(): string {
    return this.props.name;
  }

  get phone(): string {
    return this.props.phone;
  }

  get email(): string {
    return this.props.email;
  }

  get roleId(): number {
    return this.props.roleId;
  }

  get depId(): number {
    return this.props.depId;
  }

  get experienceType(): 'fresher' | 'experienced' {
    return this.props.experienceType;
  }

  get source(): string {
    return this.props.source;
  }

  get stage(): string {
    return this.props.stage;
  }

  toJSON(): CandidateProps {
    return { ...this.props };
  }
}
