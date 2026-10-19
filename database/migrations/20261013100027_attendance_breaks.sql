-- migrate:up

-- 0. Ensure btree_gist extension is available for scalar GiST operator classes
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. attendance_breaks table
CREATE TABLE attendance_breaks (
    break_id integer GENERATED ALWAYS AS IDENTITY,
    attendance_id integer NOT NULL,
    started_at timestamptz NOT NULL,
    ended_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_attendance_breaks PRIMARY KEY (break_id),
    CONSTRAINT fk_attendance_breaks_attendance_id FOREIGN KEY (attendance_id) REFERENCES attendance_days(attendance_id),
    CONSTRAINT fk_attendance_breaks_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_breaks_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_breaks_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_attendance_breaks_ended_after_started CHECK (ended_at IS NULL OR ended_at > started_at),
    CONSTRAINT ck_attendance_breaks_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL),
    CONSTRAINT ex_attendance_breaks_no_overlap EXCLUDE USING gist (
        attendance_id WITH =,
        tstzrange(started_at, coalesce(ended_at, 'infinity')) WITH &&
    ) WHERE (deleted_at IS NULL)
);

-- Partial unique index for at most one open break per attendance row
CREATE UNIQUE INDEX ux_attendance_breaks_single_open
    ON attendance_breaks (attendance_id)
    WHERE ended_at IS NULL AND deleted_at IS NULL;

-- Index on attendance_id for lookups
CREATE INDEX ix_attendance_breaks_attendance_id
    ON attendance_breaks (attendance_id)
    WHERE deleted_at IS NULL;

-- Standard audit & immutability triggers
CREATE TRIGGER trg_prevent_hard_delete_attendance_breaks
    BEFORE DELETE ON attendance_breaks
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_attendance_breaks
    BEFORE TRUNCATE ON attendance_breaks
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_attendance_breaks
    BEFORE UPDATE ON attendance_breaks
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- 2. Trigger function for attendance_breaks integrity
CREATE OR REPLACE FUNCTION fn_attendance_breaks_integrity()
RETURNS trigger AS $$
DECLARE
    v_att record;
    v_emp_status employee_status;
BEGIN
    -- Skip validation on soft delete
    IF TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        RETURN NEW;
    END IF;

    -- Fetch parent attendance day row
    SELECT check_in_at, check_out_at, emp_id, deleted_at
    INTO v_att
    FROM attendance_days
    WHERE attendance_id = NEW.attendance_id;

    IF NOT FOUND OR v_att.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Parent attendance day % does not exist or is deleted', NEW.attendance_id;
    END IF;

    -- Reject new breaks on an already closed attendance day
    IF TG_OP = 'INSERT' AND v_att.check_out_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot add break to an already closed attendance day';
    END IF;

    -- started_at must be >= check_in_at
    IF NEW.started_at < v_att.check_in_at THEN
        RAISE EXCEPTION 'Break started_at % cannot be earlier than check_in_at %', NEW.started_at, v_att.check_in_at;
    END IF;

    -- If attendance row is closed, ended_at must be set and <= check_out_at
    IF v_att.check_out_at IS NOT NULL THEN
        IF NEW.ended_at IS NULL THEN
            RAISE EXCEPTION 'Break must have an ended_at on a closed attendance day';
        END IF;
        IF NEW.ended_at > v_att.check_out_at THEN
            RAISE EXCEPTION 'Break ended_at % cannot be later than check_out_at %', NEW.ended_at, v_att.check_out_at;
        END IF;
    END IF;

    -- Verify employee is Active
    SELECT status INTO v_emp_status
    FROM employees
    WHERE emp_id = v_att.emp_id AND deleted_at IS NULL;

    IF NOT FOUND OR v_emp_status <> 'Active' THEN
        RAISE EXCEPTION 'Employee % is not Active (status: %)', v_att.emp_id, COALESCE(v_emp_status::text, 'not found');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attendance_breaks_integrity
    BEFORE INSERT OR UPDATE ON attendance_breaks
    FOR EACH ROW EXECUTE FUNCTION fn_attendance_breaks_integrity();

-- 3. Trigger on attendance_days: reject closing day if an open break exists
CREATE OR REPLACE FUNCTION fn_attendance_days_no_open_break()
RETURNS trigger AS $$
BEGIN
    IF NEW.check_out_at IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM attendance_breaks
            WHERE attendance_id = NEW.attendance_id
              AND ended_at IS NULL
              AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Cannot close attendance day % while an open break exists', NEW.attendance_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attendance_days_no_open_break
    BEFORE UPDATE OF check_out_at ON attendance_days
    FOR EACH ROW EXECUTE FUNCTION fn_attendance_days_no_open_break();

-- 4. Role grants
GRANT SELECT, INSERT, UPDATE ON attendance_breaks TO pulse_app;

-- migrate:down

REVOKE SELECT, INSERT, UPDATE ON attendance_breaks FROM pulse_app;
DROP TRIGGER IF EXISTS trg_attendance_days_no_open_break ON attendance_days;
DROP FUNCTION IF EXISTS fn_attendance_days_no_open_break();
DROP TRIGGER IF EXISTS trg_attendance_breaks_integrity ON attendance_breaks;
DROP FUNCTION IF EXISTS fn_attendance_breaks_integrity();
DROP TRIGGER IF EXISTS trg_handle_update_audit_attendance_breaks ON attendance_breaks;
DROP TRIGGER IF EXISTS trg_prevent_truncate_attendance_breaks ON attendance_breaks;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_attendance_breaks ON attendance_breaks;
DROP TABLE IF EXISTS attendance_breaks CASCADE;
