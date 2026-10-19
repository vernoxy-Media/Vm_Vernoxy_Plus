-- migrate:up

-- 1. attendance_days table
CREATE TABLE attendance_days (
    attendance_id integer GENERATED ALWAYS AS IDENTITY,
    emp_id integer NOT NULL,
    work_date date NOT NULL,
    check_in_at timestamptz NOT NULL,
    check_out_at timestamptz NULL,
    break_minutes integer NOT NULL DEFAULT 0,
    production_minutes integer NOT NULL DEFAULT 0,
    day_status attendance_day_status NOT NULL DEFAULT 'incomplete',
    source attendance_source NOT NULL DEFAULT 'web',
    worked_on_non_working_day boolean NOT NULL DEFAULT false,
    note text NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_attendance_days PRIMARY KEY (attendance_id),
    CONSTRAINT fk_attendance_days_emp_id FOREIGN KEY (emp_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_days_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_days_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_days_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_attendance_days_check_out_ge_in CHECK (check_out_at IS NULL OR check_out_at >= check_in_at),
    CONSTRAINT ck_attendance_days_break_minutes_non_negative CHECK (break_minutes >= 0),
    CONSTRAINT ck_attendance_days_production_minutes_non_negative CHECK (production_minutes >= 0),
    CONSTRAINT ck_attendance_days_break_le_session CHECK (
        check_out_at IS NULL OR break_minutes <= floor(extract(epoch FROM (check_out_at - check_in_at)) / 60)
    ),
    CONSTRAINT ck_attendance_days_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

CREATE UNIQUE INDEX ux_attendance_days_emp_date
    ON attendance_days (emp_id, work_date)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_attendance_days_emp_month
    ON attendance_days (emp_id, work_date)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_prevent_hard_delete_attendance_days
    BEFORE DELETE ON attendance_days
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_attendance_days
    BEFORE TRUNCATE ON attendance_days
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_attendance_days
    BEFORE UPDATE ON attendance_days
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- 2. attendance_corrections table
CREATE TABLE attendance_corrections (
    correction_id integer GENERATED ALWAYS AS IDENTITY,
    emp_id integer NOT NULL,
    attendance_id integer NULL,
    work_date date NOT NULL,
    requested_check_in_at timestamptz NOT NULL,
    requested_check_out_at timestamptz NOT NULL,
    requested_break_minutes integer NOT NULL DEFAULT 0,
    reason text NOT NULL,
    status correction_status NOT NULL DEFAULT 'pending',
    decided_at timestamptz NULL,
    decided_by integer NULL,
    rejection_reason text NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_attendance_corrections PRIMARY KEY (correction_id),
    CONSTRAINT fk_attendance_corrections_emp_id FOREIGN KEY (emp_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_corrections_attendance_id FOREIGN KEY (attendance_id) REFERENCES attendance_days(attendance_id),
    CONSTRAINT fk_attendance_corrections_decided_by FOREIGN KEY (decided_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_corrections_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_corrections_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_corrections_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_attendance_corrections_out_ge_in CHECK (requested_check_out_at >= requested_check_in_at),
    CONSTRAINT ck_attendance_corrections_break_non_negative CHECK (requested_break_minutes >= 0),
    CONSTRAINT ck_attendance_corrections_break_le_session CHECK (
        requested_break_minutes <= floor(extract(epoch FROM (requested_check_out_at - requested_check_in_at)) / 60)
    ),
    CONSTRAINT ck_attendance_corrections_reason_non_blank CHECK (length(btrim(reason)) > 0),
    CONSTRAINT ck_attendance_corrections_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

CREATE INDEX ix_attendance_corrections_emp_date
    ON attendance_corrections (emp_id, work_date)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_attendance_corrections_status
    ON attendance_corrections (status)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_prevent_hard_delete_attendance_corrections
    BEFORE DELETE ON attendance_corrections
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_attendance_corrections
    BEFORE TRUNCATE ON attendance_corrections
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_attendance_corrections
    BEFORE UPDATE ON attendance_corrections
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- 3. Grants (pulse_app only, pulse_readonly gets NO access)
GRANT SELECT, INSERT, UPDATE ON attendance_days TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON attendance_corrections TO pulse_app;

-- migrate:down

REVOKE SELECT, INSERT, UPDATE ON attendance_corrections FROM pulse_app;
REVOKE SELECT, INSERT, UPDATE ON attendance_days FROM pulse_app;
DROP TRIGGER IF EXISTS trg_handle_update_audit_attendance_corrections ON attendance_corrections;
DROP TRIGGER IF EXISTS trg_prevent_truncate_attendance_corrections ON attendance_corrections;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_attendance_corrections ON attendance_corrections;
DROP TABLE IF EXISTS attendance_corrections CASCADE;

DROP TRIGGER IF EXISTS trg_handle_update_audit_attendance_days ON attendance_days;
DROP TRIGGER IF EXISTS trg_prevent_truncate_attendance_days ON attendance_days;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_attendance_days ON attendance_days;
DROP TABLE IF EXISTS attendance_days CASCADE;
