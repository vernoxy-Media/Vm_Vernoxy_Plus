/** Who may do what in Recruitment. */
export interface RecruitmentAccessPort {
  /** An Admin manages every candidate */
  isAdmin(empId: number): Promise<boolean>;
}
export const RECRUITMENT_ACCESS = Symbol('RECRUITMENT_ACCESS');

export interface RegretEmail {
  to: string;
  candidateName: string;
  position: string | null;
}

/** Emails sent to a candidate. */
export interface CandidateMailerPort {
  /** The polite "we will not go ahead" email after a rejection. Throws when the mail server refuses it. */
  sendRegretEmail(mail: RegretEmail): Promise<void>;
}
export const CANDIDATE_MAILER = Symbol('CANDIDATE_MAILER');

/** In-app notifications about candidates. Best effort: a failure never undoes the change it is about. */
export interface CandidateNotifierPort {
  /** Tells the employee a candidate was handed to them */
  candidateAssigned(input: { empId: number; candidateId: number; candidateCode: string; candidateName: string; actorId: number }): Promise<void>;
}
export const CANDIDATE_NOTIFIER = Symbol('CANDIDATE_NOTIFIER');
