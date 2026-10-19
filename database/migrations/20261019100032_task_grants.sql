-- migrate:up

-- 1. Grant SELECT, INSERT, UPDATE to pulse_app (NO DELETE, NO TRUNCATE)
GRANT SELECT, INSERT, UPDATE ON
    task_counters,
    tasks,
    task_assignees,
    notifications
TO pulse_app;

-- 2. Grant SELECT, INSERT only to pulse_app on task_history (NO UPDATE, NO DELETE, NO TRUNCATE)
GRANT SELECT, INSERT ON
    task_history
TO pulse_app;

-- 3. Grant USAGE, SELECT on all sequences to pulse_app
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;

-- 4. pulse_readonly gets NO access to task tables or notifications

-- migrate:down
REVOKE SELECT, INSERT ON
    task_history
FROM pulse_app;

REVOKE SELECT, INSERT, UPDATE ON
    task_counters,
    tasks,
    task_assignees,
    notifications
FROM pulse_app;
