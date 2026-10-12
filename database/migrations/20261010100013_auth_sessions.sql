-- migrate:up

CREATE TABLE auth_sessions (
    session_id uuid DEFAULT gen_random_uuid(),
    emp_id integer NOT NULL,
    refresh_token_hash char(64) NOT NULL,
    previous_token_hash char(64) NULL,
    issued_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz NULL,
    revoked_reason session_revoke_reason NULL,
    ip_address varchar(45) NULL,
    user_agent varchar(300) NULL,
    device_label varchar(100) NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,

    CONSTRAINT pk_auth_sessions PRIMARY KEY (session_id),
    CONSTRAINT fk_auth_sessions_emp_id FOREIGN KEY (emp_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_auth_sessions_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_auth_sessions_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_auth_sessions_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_auth_sessions_refresh_token_hash CHECK (refresh_token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_auth_sessions_previous_token_hash CHECK (previous_token_hash IS NULL OR previous_token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_auth_sessions_expires_after_issued CHECK (expires_at > issued_at),
    CONSTRAINT ck_auth_sessions_last_used_after_issued CHECK (last_used_at >= issued_at),
    CONSTRAINT ck_auth_sessions_revoked_consistency CHECK ((revoked_at IS NULL) = (revoked_reason IS NULL)),
    CONSTRAINT ck_auth_sessions_ip_address CHECK (ip_address IS NULL OR ip_address ~ '^[0-9a-fA-F:.]{3,45}$'),
    CONSTRAINT ck_auth_sessions_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- Indexes
CREATE UNIQUE INDEX ux_auth_sessions_refresh_token_hash
    ON auth_sessions (refresh_token_hash);

CREATE INDEX ix_auth_sessions_previous_token_hash
    ON auth_sessions (previous_token_hash)
    WHERE previous_token_hash IS NOT NULL;

CREATE INDEX ix_auth_sessions_active
    ON auth_sessions (emp_id, expires_at)
    WHERE revoked_at IS NULL AND deleted_at IS NULL;

CREATE INDEX ix_auth_sessions_emp_history
    ON auth_sessions (emp_id, issued_at DESC);

-- Triggers
CREATE TRIGGER trg_auth_sessions_audit
    BEFORE UPDATE ON auth_sessions
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

CREATE TRIGGER trg_prevent_hard_delete_auth_sessions
    BEFORE DELETE ON auth_sessions
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_auth_sessions
    BEFORE TRUNCATE ON auth_sessions
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

-- Grants
GRANT SELECT, INSERT, UPDATE ON auth_sessions TO pulse_app;

-- migrate:down
REVOKE SELECT, INSERT, UPDATE ON auth_sessions FROM pulse_app;

DROP TRIGGER IF EXISTS trg_prevent_truncate_auth_sessions ON auth_sessions;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_auth_sessions ON auth_sessions;
DROP TRIGGER IF EXISTS trg_auth_sessions_audit ON auth_sessions;

DROP TABLE IF EXISTS auth_sessions;
