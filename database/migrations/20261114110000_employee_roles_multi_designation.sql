-- migrate:up
-- An employee can hold several departments, and now also several designations (one or more per selected
-- department). employees.role_id / employees.dep_id keep holding the PRIMARY designation and its department,
-- so everything that already reads them keeps working; this table lists every designation the employee has.
CREATE TABLE IF NOT EXISTS employee_roles (
    emp_id     INTEGER     NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
    role_id    INTEGER     NOT NULL REFERENCES roles(role_id),
    dep_id     INTEGER     NOT NULL REFERENCES departments(dep_id),
    is_primary BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by INTEGER     REFERENCES employees(emp_id),
    CONSTRAINT pk_employee_roles PRIMARY KEY (emp_id, role_id)
);

CREATE INDEX IF NOT EXISTS ix_employee_roles_emp_id ON employee_roles (emp_id);
CREATE INDEX IF NOT EXISTS ix_employee_roles_role_id ON employee_roles (role_id);

-- Every employee that already has a designation keeps it as the primary one.
INSERT INTO employee_roles (emp_id, role_id, dep_id, is_primary)
SELECT e.emp_id, e.role_id, r.dep_id, TRUE
FROM employees e
JOIN roles r ON r.role_id = e.role_id
WHERE e.role_id IS NOT NULL
ON CONFLICT (emp_id, role_id) DO NOTHING;

-- migrate:down
DROP TABLE IF EXISTS employee_roles;
