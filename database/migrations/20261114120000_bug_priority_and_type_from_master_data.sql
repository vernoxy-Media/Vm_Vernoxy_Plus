-- migrate:up
-- Bug Priority and Bug Type are now fully managed in Master Data (Settings > Projects). The columns were Postgres
-- enums, which only accepted the three/five values they were created with, so an Admin could not add a new one.
-- They become plain text holding the master_lookup code; the API checks the code against the active master rows.
ALTER TABLE project_bugs ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE project_bugs ALTER COLUMN priority TYPE VARCHAR(50) USING priority::text;
ALTER TABLE project_bugs ALTER COLUMN priority SET DEFAULT 'low';
ALTER TABLE project_bugs ALTER COLUMN bug_type TYPE VARCHAR(50) USING bug_type::text;

-- migrate:down
-- Fails if a bug already uses a code that is not one of the original enum values.
ALTER TABLE project_bugs ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE project_bugs ALTER COLUMN priority TYPE bug_priority USING priority::bug_priority;
ALTER TABLE project_bugs ALTER COLUMN priority SET DEFAULT 'low';
ALTER TABLE project_bugs ALTER COLUMN bug_type TYPE bug_type USING bug_type::bug_type;
