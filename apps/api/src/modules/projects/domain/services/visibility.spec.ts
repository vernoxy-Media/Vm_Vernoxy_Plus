import { canMoveBug, canSeeActivity, canSeeBug, canSeeDiscussionMessage, seesEverything, taskKeyOfMessage, Viewer } from './visibility';

const admin: Viewer = { empId: 1, isAdmin: true, isPM: false };
const pm: Viewer = { empId: 2, isAdmin: false, isPM: true };
const asha: Viewer = { empId: 3, isAdmin: false, isPM: false };

describe('project visibility', () => {
  it('lets the admin and the project manager see everything, and nobody else', () => {
    expect(seesEverything(admin)).toBe(true);
    expect(seesEverything(pm)).toBe(true);
    expect(seesEverything(asha)).toBe(false);
  });

  describe('bugs', () => {
    const mine = { assigned_to: 3, reported_by: 9 };
    const reportedByMe = { assigned_to: 8, reported_by: 3 };
    const someoneElses = { assigned_to: 8, reported_by: 9 };

    it('shows a member the bugs assigned to or reported by them, and hides the rest', () => {
      expect(canSeeBug(asha, mine)).toBe(true);
      expect(canSeeBug(asha, reportedByMe)).toBe(true);
      expect(canSeeBug(asha, someoneElses)).toBe(false);
    });

    it('shows every bug to the admin and the project manager', () => {
      expect(canSeeBug(admin, someoneElses)).toBe(true);
      expect(canSeeBug(pm, someoneElses)).toBe(true);
    });

    it('leaves the developer stages to the assignee, the QA stages to the reporter, and triage to a manager', () => {
      // asha is the developer on "mine" and the tester on "reportedByMe"
      expect(canMoveBug(asha, mine, 'ready_for_dev')).toBe(true);
      expect(canMoveBug(asha, mine, 'dev_in_progress')).toBe(true);
      expect(canMoveBug(asha, mine, 'ready_for_qa')).toBe(false);
      expect(canMoveBug(asha, reportedByMe, 'ready_for_qa')).toBe(true);
      expect(canMoveBug(asha, reportedByMe, 'qa_in_progress')).toBe(true);
      expect(canMoveBug(asha, reportedByMe, 'dev_in_progress')).toBe(false);
      expect(canMoveBug(asha, mine, 'new')).toBe(false);
      expect(canMoveBug(asha, mine, 'open')).toBe(false);
      expect(canMoveBug(asha, someoneElses, 'dev_in_progress')).toBe(false);
    });

    it('lets the admin and the project manager move a bug from any status', () => {
      for (const from of ['new', 'open', 'ready_for_dev', 'dev_in_progress', 'ready_for_qa', 'qa_in_progress']) {
        expect(canMoveBug(pm, someoneElses, from)).toBe(true);
        expect(canMoveBug(admin, someoneElses, from)).toBe(true);
      }
    });

    it('compares ids even when they arrive as text', () => {
      expect(canSeeBug(asha, { assigned_to: '3' as unknown as number, reported_by: 9 })).toBe(true);
    });
  });

  describe('discussion', () => {
    const codes = new Set(['TSK-2026-0016']);

    it('reads the task a comment belongs to', () => {
      expect(taskKeyOfMessage('[TSK-2026-0016] looks good')).toBe('TSK-2026-0016');
      expect(taskKeyOfMessage('[TSK-2026-0016-02] sub-task note')).toBe('TSK-2026-0016-02');
      expect(taskKeyOfMessage('good morning team')).toBeNull();
      expect(taskKeyOfMessage('see [TSK-2026-0016] later')).toBeNull();
    });

    it('shows team messages to every member', () => {
      expect(canSeeDiscussionMessage(asha, { message: 'standup at 10', sender_emp_id: 9 }, codes)).toBe(true);
    });

    it('shows a task comment only to people who can see that task, or who wrote it', () => {
      expect(canSeeDiscussionMessage(asha, { message: '[TSK-2026-0016] ok', sender_emp_id: 9 }, codes)).toBe(true);
      expect(canSeeDiscussionMessage(asha, { message: '[TSK-2026-0099] secret', sender_emp_id: 9 }, codes)).toBe(false);
      expect(canSeeDiscussionMessage(asha, { message: '[TSK-2026-0099] mine', sender_emp_id: 3 }, codes)).toBe(true);
      expect(canSeeDiscussionMessage(admin, { message: '[TSK-2026-0099] secret', sender_emp_id: 9 }, codes)).toBe(true);
    });
  });

  describe('activity', () => {
    it('shows a member what they did and what happened to their own work', () => {
      expect(canSeeActivity(asha, { actor_emp_id: 3, description: 'anything' }, [])).toBe(true);
      expect(canSeeActivity(asha, { actor_emp_id: 9, description: 'Task TSK-2026-0016 was moved to Sprint 1.' }, ['TSK-2026-0016'])).toBe(true);
      expect(canSeeActivity(asha, { actor_emp_id: 9, description: 'Task TSK-2026-0099 was moved to Sprint 1.' }, ['TSK-2026-0016'])).toBe(false);
      expect(canSeeActivity(asha, { actor_emp_id: 9, description: null }, ['TSK-2026-0016'])).toBe(false);
    });

    it('shows everything to a manager', () => {
      expect(canSeeActivity(pm, { actor_emp_id: 9, description: 'x' }, [])).toBe(true);
    });
  });
});
