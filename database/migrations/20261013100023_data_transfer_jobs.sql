-- migrate:up

-- 1. Enums for data transfer
CREATE TYPE transfer_direction AS ENUM ('import', 'export');
CREATE TYPE transfer_status AS ENUM (
    'previewed',
    'queued',
    'running',
    'completed',
    'completed_with_errors',
    'failed',
    'cancelled',
    'expired'
);

-- 2. Table data_transfer_jobs
CREATE TABLE data_transfer_jobs (
    job_id uuid NOT NULL DEFAULT gen_random_uuid(),
    direction transfer_direction NOT NULL,
    entity_type varchar(30) NOT NULL,
    format varchar(10) NOT NULL,
    status transfer_status NOT NULL,
    original_filename varchar(255) NULL,
    file_key varchar(100) NULL,
    file_sha256 char(64) NULL,
    file_size_bytes bigint NULL,
    report_key varchar(100) NULL,
    options jsonb NOT NULL DEFAULT '{}'::jsonb,
    total_rows integer NOT NULL DEFAULT 0,
    valid_rows integer NOT NULL DEFAULT 0,
    warning_rows integer NOT NULL DEFAULT 0,
    error_rows integer NOT NULL DEFAULT 0,
    processed_rows integer NOT NULL DEFAULT 0,
    created_rows integer NOT NULL DEFAULT 0,
    skipped_rows integer NOT NULL DEFAULT 0,
    failed_rows integer NOT NULL DEFAULT 0,
    error_message varchar(500) NULL,
    cancel_requested boolean NOT NULL DEFAULT false,
    started_at timestamptz NULL,
    finished_at timestamptz NULL,
    heartbeat_at timestamptz NULL,
    expires_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_data_transfer_jobs PRIMARY KEY (job_id),
    CONSTRAINT fk_data_transfer_jobs_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_data_transfer_jobs_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_data_transfer_jobs_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_data_transfer_jobs_entity_type CHECK (entity_type IN ('companies')),
    CONSTRAINT ck_data_transfer_jobs_format CHECK (format IN ('xlsx', 'csv')),
    CONSTRAINT ck_data_transfer_jobs_counts_non_negative CHECK (
        total_rows >= 0 AND
        valid_rows >= 0 AND
        warning_rows >= 0 AND
        error_rows >= 0 AND
        processed_rows >= 0 AND
        created_rows >= 0 AND
        skipped_rows >= 0 AND
        failed_rows >= 0
    ),
    CONSTRAINT ck_data_transfer_jobs_processed_le_total CHECK (processed_rows <= total_rows),
    CONSTRAINT ck_data_transfer_jobs_finished_ge_started CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at),
    CONSTRAINT ck_data_transfer_jobs_import_file_key CHECK (direction <> 'import' OR status = 'expired' OR file_key IS NOT NULL),
    CONSTRAINT ck_data_transfer_jobs_file_sha256_format CHECK (file_sha256 IS NULL OR file_sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_data_transfer_jobs_file_key_format CHECK (file_key IS NULL OR file_key ~ '^[a-f0-9]{32}\.(xlsx|csv)$'),
    CONSTRAINT ck_data_transfer_jobs_report_key_format CHECK (report_key IS NULL OR report_key ~ '^[a-f0-9]{32}\.(xlsx|csv)$'),
    CONSTRAINT ck_data_transfer_jobs_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- 3. Triggers for audit & immutability & soft-delete enforcement
CREATE TRIGGER trg_prevent_hard_delete_data_transfer_jobs
    BEFORE DELETE ON data_transfer_jobs
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_data_transfer_jobs
    BEFORE TRUNCATE ON data_transfer_jobs
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_data_transfer_jobs
    BEFORE UPDATE ON data_transfer_jobs
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- 4. Indexes
CREATE INDEX ix_data_transfer_jobs_created_by_created_at
    ON data_transfer_jobs (created_by, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_data_transfer_jobs_worker_pickup
    ON data_transfer_jobs (created_at)
    WHERE status = 'queued' AND deleted_at IS NULL;

CREATE INDEX ix_data_transfer_jobs_direction_created_at
    ON data_transfer_jobs (direction, created_at DESC)
    WHERE deleted_at IS NULL;

-- 5. Reverse-lookup index on company_channels (verify/ensure exists)
CREATE INDEX IF NOT EXISTS ix_company_channels_type_value
    ON company_channels (channel_type, lower(value))
    WHERE deleted_at IS NULL;

-- 6. Role grants
GRANT SELECT, INSERT, UPDATE ON data_transfer_jobs TO pulse_app;
GRANT SELECT ON data_transfer_jobs TO pulse_readonly;

-- migrate:down

REVOKE SELECT ON data_transfer_jobs FROM pulse_readonly;
REVOKE SELECT, INSERT, UPDATE ON data_transfer_jobs FROM pulse_app;
DROP TRIGGER IF EXISTS trg_handle_update_audit_data_transfer_jobs ON data_transfer_jobs;
DROP TRIGGER IF EXISTS trg_prevent_truncate_data_transfer_jobs ON data_transfer_jobs;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_data_transfer_jobs ON data_transfer_jobs;
DROP TABLE IF EXISTS data_transfer_jobs CASCADE;
DROP TYPE IF EXISTS transfer_status;
DROP TYPE IF EXISTS transfer_direction;
