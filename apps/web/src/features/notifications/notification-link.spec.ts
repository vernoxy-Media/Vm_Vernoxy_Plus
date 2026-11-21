import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { notificationPath } from './notification-link';

describe('notificationPath', () => {
  it('opens the task itself', () => {
    assert.equal(notificationPath({ kind: 'task_assigned', entity_type: 'task', entity_id: 42 }), '/my-tasks?task=42');
    assert.equal(notificationPath({ kind: 'task_review_requested', entity_type: 'task', entity_id: 7 }), '/my-tasks?task=7');
    assert.equal(notificationPath({ kind: 'task_assigned' }), '/my-tasks');
  });

  it('opens the bug from My bugs', () => {
    assert.equal(notificationPath({ kind: 'bug_assigned', entity_type: 'bug', entity_id: 9 }), '/my-tasks?tab=bugs&bug=9');
    assert.equal(notificationPath({ kind: 'bug_ready_for_qa', entity_type: 'bug', entity_id: 3 }), '/my-tasks?tab=bugs&bug=3');
  });

  it('opens the project, also for a discussion mention', () => {
    assert.equal(notificationPath({ kind: 'project_discussion_mention', entity_type: 'project', entity_id: 5 }), '/projects/5');
    assert.equal(notificationPath({ kind: 'project_member_added', entity_type: 'project', entity_id: 5 }), '/projects/5');
  });

  it('sends a leave approver to the requests and the employee to their own leave', () => {
    assert.equal(notificationPath({ kind: 'leave_submitted', entity_type: 'LEAVE_REQUEST', entity_id: 1 }), '/leave?tab=management');
    assert.equal(notificationPath({ kind: 'leave_cancellation_requested', entity_type: 'LEAVE_REQUEST', entity_id: 1 }), '/leave?tab=management');
    assert.equal(notificationPath({ kind: 'leave_approved', entity_type: 'LEAVE_REQUEST', entity_id: 1 }), '/leave');
    assert.equal(notificationPath({ kind: 'leave_balance', entity_type: 'LEAVE_REQUEST' }), '/leave');
  });

  it('sends an expense approver to the claims and the claimant to their own expenses', () => {
    assert.equal(notificationPath({ kind: 'expense_claim_submitted', entity_type: 'EXPENSE_CLAIM', entity_id: 2 }), '/expense?tab=claims');
    assert.equal(notificationPath({ kind: 'expense_approval_reminder', entity_type: 'EXPENSE_CLAIM', entity_id: 2 }), '/expense?tab=claims');
    assert.equal(notificationPath({ kind: 'expense_claim_approved', entity_type: 'EXPENSE_CLAIM', entity_id: 2 }), '/expense');
  });

  it('keeps the places that already worked', () => {
    assert.equal(notificationPath({ kind: 'calendar_reminder', entity_type: 'CALENDAR_EVENT', entity_id: 1 }), '/calendar');
    assert.equal(notificationPath({ kind: 'follow_up_overdue', entity_type: 'FOLLOW_UP', entity_id: 1 }), '/sales/follow-ups');
    assert.equal(notificationPath({ kind: 'attendance_regularization_requested', entity_type: 'REGULARIZATION', entity_id: 8 }), '/attendance?tab=regularization&request=8');
    assert.equal(notificationPath({ kind: 'attendance_regularization_approved', entity_type: 'REGULARIZATION', entity_id: 8 }), '/attendance?tab=regularization');
  });

  it('opens complaints, performance, licenses, leads and knowledge base', () => {
    assert.equal(notificationPath({ kind: 'complaint_assigned', entity_type: 'COMPLAINT', entity_id: 4 }), '/complaints?tab=manage');
    assert.equal(notificationPath({ kind: 'complaint_resolved', entity_type: 'COMPLAINT', entity_id: 4 }), '/complaints');
    assert.equal(notificationPath({ kind: 'perf_review_reopened', entity_type: 'perf_reviews', entity_id: 1 }), '/performance');
    assert.equal(notificationPath({ kind: 'license_seat_assigned', entity_type: 'SOFTWARE_LICENSE', entity_id: 6 }), '/licenses?tab=my');
    assert.equal(notificationPath({ kind: 'license_expired', entity_type: 'SOFTWARE_LICENSE', entity_id: 6 }), '/licenses/6');
    assert.equal(notificationPath({ kind: 'client_converted', entity_type: 'LEAD', entity_id: 11 }), '/sales/leads/11');
    assert.equal(notificationPath({ kind: 'kb_article_published', entity_type: 'KB_ARTICLE', entity_id: 3 }), '/knowledge-base/articles/3');
  });

  it('has no page for a notification it does not know', () => {
    assert.equal(notificationPath({ kind: 'welcome_team_member', entity_type: 'employees', entity_id: 1 }), null);
    assert.equal(notificationPath({ kind: 'payroll_slip_released', entity_type: 'PAYROLL', entity_id: 1 }), null);
    assert.equal(notificationPath({}), null);
  });
});
