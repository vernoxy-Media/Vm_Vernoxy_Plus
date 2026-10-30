-- migrate:up
-- =============================================================================
-- Migration: Consolidate Entity Counters, Settings Change Logs, and License Lookups
-- Phase 1 Table Consolidation:
--   1. Consolidate 4 counter tables -> entity_counters (saves 3 tables)
--   2. Consolidate 5 settings change log tables -> settings_change_log (saves 4 tables)
--   3. Consolidate 2 software license reason tables -> master_lookup (saves 2 tables)
-- Total reduction: 9 tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. UNIFIED ENTITY COUNTERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_counters (
    entity_type varchar(50) NOT NULL,
    counter_key varchar(50) NOT NULL,
    last_number integer NOT NULL DEFAULT 0,
    CONSTRAINT pk_entity_counters PRIMARY KEY (entity_type, counter_key)
);

-- Copy existing counter records if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_counters') THEN
        INSERT INTO entity_counters (entity_type, counter_key, last_number)
        SELECT 'TASK', counter_year::text, last_number FROM task_counters
        ON CONFLICT (entity_type, counter_key) DO UPDATE SET last_number = EXCLUDED.last_number;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bug_counters') THEN
        INSERT INTO entity_counters (entity_type, counter_key, last_number)
        SELECT 'BUG', counter_year::text, last_number FROM bug_counters
        ON CONFLICT (entity_type, counter_key) DO UPDATE SET last_number = EXCLUDED.last_number;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_counters') THEN
        INSERT INTO entity_counters (entity_type, counter_key, last_number)
        SELECT 'PROJECT', project_type, last_number FROM project_counters
        ON CONFLICT (entity_type, counter_key) DO UPDATE SET last_number = EXCLUDED.last_number;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'candidate_counters') THEN
        INSERT INTO entity_counters (entity_type, counter_key, last_number)
        SELECT 'CANDIDATE', counter_name, last_number FROM candidate_counters
        ON CONFLICT (entity_type, counter_key) DO UPDATE SET last_number = EXCLUDED.last_number;
    END IF;
END $$;

-- Drop obsolete counter tables
DROP TABLE IF EXISTS task_counters CASCADE;
DROP TABLE IF EXISTS bug_counters CASCADE;
DROP TABLE IF EXISTS project_counters CASCADE;
DROP TABLE IF EXISTS candidate_counters CASCADE;


-- -----------------------------------------------------------------------------
-- 2. UNIFIED SETTINGS CHANGE LOG
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings_change_log (
    log_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module varchar(50) NOT NULL,
    entity_type varchar(50),
    entity_id integer,
    field_name varchar(100) NOT NULL,
    old_value text,
    new_value text NOT NULL,
    changed_by integer NOT NULL REFERENCES employees(emp_id),
    changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS ix_settings_change_log_module_date 
    ON settings_change_log (module, changed_at DESC);

-- Drop obsolete module settings change logs
DROP TABLE IF EXISTS leave_settings_change_log CASCADE;
DROP TABLE IF EXISTS expense_settings_change_log CASCADE;
DROP TABLE IF EXISTS complaint_settings_change_log CASCADE;
DROP TABLE IF EXISTS software_license_settings_change_log CASCADE;
DROP TABLE IF EXISTS payroll_settings_history CASCADE;


-- -----------------------------------------------------------------------------
-- 3. MIGRATE SOFTWARE REASONS INTO master_lookup
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'software_license_revoke_reasons') THEN
        INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active)
        SELECT 
            'software_revoke_reason',
            lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g')),
            name,
            display_order,
            is_active
        FROM software_license_revoke_reasons
        ON CONFLICT DO NOTHING;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'software_license_discontinue_reasons') THEN
        INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active)
        SELECT 
            'software_discontinue_reason',
            lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g')),
            name,
            display_order,
            is_active
        FROM software_license_discontinue_reasons
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Drop obsolete foreign keys
ALTER TABLE software_licenses 
    DROP CONSTRAINT IF EXISTS fk_software_licenses_discontinue_reason;

ALTER TABLE software_license_assignments 
    DROP CONSTRAINT IF EXISTS fk_software_license_assignments_revoke_reason;

-- Re-point foreign keys to master_lookup
ALTER TABLE software_licenses 
    ADD CONSTRAINT fk_software_licenses_discontinue_reason 
    FOREIGN KEY (discontinue_reason_id) REFERENCES master_lookup(lookup_id) ON DELETE SET NULL;

ALTER TABLE software_license_assignments 
    ADD CONSTRAINT fk_software_license_assignments_revoke_reason 
    FOREIGN KEY (revoke_reason_id) REFERENCES master_lookup(lookup_id) ON DELETE SET NULL;

-- Drop old reason tables
DROP TABLE IF EXISTS software_license_revoke_reasons CASCADE;
DROP TABLE IF EXISTS software_license_discontinue_reasons CASCADE;

