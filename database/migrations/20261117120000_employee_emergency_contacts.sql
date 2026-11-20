-- migrate:up
-- An employee can have several emergency contacts. The single contact kept on the employee row stays as a copy of
-- the first one, so everything that already reads it (documents, exports) keeps working.
CREATE TABLE IF NOT EXISTS employee_emergency_contacts (
    contact_id integer GENERATED ALWAYS AS IDENTITY,
    emp_id integer NOT NULL,
    name varchar(150) NOT NULL,
    relation varchar(50),
    phone varchar(20) NOT NULL,
    sort_order smallint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_employee_emergency_contacts PRIMARY KEY (contact_id),
    CONSTRAINT fk_employee_emergency_contacts_emp FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE,
    CONSTRAINT ck_employee_emergency_contacts_name CHECK (length(btrim(name)) >= 1),
    CONSTRAINT ck_employee_emergency_contacts_phone CHECK (length(btrim(phone)) >= 1)
);

CREATE INDEX IF NOT EXISTS ix_employee_emergency_contacts_emp ON employee_emergency_contacts (emp_id, sort_order);

-- Copy the contact that was already saved on each employee
INSERT INTO employee_emergency_contacts (emp_id, name, relation, phone, sort_order)
SELECT e.emp_id, btrim(e.emergency_contact_name), NULLIF(btrim(e.emergency_contact_relation), ''), btrim(e.emergency_contact_number), 1
FROM employees e
WHERE e.deleted_at IS NULL
  AND COALESCE(btrim(e.emergency_contact_name), '') <> ''
  AND COALESCE(btrim(e.emergency_contact_number), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM employee_emergency_contacts c WHERE c.emp_id = e.emp_id);

-- migrate:down
DROP TABLE IF EXISTS employee_emergency_contacts;
