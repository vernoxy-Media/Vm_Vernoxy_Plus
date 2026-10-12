-- migrate:up

CREATE TABLE otp_codes (
    otp_id uuid DEFAULT gen_random_uuid(),
    emp_id integer NOT NULL,
    purpose otp_purpose NOT NULL,
    destination varchar(255) NOT NULL,
    code_hash char(64) NOT NULL,
    expires_at timestamptz NOT NULL,
    attempts smallint NOT NULL DEFAULT 0,
    max_attempts smallint NOT NULL DEFAULT 5,
    consumed_at timestamptz NULL,
    voided_at timestamptz NULL,
    ip_address varchar(45) NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,

    CONSTRAINT pk_otp_codes PRIMARY KEY (otp_id),
    CONSTRAINT fk_otp_codes_emp_id FOREIGN KEY (emp_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_otp_codes_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_otp_codes_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_otp_codes_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_otp_codes_destination_format CHECK (destination ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT ck_otp_codes_code_hash CHECK (code_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_otp_codes_attempts CHECK (attempts >= 0),
    CONSTRAINT ck_otp_codes_max_attempts CHECK (max_attempts BETWEEN 1 AND 10),
    CONSTRAINT ck_otp_codes_expires_after_created CHECK (expires_at > created_at),
    CONSTRAINT ck_otp_codes_mutually_exclusive_consumed_voided CHECK (NOT (consumed_at IS NOT NULL AND voided_at IS NOT NULL)),
    CONSTRAINT ck_otp_codes_ip_address CHECK (ip_address IS NULL OR ip_address ~ '^[0-9a-fA-F:.]{3,45}$'),
    CONSTRAINT ck_otp_codes_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- Partial unique index (at most ONE open code per employee and purpose)
CREATE UNIQUE INDEX ux_otp_codes_open
    ON otp_codes (emp_id, purpose)
    WHERE consumed_at IS NULL AND voided_at IS NULL AND deleted_at IS NULL;

-- Index for resend cooldown and rate limits
CREATE INDEX ix_otp_codes_resend_limit
    ON otp_codes (emp_id, purpose, created_at DESC);

-- Triggers
CREATE TRIGGER trg_otp_codes_audit
    BEFORE UPDATE ON otp_codes
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

CREATE TRIGGER trg_prevent_hard_delete_otp_codes
    BEFORE DELETE ON otp_codes
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_otp_codes
    BEFORE TRUNCATE ON otp_codes
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

-- Grants
GRANT SELECT, INSERT, UPDATE ON otp_codes TO pulse_app;

-- migrate:down
REVOKE SELECT, INSERT, UPDATE ON otp_codes FROM pulse_app;

DROP TRIGGER IF EXISTS trg_prevent_truncate_otp_codes ON otp_codes;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_otp_codes ON otp_codes;
DROP TRIGGER IF EXISTS trg_otp_codes_audit ON otp_codes;

DROP TABLE IF EXISTS otp_codes;
