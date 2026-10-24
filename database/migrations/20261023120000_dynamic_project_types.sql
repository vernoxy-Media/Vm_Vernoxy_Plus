-- migrate:up
ALTER TABLE projects ALTER COLUMN project_type TYPE VARCHAR(50) USING project_type::text;
ALTER TABLE project_counters ALTER COLUMN project_type TYPE VARCHAR(50) USING project_type::text;

-- migrate:down
ALTER TABLE projects ALTER COLUMN project_type TYPE project_type USING project_type::project_type;
ALTER TABLE project_counters ALTER COLUMN project_type TYPE project_type USING project_type::project_type;
