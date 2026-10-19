-- migrate:up
CREATE TYPE task_stage AS ENUM ('assigned', 'in_progress', 'requested', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE task_event_type AS ENUM (
    'created',
    'edited',
    'assignee_added',
    'assignee_removed',
    'stage_changed',
    'requested',
    'withdrawn',
    'approved',
    'rejected',
    'reopened'
);

-- migrate:down
DROP TYPE IF EXISTS task_event_type;
DROP TYPE IF EXISTS task_priority;
DROP TYPE IF EXISTS task_stage;
