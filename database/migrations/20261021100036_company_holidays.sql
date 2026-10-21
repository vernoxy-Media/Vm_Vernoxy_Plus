-- migrate:up

CREATE TABLE company_holidays (
    holiday_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    holiday_date date NOT NULL,
    name varchar(150) NOT NULL,
    type varchar(50) NOT NULL DEFAULT 'Public Holiday',
    year integer NOT NULL,
    description text NULL,
    is_optional boolean NOT NULL DEFAULT false,
    
    -- Audit & Soft Delete
    row_version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,

    CONSTRAINT fk_company_holidays_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_company_holidays_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_company_holidays_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_company_holidays_name_non_blank CHECK (length(btrim(name)) >= 1),
    CONSTRAINT ck_company_holidays_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

CREATE UNIQUE INDEX ux_company_holidays_date
    ON company_holidays (holiday_date)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_company_holidays_year
    ON company_holidays (year)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_prevent_hard_delete_company_holidays
    BEFORE DELETE ON company_holidays
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_company_holidays
    BEFORE TRUNCATE ON company_holidays
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_company_holidays
    BEFORE UPDATE ON company_holidays
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- Populate existing holidays from app_settings if any exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM app_settings WHERE setting_key = 'attendance_holidays' AND setting_value IS NOT NULL AND setting_value != '') THEN
        INSERT INTO company_holidays (holiday_date, name, type, year, created_at)
        SELECT 
            (elem->>'date')::date,
            COALESCE(elem->>'name', 'Holiday'),
            COALESCE(elem->>'type', 'Public Holiday'),
            EXTRACT(YEAR FROM (elem->>'date')::date)::integer,
            clock_timestamp()
        FROM app_settings,
             jsonb_array_elements(setting_value::jsonb) AS elem
        WHERE setting_key = 'attendance_holidays'
        ON CONFLICT DO NOTHING;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- If app_settings is not json or empty, ignore
    NULL;
END $$;

GRANT SELECT, INSERT, UPDATE ON company_holidays TO pulse_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;

-- migrate:down
REVOKE SELECT, INSERT, UPDATE ON company_holidays FROM pulse_app;
DROP TRIGGER IF EXISTS trg_handle_update_audit_company_holidays ON company_holidays;
DROP TRIGGER IF EXISTS trg_prevent_truncate_company_holidays ON company_holidays;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_company_holidays ON company_holidays;
DROP TABLE IF EXISTS company_holidays;
