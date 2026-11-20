-- migrate:up

-- A bug let tasks be approved while their timer kept running. Stop those timers and close the time
-- at the moment the task was approved. The integrity trigger locks completed rows, so lift it for this fix only.
ALTER TABLE tasks DISABLE TRIGGER trg_tasks_integrity;

UPDATE tasks
SET actual_minutes = COALESCE(actual_minutes, 0)
        + GREATEST(0, CEIL(EXTRACT(EPOCH FROM (completed_at - timer_started_at)) / 60))::int,
    is_timer_running = false,
    timer_started_at = NULL
WHERE is_timer_running = true
  AND stage = 'completed'
  AND timer_started_at IS NOT NULL
  AND completed_at IS NOT NULL;

UPDATE tasks
SET is_timer_running = false, timer_started_at = NULL
WHERE is_timer_running = true AND stage = 'completed';

-- Fire any deferred constraint triggers queued by the updates above, or ALTER TABLE fails (55006).
SET CONSTRAINTS ALL IMMEDIATE;

ALTER TABLE tasks ENABLE TRIGGER trg_tasks_integrity;

-- migrate:down
-- Data fix only; nothing to undo.
