-- migrate:up

-- 1. Helper trigger functions for hard-delete prevention and audit immutability
CREATE OR REPLACE FUNCTION fn_prevent_hard_delete()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Hard delete is disabled on table %: use soft delete (set deleted_at and deleted_by)', TG_TABLE_NAME;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_prevent_truncate()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'TRUNCATE is disabled on table %: hard deletion of data is forbidden', TG_TABLE_NAME;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_handle_update_audit()
RETURNS trigger AS $$
BEGIN
    -- Immutability of created_at and created_by
    IF NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'created_at is immutable on table %', TG_TABLE_NAME;
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
        RAISE EXCEPTION 'created_by is immutable on table %', TG_TABLE_NAME;
    END IF;

    -- Update timestamp automatically
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Audit Foreign Keys to employees(emp_id) on all 12 tables
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'departments',
        'roles',
        'employees',
        'industries',
        'customer_types',
        'master_lookup',
        'pipeline_stages',
        'companies',
        'company_channels',
        'persons',
        'company_persons',
        'leads'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (created_by) REFERENCES employees(emp_id)', tbl, 'fk_' || tbl || '_created_by');
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (updated_by) REFERENCES employees(emp_id)', tbl, 'fk_' || tbl || '_updated_by');
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (deleted_by) REFERENCES employees(emp_id)', tbl, 'fk_' || tbl || '_deleted_by');
    END LOOP;
END $$;

-- 3. Attach soft-delete and update-audit triggers to all 12 tables
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'departments',
        'roles',
        'employees',
        'industries',
        'customer_types',
        'master_lookup',
        'pipeline_stages',
        'companies',
        'company_channels',
        'persons',
        'company_persons',
        'leads'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('CREATE TRIGGER %I BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete()', 'trg_prevent_hard_delete_' || tbl, tbl);
        EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate()', 'trg_prevent_truncate_' || tbl, tbl);
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit()', 'trg_handle_update_audit_' || tbl, tbl);
    END LOOP;
END $$;

-- migrate:down
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'departments',
        'roles',
        'employees',
        'industries',
        'customer_types',
        'master_lookup',
        'pipeline_stages',
        'companies',
        'company_channels',
        'persons',
        'company_persons',
        'leads'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'trg_handle_update_audit_' || tbl, tbl);
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'trg_prevent_truncate_' || tbl, tbl);
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'trg_prevent_hard_delete_' || tbl, tbl);
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tbl, 'fk_' || tbl || '_deleted_by');
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tbl, 'fk_' || tbl || '_updated_by');
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tbl, 'fk_' || tbl || '_created_by');
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS fn_handle_update_audit();
DROP FUNCTION IF EXISTS fn_prevent_truncate();
DROP FUNCTION IF EXISTS fn_prevent_hard_delete();
