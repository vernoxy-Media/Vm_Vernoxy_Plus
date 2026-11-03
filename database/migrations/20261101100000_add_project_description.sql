-- migrate:up
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description text NULL;

-- migrate:down
ALTER TABLE projects DROP COLUMN IF EXISTS description;

