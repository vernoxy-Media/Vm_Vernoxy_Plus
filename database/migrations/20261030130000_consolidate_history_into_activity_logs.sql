-- Migration: 20261030130000_consolidate_history_into_activity_logs.sql
-- Description: Unifies 7 domain history and audit tables into the consolidated activity_logs table

-- 1. Migrate task_history into activity_logs
INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
SELECT
  'TASK',
  task_id,
  event_type::text,
  COALESCE(note, event_type::text),
  jsonb_strip_nulls(jsonb_build_object(
    'from_stage', from_stage,
    'to_stage', to_stage,
    'changes', changes,
    'note', note
  )),
  actor_id,
  created_at
FROM task_history;

-- 2. Migrate project_activity_logs into activity_logs
INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
SELECT
  'PROJECT',
  project_id,
  action_type,
  description,
  COALESCE(metadata::jsonb, '{}'::jsonb),
  actor_emp_id,
  created_at
FROM project_activity_logs;

-- 3. Migrate bug_history into activity_logs
INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
SELECT
  'BUG',
  bug_id,
  to_status::text,
  COALESCE(note, 'Status changed to ' || to_status::text),
  jsonb_strip_nulls(jsonb_build_object(
    'from_status', from_status,
    'to_status', to_status,
    'note', note
  )),
  actor_emp_id,
  created_at
FROM bug_history;

-- 4. Migrate leave_request_history into activity_logs
INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
SELECT
  'LEAVE_REQUEST',
  request_id,
  event,
  COALESCE(details, event),
  CASE WHEN details IS NOT NULL THEN jsonb_build_object('details', details) ELSE NULL END,
  performed_by,
  performed_at
FROM leave_request_history;

-- 5. Migrate expense_claim_history into activity_logs
INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
SELECT
  'EXPENSE_CLAIM',
  claim_id,
  event,
  COALESCE(remarks, details, event),
  jsonb_strip_nulls(jsonb_build_object(
    'remarks', remarks,
    'details', details
  )),
  performed_by,
  performed_at
FROM expense_claim_history;

-- 6. Migrate complaint_history into activity_logs
INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
SELECT
  'COMPLAINT',
  complaint_id,
  event,
  COALESCE(remarks, event),
  jsonb_strip_nulls(jsonb_build_object(
    'old_value', old_value,
    'new_value', new_value,
    'remarks', remarks,
    'is_internal', is_internal
  )),
  performed_by,
  created_at
FROM complaint_history;

-- 7. Migrate employee_history into activity_logs
INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
SELECT
  'EMPLOYEE',
  emp_id,
  event_type,
  title,
  jsonb_strip_nulls(jsonb_build_object(
    'department_ids', department_ids,
    'role_id', role_id,
    'manager_id', manager_id,
    'employment_type', employment_type,
    'salary', salary,
    'effective_date', effective_date,
    'reason', reason,
    'notes', notes
  )),
  created_by,
  COALESCE(created_at, effective_date::timestamptz)
FROM employee_history;

-- 8. Drop the 7 legacy tables
DROP TABLE IF EXISTS task_history CASCADE;
DROP TABLE IF EXISTS project_activity_logs CASCADE;
DROP TABLE IF EXISTS bug_history CASCADE;
DROP TABLE IF EXISTS leave_request_history CASCADE;
DROP TABLE IF EXISTS expense_claim_history CASCADE;
DROP TABLE IF EXISTS complaint_history CASCADE;
DROP TABLE IF EXISTS employee_history CASCADE;

