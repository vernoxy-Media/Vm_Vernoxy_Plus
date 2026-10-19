-- migrate:up

-- 1. app_settings table
CREATE TABLE app_settings (
    setting_id integer GENERATED ALWAYS AS IDENTITY,
    setting_key varchar(100) NOT NULL,
    setting_value text NOT NULL,
    description text NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_app_settings PRIMARY KEY (setting_id),
    CONSTRAINT fk_app_settings_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_app_settings_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_app_settings_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_app_settings_key_non_blank CHECK (length(btrim(setting_key)) > 0),
    CONSTRAINT ck_app_settings_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- 2. Unique partial index
CREATE UNIQUE INDEX ux_app_settings_key
    ON app_settings (lower(setting_key))
    WHERE deleted_at IS NULL;

-- 3. Triggers for audit & immutability & soft-delete enforcement
CREATE TRIGGER trg_prevent_hard_delete_app_settings
    BEFORE DELETE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_app_settings
    BEFORE TRUNCATE ON app_settings
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_app_settings
    BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- 4. Insert-only seed for week_start_day (default 1 = Monday)
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('week_start_day', '1', 'Day of the week on which a work week begins (0=Sunday, 1=Monday..6=Saturday)')
ON CONFLICT (lower(setting_key)) WHERE deleted_at IS NULL
DO NOTHING;

-- 5. Role grants
GRANT SELECT, INSERT, UPDATE ON app_settings TO pulse_app;
GRANT SELECT ON app_settings TO pulse_readonly;

-- migrate:down

REVOKE SELECT ON app_settings FROM pulse_readonly;
REVOKE SELECT, INSERT, UPDATE ON app_settings FROM pulse_app;
DROP TRIGGER IF EXISTS trg_handle_update_audit_app_settings ON app_settings;
DROP TRIGGER IF EXISTS trg_prevent_truncate_app_settings ON app_settings;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_app_settings ON app_settings;
DROP TABLE IF EXISTS app_settings CASCADE;
