-- migrate:up
-- Employee ID (EMP-0001 ...) used to be built from the internal primary key, so every employee that was deleted, flushed
-- or rolled back left a hole in the numbering (EMP-0029, 0028, 0027, 0014 ...). It is now a stored code that is handed
-- out one by one from a counter, in the same transaction that creates the employee: no gaps, and a failed insert gives
-- its number back.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code varchar(20);

-- Number the people already here in the order they were added: those still on the list get EMP-0001 .. EMP-000N, so the
-- list reads straight through. Anyone who was removed earlier keeps a place of their own (EMP-DEL-0001 ...), so they
-- do not use up numbers that the next new employees should get.
-- Only the code is filled in: the audit and leave-policy triggers must not run for this
ALTER TABLE employees DISABLE TRIGGER USER;

WITH ordered AS (
  SELECT emp_id,
         deleted_at IS NOT NULL AS removed,
         ROW_NUMBER() OVER (PARTITION BY (deleted_at IS NOT NULL) ORDER BY emp_id) AS n
  FROM employees
)
UPDATE employees e
SET employee_code = CASE WHEN o.removed THEN 'EMP-DEL-' ELSE 'EMP-' END || LPAD(o.n::text, 4, '0')
FROM ordered o
WHERE e.emp_id = o.emp_id AND e.employee_code IS NULL;

ALTER TABLE employees ENABLE TRIGGER USER;

-- The counter carries on from the highest code in use
INSERT INTO entity_counters (entity_type, counter_key, last_number)
SELECT 'EMPLOYEE', 'all', COALESCE(MAX(SUBSTRING(employee_code FROM 5)::integer), 0) FROM employees WHERE employee_code ~ '^EMP-[0-9]+$'
ON CONFLICT (entity_type, counter_key)
DO UPDATE SET last_number = GREATEST(entity_counters.last_number, EXCLUDED.last_number);

ALTER TABLE employees ALTER COLUMN employee_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_employees_employee_code ON employees (employee_code);

-- Every insert gets the next code, whichever way the employee is created (app, bootstrap script, seed)
CREATE OR REPLACE FUNCTION employees_assign_code() RETURNS trigger AS $$
DECLARE
  n integer;
BEGIN
  IF NEW.employee_code IS NULL OR NEW.employee_code = '' THEN
    INSERT INTO entity_counters (entity_type, counter_key, last_number)
    VALUES ('EMPLOYEE', 'all', 1)
    ON CONFLICT (entity_type, counter_key)
    DO UPDATE SET last_number = entity_counters.last_number + 1
    RETURNING last_number INTO n;
    NEW.employee_code := 'EMP-' || LPAD(n::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_assign_code ON employees;
CREATE TRIGGER trg_employees_assign_code
  BEFORE INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION employees_assign_code();

-- The code is printed on letters and payslips: it never changes once given
CREATE OR REPLACE FUNCTION employees_keep_code() RETURNS trigger AS $$
BEGIN
  IF NEW.employee_code IS DISTINCT FROM OLD.employee_code THEN
    RAISE EXCEPTION 'The Employee ID (%) cannot be changed.', OLD.employee_code USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_keep_code ON employees;
CREATE TRIGGER trg_employees_keep_code
  BEFORE UPDATE OF employee_code ON employees
  FOR EACH ROW EXECUTE FUNCTION employees_keep_code();

-- migrate:down
DROP TRIGGER IF EXISTS trg_employees_keep_code ON employees;
DROP TRIGGER IF EXISTS trg_employees_assign_code ON employees;
DROP FUNCTION IF EXISTS employees_keep_code();
DROP FUNCTION IF EXISTS employees_assign_code();
DROP INDEX IF EXISTS ux_employees_employee_code;
ALTER TABLE employees DROP COLUMN IF EXISTS employee_code;
DELETE FROM entity_counters WHERE entity_type = 'EMPLOYEE';
