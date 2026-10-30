-- migrate:up

-- 1. Allow 'cancelled' in correction_status enum if not already present
ALTER TYPE correction_status ADD VALUE IF NOT EXISTS 'cancelled';

-- 2. Create sequence for Request ID (e.g. REG-0001)
CREATE SEQUENCE IF NOT EXISTS attendance_regularization_seq START 1;

-- 3. Enhance attendance_corrections with all spec fields
ALTER TABLE attendance_corrections 
    ADD COLUMN IF NOT EXISTS request_id varchar(20) UNIQUE,
    ADD COLUMN IF NOT EXISTS request_type varchar(50) NOT NULL DEFAULT 'Incorrect Time',
    ADD COLUMN IF NOT EXISTS current_check_in_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS current_check_out_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS remarks varchar(250) NULL,
    ADD COLUMN IF NOT EXISTS attachment_url text NULL,
    ADD COLUMN IF NOT EXISTS attachment_name varchar(255) NULL;

-- Backfill request_id for any existing records
UPDATE attendance_corrections 
SET request_id = 'REG-' || LPAD(correction_id::text, 4, '0') 
WHERE request_id IS NULL;

ALTER TABLE attendance_corrections 
    ALTER COLUMN request_id SET NOT NULL,
    ALTER COLUMN request_id SET DEFAULT ('REG-' || LPAD(nextval('attendance_regularization_seq')::text, 4, '0'));

-- 4. Create attendance_correction_approvals table for audit history
CREATE TABLE IF NOT EXISTS attendance_correction_approvals (
    approval_id integer GENERATED ALWAYS AS IDENTITY,
    correction_id integer NOT NULL,
    level integer NOT NULL DEFAULT 1,
    level_name varchar(50) NOT NULL DEFAULT 'Level 1 - HR',
    approver_id integer NULL,
    action varchar(20) NOT NULL DEFAULT 'pending',
    comment varchar(250) NULL,
    action_date timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_attendance_correction_approvals PRIMARY KEY (approval_id),
    CONSTRAINT fk_attendance_correction_approvals_correction_id FOREIGN KEY (correction_id) REFERENCES attendance_corrections(correction_id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_correction_approvals_approver_id FOREIGN KEY (approver_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_correction_approvals_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_correction_approvals_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendance_correction_approvals_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_attendance_correction_approvals_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_attendance_correction_approvals_correction_id 
    ON attendance_correction_approvals(correction_id) 
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_prevent_hard_delete_attendance_correction_approvals
    BEFORE DELETE ON attendance_correction_approvals
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_attendance_correction_approvals
    BEFORE TRUNCATE ON attendance_correction_approvals
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_attendance_correction_approvals
    BEFORE UPDATE ON attendance_correction_approvals
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- 5. Add regularized flag and mode to attendance_days
ALTER TABLE attendance_days 
    ADD COLUMN IF NOT EXISTS is_regularized boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS check_in_mode varchar(50) NOT NULL DEFAULT 'Web',
    ADD COLUMN IF NOT EXISTS regularization_id integer NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_days_regularization_id'
    ) THEN
        ALTER TABLE attendance_days 
            ADD CONSTRAINT fk_attendance_days_regularization_id 
            FOREIGN KEY (regularization_id) REFERENCES attendance_corrections(correction_id);
    END IF;
END $$;

-- 6. Grants
GRANT SELECT, INSERT, UPDATE ON attendance_correction_approvals TO pulse_app;
GRANT USAGE, SELECT ON SEQUENCE attendance_regularization_seq TO pulse_app;

-- migrate:down

ALTER TABLE attendance_days DROP CONSTRAINT IF EXISTS fk_attendance_days_regularization_id;
ALTER TABLE attendance_days DROP COLUMN IF EXISTS regularization_id;
ALTER TABLE attendance_days DROP COLUMN IF EXISTS check_in_mode;
ALTER TABLE attendance_days DROP COLUMN IF EXISTS is_regularized;

DROP TABLE IF EXISTS attendance_correction_approvals CASCADE;
ALTER TABLE attendance_corrections DROP COLUMN IF EXISTS attachment_name;
ALTER TABLE attendance_corrections DROP COLUMN IF EXISTS attachment_url;
ALTER TABLE attendance_corrections DROP COLUMN IF EXISTS remarks;
ALTER TABLE attendance_corrections DROP COLUMN IF EXISTS current_check_out_at;
ALTER TABLE attendance_corrections DROP COLUMN IF EXISTS current_check_in_at;
ALTER TABLE attendance_corrections DROP COLUMN IF EXISTS request_type;
ALTER TABLE attendance_corrections DROP COLUMN IF EXISTS request_id;
DROP SEQUENCE IF EXISTS attendance_regularization_seq;
