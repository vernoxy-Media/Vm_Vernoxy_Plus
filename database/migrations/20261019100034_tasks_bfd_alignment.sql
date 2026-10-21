-- migrate:up

-- 1. Add 'hold' to task_stage enum
ALTER TYPE task_stage ADD VALUE IF NOT EXISTS 'hold' AFTER 'in_progress';

-- 2. Add sub-tasks, lead, source, hold_reason, and other_task_type columns to tasks table
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS hold_reason text NULL,
    ADD COLUMN IF NOT EXISTS source varchar(20) NOT NULL DEFAULT 'personal',
    ADD COLUMN IF NOT EXISTS parent_task_id integer NULL,
    ADD COLUMN IF NOT EXISTS lead_employee_id integer NULL,
    ADD COLUMN IF NOT EXISTS has_sub_tasks boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS other_task_type varchar(100) NULL;

-- 3. Add foreign key constraints & check constraints
ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_parent_task_id FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_tasks_lead_employee_id FOREIGN KEY (lead_employee_id) REFERENCES employees(emp_id),
    ADD CONSTRAINT ck_tasks_source CHECK (source IN ('personal', 'project', 'quick'));

CREATE INDEX IF NOT EXISTS ix_tasks_parent_task_id
    ON tasks (parent_task_id)
    WHERE deleted_at IS NULL AND parent_task_id IS NOT NULL;

-- 4. Update fn_tasks_integrity with the updated state machine & hold rules
CREATE OR REPLACE FUNCTION fn_tasks_integrity()
RETURNS trigger AS $$
BEGIN
    -- If row is being soft-deleted, skip business logic
    IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 1. Validate task_type_id if provided
    IF NEW.task_type_id IS NOT NULL THEN
        PERFORM 1 FROM master_lookup
        WHERE lookup_id = NEW.task_type_id
          AND lookup_type = 'task_type'
          AND is_active = true
          AND deleted_at IS NULL;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'task_type_id % must reference an active master_lookup of type task_type', NEW.task_type_id;
        END IF;
    END IF;

    -- 2. On INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.stage = 'requested' AND NEW.requested_at IS NULL THEN
            NEW.requested_at := clock_timestamp();
        END IF;
        IF NEW.stage = 'hold' AND (NEW.hold_reason IS NULL OR length(btrim(NEW.hold_reason)) = 0) THEN
            RAISE EXCEPTION 'Hold reason is mandatory when placing a task on hold';
        END IF;
        RETURN NEW;
    END IF;

    -- 3. On UPDATE: Auto-increment row_version
    NEW.row_version := OLD.row_version + 1;

    -- 4. Approved/Completed task lock: Approved task CANNOT move to any stage or be edited
    IF OLD.stage = 'completed' AND NEW.stage <> 'completed' THEN
        RAISE EXCEPTION 'Approved task is locked and cannot be moved to any other stage';
    END IF;
    IF OLD.stage = 'completed' AND NEW.stage = 'completed' THEN
        RAISE EXCEPTION 'Approved task is locked: cannot be updated';
    END IF;

    -- 5. Stage transition matrix (Section 3.3 BFD)
    -- To Do (assigned) -> In Progress, Hold
    -- In Progress -> Hold, Submitted (requested)
    -- Hold -> To Do (assigned), In Progress
    -- Submitted (requested) -> In Progress (rework), Approved (completed)
    -- Approved (completed) -> Locked
    IF OLD.stage <> NEW.stage THEN
        IF OLD.stage = 'assigned' AND NEW.stage NOT IN ('in_progress', 'hold') THEN
            RAISE EXCEPTION 'Invalid stage transition from % to %', OLD.stage, NEW.stage;
        ELSIF OLD.stage = 'in_progress' AND NEW.stage NOT IN ('hold', 'requested') THEN
            RAISE EXCEPTION 'Invalid stage transition from % to %', OLD.stage, NEW.stage;
        ELSIF OLD.stage = 'hold' AND NEW.stage NOT IN ('assigned', 'in_progress') THEN
            RAISE EXCEPTION 'Invalid stage transition from % to %', OLD.stage, NEW.stage;
        ELSIF OLD.stage = 'requested' AND NEW.stage NOT IN ('in_progress', 'completed') THEN
            RAISE EXCEPTION 'Invalid stage transition from % to %', OLD.stage, NEW.stage;
        END IF;

        -- Entering hold requires mandatory hold_reason
        IF NEW.stage = 'hold' AND (NEW.hold_reason IS NULL OR length(btrim(NEW.hold_reason)) = 0) THEN
            RAISE EXCEPTION 'Hold reason is mandatory when placing a task on hold';
        END IF;

        -- Entering requested sets/needs requested_at
        IF NEW.stage = 'requested' THEN
            NEW.requested_at := COALESCE(NEW.requested_at, clock_timestamp());
        END IF;

        -- Entering completed sets completed_at and requires completed_by
        IF NEW.stage = 'completed' THEN
            NEW.completed_at := COALESCE(NEW.completed_at, clock_timestamp());
            IF NEW.completed_by IS NULL THEN
                NEW.completed_by := NEW.updated_by;
            END IF;
        END IF;
    END IF;

    -- 6. Self-approval guard: Task creator/assignee cannot approve unless admin
    IF OLD.stage = 'requested' AND NEW.stage = 'completed' THEN
        IF NEW.completed_by IS NULL THEN
            RAISE EXCEPTION 'Completed task must specify completed_by';
        END IF;
        IF NEW.self_approved = false THEN
            IF EXISTS (
                SELECT 1 FROM task_assignees
                WHERE task_id = NEW.task_id AND employee_id = NEW.completed_by
            ) THEN
                RAISE EXCEPTION 'Assignee cannot approve their own task';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- migrate:down
-- Rollback
ALTER TABLE tasks
    DROP CONSTRAINT IF EXISTS fk_tasks_parent_task_id,
    DROP CONSTRAINT IF EXISTS fk_tasks_lead_employee_id,
    DROP CONSTRAINT IF EXISTS ck_tasks_source,
    DROP COLUMN IF EXISTS hold_reason,
    DROP COLUMN IF EXISTS source,
    DROP COLUMN IF EXISTS parent_task_id,
    DROP COLUMN IF EXISTS lead_employee_id,
    DROP COLUMN IF EXISTS has_sub_tasks,
    DROP COLUMN IF EXISTS other_task_type;
