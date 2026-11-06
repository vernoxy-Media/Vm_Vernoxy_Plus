-- migrate:up
-- Every work item has a start date and a due date, like a Jira issue: tasks (and their sub-tasks) get a
-- start date next to the due date they already had, and bugs get both.
ALTER TABLE tasks        ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE project_bugs ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE project_bugs ADD COLUMN IF NOT EXISTS due_date   date;

-- A start date is never after its due date. Both are optional, so rows without dates stay valid.
ALTER TABLE tasks
    ADD CONSTRAINT ck_tasks_start_before_due
    CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date);
ALTER TABLE project_bugs
    ADD CONSTRAINT ck_project_bugs_start_before_due
    CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date);

-- migrate:down
ALTER TABLE project_bugs DROP CONSTRAINT IF EXISTS ck_project_bugs_start_before_due;
ALTER TABLE tasks        DROP CONSTRAINT IF EXISTS ck_tasks_start_before_due;
ALTER TABLE project_bugs DROP COLUMN IF EXISTS due_date;
ALTER TABLE project_bugs DROP COLUMN IF EXISTS start_date;
ALTER TABLE tasks        DROP COLUMN IF EXISTS start_date;
