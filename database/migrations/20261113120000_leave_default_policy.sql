-- migrate:up
-- The Admin chooses which Leave Policy a new employee gets (Settings, Leave Settings, General), instead of the
-- employee form guessing a policy by its name. An employee created without a policy gets this one.
ALTER TABLE leave_general_settings
    ADD COLUMN IF NOT EXISTS default_policy_id integer REFERENCES leave_policies(policy_id) ON DELETE SET NULL;

-- Where there is exactly one active policy there is nothing to choose, so it becomes the default.
UPDATE leave_general_settings
SET default_policy_id = (SELECT policy_id FROM leave_policies WHERE status = 'ACTIVE')
WHERE default_policy_id IS NULL
  AND (SELECT count(*) FROM leave_policies WHERE status = 'ACTIVE') = 1;

CREATE OR REPLACE FUNCTION fn_employees_default_leave_policy()
RETURNS trigger AS $$
BEGIN
    IF NEW.leave_policy_id IS NULL THEN
        NEW.leave_policy_id := (
            SELECT g.default_policy_id
            FROM leave_general_settings g
            JOIN leave_policies p ON p.policy_id = g.default_policy_id AND p.status = 'ACTIVE'
            ORDER BY g.setting_id
            LIMIT 1
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_default_leave_policy ON employees;
CREATE TRIGGER trg_employees_default_leave_policy
    BEFORE INSERT ON employees
    FOR EACH ROW EXECUTE FUNCTION fn_employees_default_leave_policy();

-- migrate:down
DROP TRIGGER IF EXISTS trg_employees_default_leave_policy ON employees;
DROP FUNCTION IF EXISTS fn_employees_default_leave_policy();
ALTER TABLE leave_general_settings DROP COLUMN IF EXISTS default_policy_id;
