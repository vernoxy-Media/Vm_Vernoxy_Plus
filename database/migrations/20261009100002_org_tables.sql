-- migrate:up
-- 1. departments
CREATE TABLE departments (
    dep_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(255) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_departments PRIMARY KEY (dep_id),
    CONSTRAINT ck_departments_name_non_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT ck_departments_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- 2. roles
CREATE TABLE roles (
    role_id integer GENERATED ALWAYS AS IDENTITY,
    role_name varchar(100) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_roles PRIMARY KEY (role_id),
    CONSTRAINT ck_roles_role_name_non_blank CHECK (length(btrim(role_name)) > 0),
    CONSTRAINT ck_roles_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- 3. employees
CREATE TABLE employees (
    emp_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(255) NOT NULL,
    email varchar(255) NOT NULL,
    mob varchar(20) NOT NULL,
    dep_id integer NOT NULL,
    role_id integer NOT NULL,
    reporting_manager integer,
    profile_picture varchar(500),
    status employee_status NOT NULL DEFAULT 'Active',
    joining_date date NOT NULL,
    exit_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_employees PRIMARY KEY (emp_id),
    CONSTRAINT fk_employees_dep_id FOREIGN KEY (dep_id) REFERENCES departments(dep_id),
    CONSTRAINT fk_employees_role_id FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT fk_employees_reporting_manager FOREIGN KEY (reporting_manager) REFERENCES employees(emp_id),
    CONSTRAINT ck_employees_name_non_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT ck_employees_reporting_manager_diff CHECK (reporting_manager IS NULL OR reporting_manager <> emp_id),
    CONSTRAINT ck_employees_exit_after_joining CHECK (exit_date IS NULL OR exit_date >= joining_date),
    CONSTRAINT ck_employees_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT ck_employees_mob_format CHECK (mob ~ '^\+?[0-9]{7,15}$'),
    CONSTRAINT ck_employees_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- migrate:down
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
