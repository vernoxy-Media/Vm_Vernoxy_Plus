-- migrate:up
-- =============================================================================
-- Task Module BFD 1.1 and Project Management BFD 1.1: master data for every
-- dropdown on the task and bug screens (no hardcoded options in the UI).
-- The codes match the existing database enums, so no data changes are needed.
-- =============================================================================

INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active) VALUES
  ('task_priority', 'high',   'High',   10, true),
  ('task_priority', 'medium', 'Medium', 20, true),
  ('task_priority', 'low',    'Low',    30, true),

  ('task_stage', 'assigned',    'To Do',       10, true),
  ('task_stage', 'in_progress', 'In Progress', 20, true),
  ('task_stage', 'hold',        'Hold',        30, true),
  ('task_stage', 'requested',   'Submitted',   40, true),
  ('task_stage', 'completed',   'Approved',    50, true),

  ('task_source', 'personal', 'Personal Task',                10, true),
  ('task_source', 'project',  'Project Task',                 20, true),
  ('task_source', 'quick',    'Task created by an employee',  30, true),

  ('bug_type', 'frontend', 'Frontend', 10, true),
  ('bug_type', 'backend',  'Backend',  20, true),
  ('bug_type', 'ui',       'UI',       30, true),
  ('bug_type', 'database', 'Database', 40, true),
  ('bug_type', 'other',    'Other',    50, true),

  ('bug_priority', 'high',   'High',   10, true),
  ('bug_priority', 'medium', 'Medium', 20, true),
  ('bug_priority', 'low',    'Low',    30, true),

  ('bug_status', 'new',             'New',             10, true),
  ('bug_status', 'open',            'Open',            20, true),
  ('bug_status', 'ready_for_dev',   'Ready for Dev',   30, true),
  ('bug_status', 'dev_in_progress', 'Dev in Progress', 40, true),
  ('bug_status', 'ready_for_qa',    'Ready for QA',    50, true),
  ('bug_status', 'qa_in_progress',  'QA in Progress',  60, true),
  ('bug_status', 'done',            'Done',            70, true),
  ('bug_status', 'not_a_bug',       'Not a Bug',       80, true)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL DO NOTHING;

-- BFD 2.3 names the last task type "Others".
UPDATE master_lookup SET label = 'Others', updated_at = clock_timestamp()
WHERE lookup_type = 'task_type' AND code = 'other' AND label = 'Other' AND deleted_at IS NULL;

-- migrate:down
UPDATE master_lookup SET label = 'Other', updated_at = clock_timestamp()
WHERE lookup_type = 'task_type' AND code = 'other' AND label = 'Others' AND deleted_at IS NULL;

UPDATE master_lookup SET deleted_at = clock_timestamp()
WHERE lookup_type IN ('task_priority', 'task_stage', 'task_source', 'bug_type', 'bug_priority', 'bug_status')
  AND deleted_at IS NULL;
