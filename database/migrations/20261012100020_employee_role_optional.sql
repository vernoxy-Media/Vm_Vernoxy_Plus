-- migrate:up

ALTER TABLE employees ALTER COLUMN role_id DROP NOT NULL;

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

    IF NEW.role_id IS NOT NULL THEN
        SELECT is_active, deleted_at INTO v_role_active, v_role_deleted
        FROM roles
        WHERE role_id = NEW.role_id;

        IF NOT FOUND OR v_role_deleted IS NOT NULL OR NOT v_role_active THEN
            RAISE EXCEPTION 'Role % is inactive or deleted', NEW.role_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_employee_last_admin_protection()
RETURNS trigger AS $$
DECLARE
    v_old_is_admin boolean := false;
    v_new_is_admin boolean := false;
    v_other_admin_exists boolean := false;
BEGIN
    IF OLD.deleted_at IS NULL AND OLD.status = 'Active' AND OLD.role_id IS NOT NULL THEN
        SELECT is_admin INTO v_old_is_admin
        FROM roles
        WHERE role_id = OLD.role_id;
    END IF;

    IF NOT v_old_is_admin THEN
        RETURN NEW;
    END IF;

    IF NEW.deleted_at IS NULL AND NEW.status = 'Active' AND NEW.role_id IS NOT NULL THEN
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

-- migrate:down

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

ALTER TABLE employees ALTER COLUMN role_id SET NOT NULL;
