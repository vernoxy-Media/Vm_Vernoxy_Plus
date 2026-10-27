-- migrate:up
-- =============================================================================
-- Migration: Employee Management Enhancements
-- Description: Adds personal, employment, deactivation fields, multi-departments,
--              and employee history tracking.
-- =============================================================================

-- 1. Insert Master Lookups for Gender, Employment Type, and Deactivation Reasons
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('gender', 'male', 'Male', 10),
    ('gender', 'female', 'Female', 20),
    ('gender', 'other', 'Other', 30),

    ('employment_type', 'full_time', 'Full-time', 10),
    ('employment_type', 'part_time', 'Part-time', 20),
    ('employment_type', 'intern', 'Intern', 30),
    ('employment_type', 'contract', 'Contract', 40),

    ('deactivation_reason', 'resigned', 'Resigned', 10),
    ('deactivation_reason', 'terminated', 'Terminated', 20),
    ('deactivation_reason', 'contract_ended', 'Contract ended', 30),
    ('deactivation_reason', 'retired', 'Retired', 40),
    ('deactivation_reason', 'absconded', 'Absconded', 50),
    ('deactivation_reason', 'other', 'Other', 60),

    ('blood_group', 'a_pos', 'A+', 10),
    ('blood_group', 'a_neg', 'A-', 20),
    ('blood_group', 'b_pos', 'B+', 30),
    ('blood_group', 'b_neg', 'B-', 40),
    ('blood_group', 'ab_pos', 'AB+', 50),
    ('blood_group', 'ab_neg', 'AB-', 60),
    ('blood_group', 'o_pos', 'O+', 70),
    ('blood_group', 'o_neg', 'O-', 80)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- 2. Add new columns to 'employees' table
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS gender_id INT REFERENCES master_lookup(lookup_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS office_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50),
    ADD COLUMN IF NOT EXISTS employment_type_id INT REFERENCES master_lookup(lookup_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS salary NUMERIC(12, 2) DEFAULT 0 CHECK (salary >= 0),
    ADD COLUMN IF NOT EXISTS pf NUMERIC(12, 2) DEFAULT 0 CHECK (pf >= 0),
    ADD COLUMN IF NOT EXISTS termination_date DATE,
    ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(100),
    ADD COLUMN IF NOT EXISTS deactivation_notes TEXT,
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deactivated_by INT REFERENCES employees(emp_id) ON DELETE SET NULL;

-- 3. Create 'employee_departments' junction table for multiple departments
CREATE TABLE IF NOT EXISTS employee_departments (
    emp_id INT NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
    dep_id INT NOT NULL REFERENCES departments(dep_id) ON DELETE RESTRICT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT REFERENCES employees(emp_id) ON DELETE SET NULL,
    PRIMARY KEY (emp_id, dep_id)
);

CREATE INDEX IF NOT EXISTS ix_employee_departments_dep_id ON employee_departments(dep_id);
CREATE INDEX IF NOT EXISTS ix_employee_departments_emp_id ON employee_departments(emp_id);

-- Backfill existing employees into employee_departments from their dep_id
INSERT INTO employee_departments (emp_id, dep_id, is_primary)
SELECT emp_id, dep_id, TRUE
FROM employees
WHERE dep_id IS NOT NULL AND deleted_at IS NULL
ON CONFLICT (emp_id, dep_id) DO NOTHING;

-- 4. Create 'employee_history' table for career timeline & milestones
CREATE TABLE IF NOT EXISTS employee_history (
    history_id SERIAL PRIMARY KEY,
    emp_id INT NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'HIRED', 'PROMOTION', 'TRANSFER', 'SALARY_REVISION', 'MANAGER_CHANGE', 'DEACTIVATED', 'REACTIVATED'
    title VARCHAR(200) NOT NULL,
    department_ids INT[],
    role_id INT REFERENCES roles(role_id) ON DELETE SET NULL,
    manager_id INT REFERENCES employees(emp_id) ON DELETE SET NULL,
    employment_type VARCHAR(50),
    salary NUMERIC(12, 2),
    effective_date DATE NOT NULL,
    reason VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT REFERENCES employees(emp_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_employee_history_emp_id ON employee_history(emp_id);
CREATE INDEX IF NOT EXISTS ix_employee_history_effective_date ON employee_history(effective_date);

-- Backfill initial 'HIRED' event for existing employees
INSERT INTO employee_history (emp_id, event_type, title, department_ids, role_id, manager_id, effective_date, reason)
SELECT 
    e.emp_id,
    'HIRED',
    'Joined the company',
    ARRAY[e.dep_id],
    e.role_id,
    e.reporting_manager,
    COALESCE(e.joining_date, e.created_at::DATE),
    'Initial Hire'
FROM employees e
WHERE e.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM employee_history h WHERE h.emp_id = e.emp_id AND h.event_type = 'HIRED'
);

-- migrate:down
DROP TABLE IF EXISTS employee_history;
DROP TABLE IF EXISTS employee_departments;

ALTER TABLE employees
    DROP COLUMN IF EXISTS gender_id,
    DROP COLUMN IF EXISTS personal_email,
    DROP COLUMN IF EXISTS office_email,
    DROP COLUMN IF EXISTS birth_date,
    DROP COLUMN IF EXISTS blood_group,
    DROP COLUMN IF EXISTS address,
    DROP COLUMN IF EXISTS emergency_contact_name,
    DROP COLUMN IF EXISTS emergency_contact_number,
    DROP COLUMN IF EXISTS emergency_contact_relation,
    DROP COLUMN IF EXISTS employment_type_id,
    DROP COLUMN IF EXISTS salary,
    DROP COLUMN IF EXISTS pf,
    DROP COLUMN IF EXISTS termination_date,
    DROP COLUMN IF EXISTS deactivation_reason,
    DROP COLUMN IF EXISTS deactivation_notes,
    DROP COLUMN IF EXISTS deactivated_at,
    DROP COLUMN IF EXISTS deactivated_by;
