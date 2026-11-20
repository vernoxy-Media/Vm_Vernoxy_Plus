-- migrate:up
-- Task Priority, Source and Stage are fixed lists (a task stores the code), but their names and order now come from
-- master data and the Admin keeps them in Settings > Tasks.

-- The database enum also has "critical"; it was missing from master data, so it could not be named or filtered.
INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active) VALUES
  ('task_priority', 'critical', 'Highest', 5, true)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL DO NOTHING;

-- Make the stage names in master data the same as the names on the task board. Only the old defaults are changed,
-- so a name an Admin already chose is kept.
UPDATE master_lookup SET label = 'On Hold',   updated_at = clock_timestamp() WHERE lookup_type = 'task_stage' AND code = 'hold'      AND label = 'Hold'      AND deleted_at IS NULL;
UPDATE master_lookup SET label = 'In Review', updated_at = clock_timestamp() WHERE lookup_type = 'task_stage' AND code = 'requested' AND label = 'Submitted' AND deleted_at IS NULL;
UPDATE master_lookup SET label = 'Done',      updated_at = clock_timestamp() WHERE lookup_type = 'task_stage' AND code = 'completed' AND label = 'Approved'  AND deleted_at IS NULL;

-- migrate:down
UPDATE master_lookup SET label = 'Hold',      updated_at = clock_timestamp() WHERE lookup_type = 'task_stage' AND code = 'hold'      AND label = 'On Hold'   AND deleted_at IS NULL;
UPDATE master_lookup SET label = 'Submitted', updated_at = clock_timestamp() WHERE lookup_type = 'task_stage' AND code = 'requested' AND label = 'In Review' AND deleted_at IS NULL;
UPDATE master_lookup SET label = 'Approved',  updated_at = clock_timestamp() WHERE lookup_type = 'task_stage' AND code = 'completed' AND label = 'Done'      AND deleted_at IS NULL;
DELETE FROM master_lookup WHERE lookup_type = 'task_priority' AND code = 'critical';
