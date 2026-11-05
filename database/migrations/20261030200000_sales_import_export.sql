-- migrate:up
-- =============================================================================
-- Sales Import / Export (BFD section 3, Parts 2 and 3)
--
-- 1. data_transfer_jobs.entity_type may only be 'companies' today (the CRM import).
--    The check is widened - existing rows stay valid - so Sales imports and exports
--    are kept in the same History as every other transfer.
-- 2. sales_user_rights: "A Sales User can import only when the Admin gives them the
--    Import right" - and the same for Export. The Admin always can.
-- 3. crm_import_batches gets the job it belongs to and the existing companies that an
--    import filled in, so the Admin can undo an import within 24 hours.
-- =============================================================================

-- 1. Entity types ------------------------------------------------------------
ALTER TABLE data_transfer_jobs DROP CONSTRAINT IF EXISTS ck_data_transfer_jobs_entity_type;
ALTER TABLE data_transfer_jobs ADD CONSTRAINT ck_data_transfer_jobs_entity_type CHECK (
    entity_type IN (
        'companies',
        'sales_import',
        'sales_export_companies',
        'sales_export_leads',
        'sales_export_follow_ups'
    )
);

-- 2. Rights ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_user_rights (
    emp_id integer NOT NULL,
    can_import boolean NOT NULL DEFAULT false,
    can_export boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    CONSTRAINT pk_sales_user_rights PRIMARY KEY (emp_id),
    CONSTRAINT fk_sales_user_rights_emp FOREIGN KEY (emp_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_sales_user_rights_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_sales_user_rights_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id)
);

-- 3. Import batches ----------------------------------------------------------
ALTER TABLE crm_import_batches
    ADD COLUMN IF NOT EXISTS job_id uuid,
    ADD COLUMN IF NOT EXISTS companies_updated jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS undone_at timestamptz,
    ADD COLUMN IF NOT EXISTS undone_by integer;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_crm_import_batches_job') THEN
        ALTER TABLE crm_import_batches ADD CONSTRAINT fk_crm_import_batches_job
            FOREIGN KEY (job_id) REFERENCES data_transfer_jobs(job_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_crm_import_batches_undone_by') THEN
        ALTER TABLE crm_import_batches ADD CONSTRAINT fk_crm_import_batches_undone_by
            FOREIGN KEY (undone_by) REFERENCES employees(emp_id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_import_batches_job ON crm_import_batches (job_id) WHERE job_id IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_app') THEN
        GRANT SELECT, INSERT, UPDATE ON sales_user_rights TO pulse_app;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_readonly') THEN
        GRANT SELECT ON sales_user_rights TO pulse_readonly;
    END IF;
END $$;

-- migrate:down
DROP INDEX IF EXISTS ux_crm_import_batches_job;
ALTER TABLE crm_import_batches DROP CONSTRAINT IF EXISTS fk_crm_import_batches_undone_by;
ALTER TABLE crm_import_batches DROP CONSTRAINT IF EXISTS fk_crm_import_batches_job;
ALTER TABLE crm_import_batches
    DROP COLUMN IF EXISTS undone_by,
    DROP COLUMN IF EXISTS undone_at,
    DROP COLUMN IF EXISTS companies_updated,
    DROP COLUMN IF EXISTS job_id;
DROP TABLE IF EXISTS sales_user_rights;
-- Putting the old check back would reject Sales transfer rows that already exist, so it is left widened.
