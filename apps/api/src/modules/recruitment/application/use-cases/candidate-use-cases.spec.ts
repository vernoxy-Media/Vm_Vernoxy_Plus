import { CandidateAccessService } from '../services/candidate-access.service';
import { CreateCandidateUseCase } from './create-candidate.use-case';
import { UpdateCandidateUseCase } from './update-candidate.use-case';
import { UpdateCandidateStageUseCase } from './update-candidate-stage.use-case';
import { MarkCandidateDecisionUseCase } from './mark-candidate-decision.use-case';
import { AssignCandidateUseCase } from './assign-candidate.use-case';
import { ListCandidatesUseCase } from './list-candidates.use-case';
import { ICandidateRepository } from '../ports/candidate.repository.port';
import { CandidateProps } from '../../domain/candidate.entity';
import { CandidateAccessDeniedError, CandidateNotFoundError, CandidateValidationError, DuplicateHit } from '../../domain/candidate-input-rules';

const ADMIN = 1;
const RECRUITER = 7;
const OTHER = 9;

const base = (over: Partial<CandidateProps> = {}): CandidateProps => ({
  candidateId: 10,
  candidateCode: 'CAN-0010',
  name: 'Rohan Mehta',
  phone: '9825011223',
  email: 'rohan@mail.com',
  roleId: 4,
  depId: 2,
  roleName: 'Business Analyst',
  experienceType: 'experienced',
  expYears: 3,
  expMonths: 0,
  keySkills: [],
  source: 'job_portal',
  sourcePortal: 'naukri',
  stage: 'screening',
  assignedToEmpId: RECRUITER,
  ...over,
});

function setup(opts: { candidate?: CandidateProps; duplicate?: DuplicateHit | null; mailFails?: boolean } = {}) {
  let saved = opts.candidate ?? base();
  const calls = { updateStage: [] as string[], notified: [] as number[], mails: [] as string[] };
  const repo = {
    findById: jest.fn(async () => saved),
    findDuplicate: jest.fn(async () => opts.duplicate ?? null),
    roleBelongsToDepartment: jest.fn(async () => true),
    isActiveEmployee: jest.fn(async (id: number) => id !== 99),
    activeStageCodes: jest.fn(async () => ['open', 'new', 'screening', 'interviewing', 'technical_round', 'on_hold', 'selected', 'onboarding', 'rejected', 'joined', 'did_not_join']),
    create: jest.fn(async (c: any) => ({ ...base(), ...c, candidateId: 11, candidateCode: 'CAN-0011' })),
    update: jest.fn(async (_id: number, c: any) => (saved = { ...saved, ...c })),
    updateStage: jest.fn(async (_id: number, stage: string) => {
      calls.updateStage.push(stage);
      return (saved = { ...saved, stage });
    }),
    setAssignee: jest.fn(async (_id: number, emp: number | null) => (saved = { ...saved, assignedToEmpId: emp })),
    markDecision: jest.fn(async (_id: number, p: any) => (saved = { ...saved, stage: p.decision })),
    findMany: jest.fn(async () => ({ items: [saved], total: 1 })),
    getStats: jest.fn(async () => ({ total: 1, interviewing: 0, selected: 0, onboarding: 0 })),
  } as unknown as ICandidateRepository;
  const access = new CandidateAccessService(repo, { isAdmin: async (id: number) => id === ADMIN });
  const notifier = { candidateAssigned: jest.fn(async (i: { empId: number }) => void calls.notified.push(i.empId)) };
  const mailer = {
    sendRegretEmail: jest.fn(async (m: { to: string }) => {
      if (opts.mailFails) throw new Error('SMTP refused');
      calls.mails.push(m.to);
    }),
  };
  return { repo, access, notifier, mailer, calls };
}

const validInput = {
  name: 'Asha Patel',
  phone: '9876543210',
  email: 'asha@mail.com',
  dep_id: 2,
  role_id: 4,
  experience_type: 'fresher',
  source: 'linkedin',
  stage: 'new',
  key_skills: ['SQL'],
};

