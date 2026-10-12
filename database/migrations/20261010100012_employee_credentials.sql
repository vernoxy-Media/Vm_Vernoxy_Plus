-- migrate:up

CREATE TABLE employee_credentials (
    credential_id integer GENERATED ALWAYS AS IDENTITY,
    emp_id integer NOT NULL,
    password_hash varchar(255) NOT NULL,
    password_changed_at timestamptz NOT NULL DEFAULT now(),
    must_change_password boolean NOT NULL DEFAULT false,
    failed_attempts smallint NOT NULL DEFAULT 0,
    locked_until timestamptz NULL,
    last_login_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,

    CONSTRAINT pk_employee_credentials PRIMARY KEY (credential_id),
    CONSTRAINT fk_employee_credentials_emp_id FOREIGN KEY (emp_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_employee_credentials_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_employee_credentials_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_employee_credentials_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_employee_credentials_password_hash CHECK (password_hash ~ '^\$argon2id\$'),
    CONSTRAINT ck_employee_credentials_failed_attempts CHECK (failed_attempts >= 0),
    CONSTRAINT ck_employee_credentials_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- Partial unique index (one active credentials row per employee)
CREATE UNIQUE INDEX ux_employee_credentials_emp_id
    ON employee_credentials (emp_id)
    WHERE deleted_at IS NULL;

-- Triggers for audit and soft-delete protection
CREATE TRIGGER trg_employee_credentials_audit
    BEFORE UPDATE ON employee_credentials
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

CREATE TRIGGER trg_prevent_hard_delete_employee_credentials
    BEFORE DELETE ON employee_credentials
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_employee_credentials
    BEFORE TRUNCATE ON employee_credentials
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

-- Grants
GRANT SELECT, INSERT, UPDATE ON employee_credentials TO pulse_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;

-- migrate:down
REVOKE SELECT, INSERT, UPDATE ON employee_credentials FROM pulse_app;

DROP TRIGGER IF EXISTS trg_prevent_truncate_employee_credentials ON employee_credentials;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_employee_credentials ON employee_credentials;
DROP TRIGGER IF EXISTS trg_employee_credentials_audit ON employee_credentials;

DROP TABLE IF EXISTS employee_credentials;
