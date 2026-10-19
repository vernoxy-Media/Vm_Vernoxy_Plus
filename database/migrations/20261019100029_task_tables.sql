-- migrate:up

-- 1. task_counters
CREATE TABLE task_counters (
    counter_year integer NOT NULL,
    last_number integer NOT NULL DEFAULT 0,
    CONSTRAINT pk_task_counters PRIMARY KEY (counter_year),
    CONSTRAINT ck_task_counters_last_number_ge_zero CHECK (last_number >= 0)
);

CREATE TRIGGER trg_prevent_hard_delete_task_counters
    BEFORE DELETE ON task_counters
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_task_counters
    BEFORE TRUNCATE ON task_counters
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

-- 2. tasks
CREATE TABLE tasks (
    task_id integer GENERATED ALWAYS AS IDENTITY,
    task_code varchar(30) NOT NULL,
    title varchar(150) NOT NULL,
    description text NULL,
    priority task_priority NOT NULL DEFAULT 'medium',
    task_type_id integer NULL,
    due_date date NULL,
    allocated_minutes integer NULL,
    stage task_stage NOT NULL DEFAULT 'assigned',
    review_note varchar(500) NULL,
    requested_at timestamptz NULL,
    completed_at timestamptz NULL,
    completed_by integer NULL,
    self_approved boolean NOT NULL DEFAULT false,
    project_id integer NULL, -- nullable column with NO foreign key; Projects migration will add it
    row_version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_tasks PRIMARY KEY (task_id),
    CONSTRAINT fk_tasks_task_type_id FOREIGN KEY (task_type_id) REFERENCES master_lookup(lookup_id),
    CONSTRAINT fk_tasks_completed_by FOREIGN KEY (completed_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_tasks_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_tasks_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_tasks_title_non_blank CHECK (length(btrim(title)) >= 1),
    CONSTRAINT ck_tasks_description_len CHECK (description IS NULL OR (length(description) <= 10000 AND position('\0' in description) = 0)),
    CONSTRAINT ck_tasks_allocated_minutes CHECK (allocated_minutes IS NULL OR (allocated_minutes > 0 AND allocated_minutes <= 14400)),
    CONSTRAINT ck_tasks_completed_at_consistency CHECK ((stage = 'completed') = (completed_at IS NOT NULL)),
    CONSTRAINT ck_tasks_completed_by_consistency CHECK ((stage = 'completed') = (completed_by IS NOT NULL)),
    CONSTRAINT ck_tasks_requested_at_consistency CHECK (stage <> 'requested' OR requested_at IS NOT NULL),
    CONSTRAINT ck_tasks_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

CREATE UNIQUE INDEX ux_tasks_task_code
    ON tasks (task_code)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_tasks_stage_created
    ON tasks (stage, created_at DESC, task_id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_tasks_keyset
    ON tasks (created_at DESC, task_id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_tasks_completed_at
    ON tasks (completed_at DESC)
    WHERE stage = 'completed' AND deleted_at IS NULL;

CREATE INDEX ix_tasks_due_date
    ON tasks (due_date)
    WHERE deleted_at IS NULL AND stage <> 'completed' AND due_date IS NOT NULL;

CREATE INDEX ix_tasks_title_trgm
    ON tasks USING gin (lower(title) gin_trgm_ops)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_tasks_task_type_id
    ON tasks (task_type_id)
    WHERE task_type_id IS NOT NULL;

CREATE TRIGGER trg_prevent_hard_delete_tasks
    BEFORE DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_tasks
    BEFORE TRUNCATE ON tasks
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_tasks
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- 3. task_assignees
CREATE TABLE task_assignees (
    task_assignee_id integer GENERATED ALWAYS AS IDENTITY,
    task_id integer NOT NULL,
    employee_id integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_task_assignees PRIMARY KEY (task_assignee_id),
    CONSTRAINT fk_task_assignees_task_id FOREIGN KEY (task_id) REFERENCES tasks(task_id),
    CONSTRAINT fk_task_assignees_employee_id FOREIGN KEY (employee_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_task_assignees_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_task_assignees_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_task_assignees_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_task_assignees_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

CREATE UNIQUE INDEX ux_task_assignees_task_emp
    ON task_assignees (task_id, employee_id)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_task_assignees_emp_task
    ON task_assignees (employee_id, task_id)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_task_assignees_task
    ON task_assignees (task_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_prevent_hard_delete_task_assignees
    BEFORE DELETE ON task_assignees
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_task_assignees
    BEFORE TRUNCATE ON task_assignees
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_task_assignees
    BEFORE UPDATE ON task_assignees
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- 4. task_history (append-only)
CREATE TABLE task_history (
    history_id bigint GENERATED ALWAYS AS IDENTITY,
    task_id integer NOT NULL,
    event_type task_event_type NOT NULL,
    actor_id integer NULL,
    from_stage task_stage NULL,
    to_stage task_stage NULL,
    note varchar(500) NULL,
    changes jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_task_history PRIMARY KEY (history_id),
    CONSTRAINT fk_task_history_task_id FOREIGN KEY (task_id) REFERENCES tasks(task_id),
    CONSTRAINT fk_task_history_actor_id FOREIGN KEY (actor_id) REFERENCES employees(emp_id)
);

CREATE INDEX ix_task_history_task_history_id
    ON task_history (task_id, history_id DESC);

CREATE OR REPLACE FUNCTION fn_prevent_task_history_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'task_history is append-only: updates and deletes are strictly prohibited';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_update_delete_task_history
    BEFORE UPDATE OR DELETE ON task_history
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_task_history_mutation();

CREATE TRIGGER trg_prevent_truncate_task_history
    BEFORE TRUNCATE ON task_history
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

-- migrate:down
DROP TRIGGER IF EXISTS trg_prevent_truncate_task_history ON task_history;
DROP TRIGGER IF EXISTS trg_prevent_update_delete_task_history ON task_history;
DROP FUNCTION IF EXISTS fn_prevent_task_history_mutation();
DROP TABLE IF EXISTS task_history;

DROP TRIGGER IF EXISTS trg_handle_update_audit_task_assignees ON task_assignees;
DROP TRIGGER IF EXISTS trg_prevent_truncate_task_assignees ON task_assignees;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_task_assignees ON task_assignees;
DROP TABLE IF EXISTS task_assignees;

DROP TRIGGER IF EXISTS trg_handle_update_audit_tasks ON tasks;
DROP TRIGGER IF EXISTS trg_prevent_truncate_tasks ON tasks;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_tasks ON tasks;
DROP TABLE IF EXISTS tasks;

DROP TRIGGER IF EXISTS trg_prevent_truncate_task_counters ON task_counters;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_task_counters ON task_counters;
DROP TABLE IF EXISTS task_counters;
