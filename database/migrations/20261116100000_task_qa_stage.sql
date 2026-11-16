-- migrate:up
-- Jira-style QA step for project tasks: when a developer finishes a task that has a QA assignee, the task moves to
-- "In QA" instead of going straight to approval. QA passes it on to the approver or sends it back to the developer.
ALTER TYPE task_stage ADD VALUE IF NOT EXISTS 'in_qa' AFTER 'in_progress';

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS qa_assignee_id INTEGER NULL;
ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_qa_assignee_id FOREIGN KEY (qa_assignee_id) REFERENCES employees (emp_id);
CREATE INDEX IF NOT EXISTS ix_tasks_qa_assignee_id ON tasks (qa_assignee_id) WHERE qa_assignee_id IS NOT NULL AND deleted_at IS NULL;

INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active)
SELECT 'task_stage', 'in_qa', 'In QA', 35, true
WHERE NOT EXISTS (SELECT 1 FROM master_lookup WHERE lookup_type = 'task_stage' AND code = 'in_qa');

-- migrate:down
-- A Postgres enum value cannot be dropped; the unused 'in_qa' value is left in place.
DELETE FROM master_lookup WHERE lookup_type = 'task_stage' AND code = 'in_qa';
DROP INDEX IF EXISTS ix_tasks_qa_assignee_id;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_qa_assignee_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS qa_assignee_id;
