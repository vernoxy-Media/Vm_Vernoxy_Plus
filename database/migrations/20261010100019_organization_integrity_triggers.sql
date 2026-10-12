-- migrate:up

-- 1. Department lifecycle integrity (cannot soft-delete or deactivate if it has active roles or active employees)
CREATE OR REPLACE FUNCTION fn_department_lifecycle_integrity()
RETURNS trigger AS $$
DECLARE
    v_has_active_roles boolean;
    v_has_active_employees boolean;
BEGIN
    IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR (OLD.is_active = true AND NEW.is_active = false) THEN
        SELECT EXISTS (
            SELECT 1 FROM roles
            WHERE dep_id = OLD.dep_id AND is_active = true AND deleted_at IS NULL
        ) INTO v_has_active_roles;

        IF v_has_active_roles THEN
            RAISE EXCEPTION 'Cannot deactivate or delete department %: it still has active roles', OLD.dep_id;
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM employees
            WHERE dep_id = OLD.dep_id AND status = 'Active' AND deleted_at IS NULL
        ) INTO v_has_active_employees;

        IF v_has_active_employees THEN
            RAISE EXCEPTION 'Cannot deactivate or delete department %: it still has active employees', OLD.dep_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_department_lifecycle_integrity
    BEFORE UPDATE OF is_active, deleted_at ON departments
    FOR EACH ROW EXECUTE FUNCTION fn_department_lifecycle_integrity();


-- 2. Role lifecycle and immutability integrity
CREATE OR REPLACE FUNCTION fn_role_lifecycle_integrity()
RETURNS trigger AS $$
DECLARE
    v_has_active_employees boolean;
BEGIN
    -- Immutability checks
    IF NEW.is_admin <> OLD.is_admin THEN
        RAISE EXCEPTION 'roles.is_admin is immutable';
    END IF;

    IF NEW.dep_id <> OLD.dep_id THEN
        RAISE EXCEPTION 'roles.dep_id is immutable';
    END IF;

    -- Admin role cannot be soft deleted or deactivated
    IF OLD.is_admin = true THEN
        IF NEW.deleted_at IS NOT NULL OR NEW.is_active = false THEN
            RAISE EXCEPTION 'Admin role cannot be soft-deleted or deactivated';
        END IF;
    END IF;

    -- Cannot deactivate or delete if it has active employees
    IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR (OLD.is_active = true AND NEW.is_active = false) THEN
        SELECT EXISTS (
            SELECT 1 FROM employees
            WHERE role_id = OLD.role_id AND status = 'Active' AND deleted_at IS NULL
        ) INTO v_has_active_employees;

        IF v_has_active_employees THEN
            RAISE EXCEPTION 'Cannot deactivate or delete role %: it still has active employees', OLD.role_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_role_lifecycle_integrity
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION fn_role_lifecycle_integrity();


-- 3. Employee creation and update requires active, non-deleted role and department
CREATE OR REPLACE FUNCTION fn_employee_org_active_check()
RETURNS trigger AS $$
DECLARE
    v_dep_active boolean;
    v_dep_deleted timestamptz;
    v_role_active boolean;
    v_role_deleted timestamptz;
BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT is_active, deleted_at INTO v_dep_active, v_dep_deleted
    FROM departments
    WHERE dep_id = NEW.dep_id;

    IF NOT FOUND OR v_dep_deleted IS NOT NULL OR NOT v_dep_active THEN
        RAISE EXCEPTION 'Department % is inactive or deleted', NEW.dep_id;
    END IF;

    SELECT is_active, deleted_at INTO v_role_active, v_role_deleted
    FROM roles
    WHERE role_id = NEW.role_id;

    IF NOT FOUND OR v_role_deleted IS NOT NULL OR NOT v_role_active THEN
        RAISE EXCEPTION 'Role % is inactive or deleted', NEW.role_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employee_org_active_check
    BEFORE INSERT OR UPDATE OF role_id, dep_id ON employees
    FOR EACH ROW EXECUTE FUNCTION fn_employee_org_active_check();


-- 4. Last active administrator protection
CREATE OR REPLACE FUNCTION fn_employee_last_admin_protection()
RETURNS trigger AS $$
DECLARE
    v_old_is_admin boolean := false;
    v_new_is_admin boolean := false;
    v_other_admin_exists boolean := false;
BEGIN
    IF OLD.deleted_at IS NULL AND OLD.status = 'Active' THEN
        SELECT is_admin INTO v_old_is_admin
        FROM roles
        WHERE role_id = OLD.role_id;
    END IF;

    IF NOT v_old_is_admin THEN
        RETURN NEW;
    END IF;

    IF NEW.deleted_at IS NULL AND NEW.status = 'Active' THEN
        SELECT is_admin INTO v_new_is_admin
        FROM roles
        WHERE role_id = NEW.role_id;
    END IF;

    IF NOT v_new_is_admin THEN
        PERFORM pg_advisory_xact_lock(742910485);

        SELECT EXISTS (
            SELECT 1
            FROM employees e
            JOIN roles r ON e.role_id = r.role_id AND e.dep_id = r.dep_id
            WHERE r.is_admin = true
              AND e.status = 'Active'
              AND e.deleted_at IS NULL
              AND e.emp_id <> OLD.emp_id
        ) INTO v_other_admin_exists;

        IF NOT v_other_admin_exists THEN
            RAISE EXCEPTION 'Cannot modify or delete last remaining active administrator';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employee_last_admin_protection
    BEFORE UPDATE OF status, deleted_at, role_id, dep_id ON employees
    FOR EACH ROW EXECUTE FUNCTION fn_employee_last_admin_protection();

-- migrate:down

DROP TRIGGER IF EXISTS trg_employee_last_admin_protection ON employees;
DROP FUNCTION IF EXISTS fn_employee_last_admin_protection();

DROP TRIGGER IF EXISTS trg_employee_org_active_check ON employees;
DROP FUNCTION IF EXISTS fn_employee_org_active_check();

DROP TRIGGER IF EXISTS trg_role_lifecycle_integrity ON roles;
DROP FUNCTION IF EXISTS fn_role_lifecycle_integrity();

DROP TRIGGER IF EXISTS trg_department_lifecycle_integrity ON departments;
DROP FUNCTION IF EXISTS fn_department_lifecycle_integrity();
