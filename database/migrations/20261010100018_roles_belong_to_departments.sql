-- migrate:up

-- 1. Alter roles table: add new columns
ALTER TABLE roles ADD COLUMN dep_id integer NULL CONSTRAINT fk_roles_dep_id REFERENCES departments(dep_id);
ALTER TABLE roles ADD COLUMN description varchar(300) NULL;
ALTER TABLE roles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE roles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- 2. Guard: roles table must be empty before making dep_id NOT NULL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM roles) THEN
        RAISE EXCEPTION 'roles table must be empty: reset the branch first';
    END IF;
END $$;

ALTER TABLE roles ALTER COLUMN dep_id SET NOT NULL;

-- 3. Drop old unique index on role_name alone
DROP INDEX IF EXISTS ux_roles_role_name;

-- 4. Create new scoped indexes and constraints on roles
CREATE UNIQUE INDEX ux_roles_dep_name ON roles (dep_id, lower(role_name)) WHERE deleted_at IS NULL;
CREATE INDEX ix_roles_dep_active ON roles (dep_id) WHERE deleted_at IS NULL AND is_active;
ALTER TABLE roles ADD CONSTRAINT ux_roles_role_dep UNIQUE (role_id, dep_id);
ALTER TABLE roles ADD CONSTRAINT ck_roles_admin_active CHECK (NOT is_admin OR is_active);

-- 5. Alter employees table: composite foreign key and indexes
ALTER TABLE employees ADD CONSTRAINT fk_employees_role_in_department FOREIGN KEY (role_id, dep_id) REFERENCES roles (role_id, dep_id);
CREATE INDEX ix_employees_dep_role ON employees (dep_id, role_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_employees_list ON employees (lower(name), emp_id) WHERE deleted_at IS NULL;

-- migrate:down

DROP INDEX IF EXISTS ix_employees_list;
DROP INDEX IF EXISTS ix_employees_dep_role;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS fk_employees_role_in_department;

ALTER TABLE roles DROP CONSTRAINT IF EXISTS ck_roles_admin_active;
ALTER TABLE roles DROP CONSTRAINT IF EXISTS ux_roles_role_dep;
DROP INDEX IF EXISTS ix_roles_dep_active;
DROP INDEX IF EXISTS ux_roles_dep_name;

CREATE UNIQUE INDEX ux_roles_role_name ON roles (lower(role_name)) WHERE deleted_at IS NULL;

ALTER TABLE roles DROP CONSTRAINT IF EXISTS fk_roles_dep_id;
ALTER TABLE roles DROP COLUMN IF EXISTS is_admin;
ALTER TABLE roles DROP COLUMN IF EXISTS is_active;
ALTER TABLE roles DROP COLUMN IF EXISTS description;
ALTER TABLE roles DROP COLUMN IF EXISTS dep_id;