describe('recruitment use cases', () => {
  it('lets the assigned employee move a candidate to a plain stage, also one added in Master Data', async () => {
    const s = setup();
    const uc = new UpdateCandidateStageUseCase(s.repo, s.access);
    await uc.execute(10, 'interviewing', RECRUITER);
    await uc.execute(10, 'technical_round', RECRUITER);
    expect(s.calls.updateStage).toEqual(['interviewing', 'technical_round']);
  });

  it('hides the candidate from an employee it is not assigned to', async () => {
    const s = setup();
    await expect(new UpdateCandidateStageUseCase(s.repo, s.access).execute(10, 'interviewing', OTHER)).rejects.toBeInstanceOf(CandidateNotFoundError);
  });

  it('keeps Selected, Onboarding and an unknown stage out of a plain move', async () => {
    const s = setup();
    const uc = new UpdateCandidateStageUseCase(s.repo, s.access);
    await expect(uc.execute(10, 'selected', ADMIN)).rejects.toBeInstanceOf(CandidateValidationError);
    await expect(uc.execute(10, 'onboarding', ADMIN)).rejects.toBeInstanceOf(CandidateValidationError);
    await expect(uc.execute(10, 'party', ADMIN)).rejects.toBeInstanceOf(CandidateValidationError);
  });

  it('never moves a candidate in Onboarding', async () => {
    const s = setup({ candidate: base({ stage: 'onboarding', convertedToEmpId: 65, convertedToEmpCode: 'EMP-0028' }) });
    await expect(new UpdateCandidateStageUseCase(s.repo, s.access).execute(10, 'screening', ADMIN)).rejects.toThrow('EMP-0028');
  });

  it('lets only the Admin add a candidate, and refuses a duplicate with the same words as the form', async () => {
    const s = setup();
    const uc = new CreateCandidateUseCase(s.repo, s.notifier, s.access);
    await expect(uc.execute(validInput, RECRUITER)).rejects.toBeInstanceOf(CandidateAccessDeniedError);

    const d = setup({ duplicate: { type: 'employee', matchedOn: 'email', code: 'EMP-0012', name: 'Asha' } });
    await expect(new CreateCandidateUseCase(d.repo, d.notifier, d.access).execute(validInput, ADMIN)).rejects.toThrow(
      'This email address belongs to the employee Asha (EMP-0012).',
    );
  });

  it('refuses a negative CTC and a stage that needs its own form when adding', async () => {
    const s = setup();
    const uc = new CreateCandidateUseCase(s.repo, s.notifier, s.access);
    await expect(uc.execute({ ...validInput, experience_type: 'experienced', exp_years: 2, current_ctc: -5 }, ADMIN)).rejects.toThrow('cannot be negative');
    await expect(uc.execute({ ...validInput, stage: 'selected' }, ADMIN)).rejects.toBeInstanceOf(CandidateValidationError);
  });

  it('tells the employee a candidate was assigned to them', async () => {
    const s = setup();
    await new CreateCandidateUseCase(s.repo, s.notifier, s.access).execute({ ...validInput, assigned_to_emp_id: RECRUITER }, ADMIN);
    expect(s.calls.notified).toEqual([RECRUITER]);
  });

  it('edits the whole candidate by the same rules but never its stage', async () => {
    const s = setup();
    const uc = new UpdateCandidateUseCase(s.repo, s.notifier, s.access);
    await expect(uc.execute(10, { current_ctc: -1 }, ADMIN)).rejects.toThrow('cannot be negative');
    const res = await uc.execute(10, { key_skills: ['SQL', 'Excel'], stage: 'selected' } as any, ADMIN);
    expect(res.keySkills).toEqual(['SQL', 'Excel']);
    expect(res.stage).toBe('screening');
  });

  it('assigns only to an active employee and lets only the Admin do it', async () => {
    const s = setup({ candidate: base({ assignedToEmpId: null }) });
    const uc = new AssignCandidateUseCase(s.repo, s.notifier, s.access);
    await expect(uc.execute(10, RECRUITER, OTHER)).rejects.toBeInstanceOf(CandidateAccessDeniedError);
    await expect(uc.execute(10, 99, ADMIN)).rejects.toThrow('active employee');
    const res = await uc.execute(10, RECRUITER, ADMIN);
    expect(res.assignedToEmpId).toBe(RECRUITER);
    expect(s.calls.notified).toEqual([RECRUITER]);
  });

  it('sends the regret email with a rejection and says when it could not', async () => {
    const reject = { decision: 'rejected' as const, rejection_reason: 'skills_mismatch', send_regret_email: true };
    const ok = setup();
    const sent = await new MarkCandidateDecisionUseCase(ok.repo, ok.mailer, ok.access).execute(10, reject, ADMIN);
    expect(sent.regretEmail).toBe('sent');
    expect(ok.calls.mails).toEqual(['rohan@mail.com']);

    const bad = setup({ mailFails: true });
    const logged: string[] = [];
    const failed = await new MarkCandidateDecisionUseCase(bad.repo, bad.mailer, bad.access, (m) => logged.push(m)).execute(10, reject, ADMIN);
    expect(failed.regretEmail).toBe('failed');
    expect(failed.candidate.stage).toBe('rejected');
    expect(logged[0]).toContain('SMTP refused');

    const quiet = setup();
    const none = await new MarkCandidateDecisionUseCase(quiet.repo, quiet.mailer, quiet.access).execute(10, { ...reject, send_regret_email: false }, ADMIN);
    expect(none.regretEmail).toBe('not_requested');
    expect(quiet.mailer.sendRegretEmail).not.toHaveBeenCalled();
  });

  it('shows an employee only the candidates assigned to them', async () => {
    const s = setup();
    const uc = new ListCandidatesUseCase(s.repo, s.access);
    const mine = await uc.execute({ assignedTo: OTHER }, RECRUITER);
    expect(mine.scope).toBe('assigned');
    expect(s.repo.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ assignedTo: RECRUITER }));
    const all = await uc.execute({}, ADMIN);
    expect(all.scope).toBe('all');
    expect(s.repo.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ assignedTo: undefined }));
  });
});
