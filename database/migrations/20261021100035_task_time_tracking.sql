-- migrate:up
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS started_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS actual_minutes integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_timer_running boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS timer_started_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS work_logs jsonb NOT NULL DEFAULT '[]'::jsonb;

-- migrate:down
ALTER TABLE tasks
    DROP COLUMN IF EXISTS work_logs,
    DROP COLUMN IF EXISTS timer_started_at,
    DROP COLUMN IF EXISTS is_timer_running,
    DROP COLUMN IF EXISTS actual_minutes,
    DROP COLUMN IF EXISTS started_at;
