-- migrate:up

CREATE OR REPLACE FUNCTION fn_handle_employee_deactivation()
RETURNS trigger AS $$
BEGIN
    -- Triggered when employee status becomes 'Inactive' or employee is soft-deleted
    IF (NEW.status = 'Inactive' AND (OLD.status IS DISTINCT FROM 'Inactive')) OR
       (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN

        -- (a) Revoke all open sessions
        UPDATE auth_sessions
        SET revoked_at = now(),
            revoked_reason = 'deactivated',
            updated_at = now()
        WHERE emp_id = NEW.emp_id
          AND revoked_at IS NULL
          AND deleted_at IS NULL;

        -- (b) Void all open OTP codes
        UPDATE otp_codes
        SET voided_at = now(),
            updated_at = now()
        WHERE emp_id = NEW.emp_id
          AND consumed_at IS NULL
          AND voided_at IS NULL
          AND deleted_at IS NULL;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employee_deactivation_safety
    AFTER UPDATE OF status, deleted_at ON employees
    FOR EACH ROW EXECUTE FUNCTION fn_handle_employee_deactivation();

-- migrate:down
DROP TRIGGER IF EXISTS trg_employee_deactivation_safety ON employees;
DROP FUNCTION IF EXISTS fn_handle_employee_deactivation();
