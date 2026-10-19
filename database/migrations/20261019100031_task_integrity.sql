-- migrate:up

-- 1. tasks integrity trigger
CREATE OR REPLACE FUNCTION fn_tasks_integrity()
RETURNS trigger AS $$
BEGIN
    -- If row is being soft-deleted, skip business logic
    IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 1. Validate task_type_id
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

    -- 2. On INSERT, stage defaults to assigned; if requested, set requested_at
    IF TG_OP = 'INSERT' THEN
        IF NEW.stage = 'requested' AND NEW.requested_at IS NULL THEN
            NEW.requested_at := clock_timestamp();
        END IF;
        RETURN NEW;
    END IF;

    -- 3. On UPDATE: Auto-increment row_version
    NEW.row_version := OLD.row_version + 1;

    -- 4. Completed task lock: ANY update to a row whose OLD stage and NEW stage are both completed is rejected
    IF OLD.stage = 'completed' AND NEW.stage = 'completed' THEN
        RAISE EXCEPTION 'Completed task is locked: cannot be updated';
    END IF;

    -- 5. Stage transition matrix (actor-agnostic database enforcement)
    IF OLD.stage <> NEW.stage THEN
        IF OLD.stage = 'assigned' AND NEW.stage <> 'in_progress' THEN
            RAISE EXCEPTION 'Invalid stage transition from % to %', OLD.stage, NEW.stage;
        ELSIF OLD.stage = 'in_progress' AND NEW.stage NOT IN ('assigned', 'requested') THEN
            RAISE EXCEPTION 'Invalid stage transition from % to %', OLD.stage, NEW.stage;
        ELSIF OLD.stage = 'requested' AND NEW.stage NOT IN ('in_progress', 'completed') THEN
            RAISE EXCEPTION 'Invalid stage transition from % to %', OLD.stage, NEW.stage;
        ELSIF OLD.stage = 'completed' AND NEW.stage <> 'in_progress' THEN
            RAISE EXCEPTION 'Invalid stage transition from % to %', OLD.stage, NEW.stage;
        END IF;

        -- Entering requested sets/needs requested_at
        IF NEW.stage = 'requested' THEN
            NEW.requested_at := COALESCE(NEW.requested_at, clock_timestamp());
        END IF;

        -- Leaving completed requires completed_at and completed_by to be cleared
        IF OLD.stage = 'completed' AND NEW.stage = 'in_progress' THEN
            NEW.completed_at := NULL;
            NEW.completed_by := NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_integrity
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION fn_tasks_integrity();

-- 2. task_assignees integrity trigger
CREATE OR REPLACE FUNCTION fn_task_assignees_integrity()
RETURNS trigger AS $$
BEGIN
    -- Check employee status at insert/update
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.employee_id <> OLD.employee_id) THEN
        PERFORM 1 FROM employees
        WHERE emp_id = NEW.employee_id
          AND status = 'Active'
          AND deleted_at IS NULL;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Assigned employee % must be Active and not deleted', NEW.employee_id;
        END IF;
    END IF;

    -- No insert or soft delete on a task whose stage is completed
    IF TG_OP = 'INSERT' THEN
        PERFORM 1 FROM tasks
        WHERE task_id = NEW.task_id
          AND stage = 'completed'
          AND deleted_at IS NULL;
        IF FOUND THEN
            RAISE EXCEPTION 'Cannot modify assignees of completed task';
        END IF;
    ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        PERFORM 1 FROM tasks
        WHERE task_id = OLD.task_id
          AND stage = 'completed'
          AND deleted_at IS NULL;
        IF FOUND THEN
            RAISE EXCEPTION 'Cannot modify assignees of completed task';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_assignees_integrity
    BEFORE INSERT OR UPDATE ON task_assignees
    FOR EACH ROW
    EXECUTE FUNCTION fn_task_assignees_integrity();

-- 3. Deferred constraint trigger to ensure every non-deleted task has at least ONE non-deleted assignee
CREATE OR REPLACE FUNCTION fn_check_task_has_assignee()
RETURNS trigger AS $$
DECLARE
    v_task_id integer;
    v_is_deleted boolean;
BEGIN
    IF TG_TABLE_NAME = 'tasks' THEN
        v_task_id := NEW.task_id;
        v_is_deleted := (NEW.deleted_at IS NOT NULL);
    ELSE
        v_task_id := COALESCE(NEW.task_id, OLD.task_id);
        SELECT (deleted_at IS NOT NULL) INTO v_is_deleted FROM tasks WHERE task_id = v_task_id;
    END IF;

    -- If task does not exist or is soft-deleted, skip assignee check
    IF v_is_deleted IS NULL OR v_is_deleted = true THEN
        RETURN NULL;
    END IF;

    -- Check if at least one active (non-deleted) assignee exists
    IF NOT EXISTS (
        SELECT 1 FROM task_assignees
        WHERE task_id = v_task_id AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Task % must have at least one active assignee', v_task_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_task_must_have_assignee_tasks
    AFTER INSERT OR UPDATE ON tasks
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_task_has_assignee();

CREATE CONSTRAINT TRIGGER trg_task_must_have_assignee_assignees
    AFTER INSERT OR UPDATE OR DELETE ON task_assignees
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_task_has_assignee();

-- 4. master_lookup protection trigger for task_type
CREATE OR REPLACE FUNCTION fn_protect_task_type_lookup()
RETURNS trigger AS $$
BEGIN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND OLD.lookup_type = 'task_type' THEN
        IF EXISTS (SELECT 1 FROM tasks WHERE task_type_id = OLD.lookup_id AND deleted_at IS NULL) THEN
            RAISE EXCEPTION 'Cannot soft-delete task_type lookup % while active tasks reference it', OLD.lookup_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_task_type_lookup
    BEFORE UPDATE ON master_lookup
    FOR EACH ROW
    EXECUTE FUNCTION fn_protect_task_type_lookup();

-- 5. Seeds: master_lookup task_type values
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('task_type', 'development', 'Development', 10),
    ('task_type', 'requirement_gathering', 'Requirement Gathering', 20),
    ('task_type', 'documentation', 'Documentation', 30),
    ('task_type', 'testing', 'Testing', 40),
    ('task_type', 'debug', 'Debug', 50),
    ('task_type', 'other', 'Other', 60)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- migrate:down
DELETE FROM master_lookup WHERE lookup_type = 'task_type';

DROP TRIGGER IF EXISTS trg_protect_task_type_lookup ON master_lookup;
DROP FUNCTION IF EXISTS fn_protect_task_type_lookup();

DROP TRIGGER IF EXISTS trg_task_must_have_assignee_assignees ON task_assignees;
DROP TRIGGER IF EXISTS trg_task_must_have_assignee_tasks ON tasks;
DROP FUNCTION IF EXISTS fn_check_task_has_assignee();

DROP TRIGGER IF EXISTS trg_task_assignees_integrity ON task_assignees;
DROP FUNCTION IF EXISTS fn_task_assignees_integrity();

DROP TRIGGER IF EXISTS trg_tasks_integrity ON tasks;
DROP FUNCTION IF EXISTS fn_tasks_integrity();
