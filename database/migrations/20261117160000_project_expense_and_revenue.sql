-- migrate:up
-- =============================================================================
-- Project Expense + Project Revenue (Actual Expenses by Project, Project Profit)
--
--   * expense_claims.project_id  : the project a "Project Expense" is charged to.
--   * expense_claims.expense_type: now also allows 'Project Expense'.
--   * clients.project_revenue    : what the client agreed to pay (Admin only, optional,
--                                  entered when the lead is converted or later).
--   * projects.project_revenue   : optional per-project override. When empty, the client's
--                                  revenue is split equally between that client's projects.
-- =============================================================================

ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS project_id integer;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expense_claims_project_id') THEN
        ALTER TABLE expense_claims ADD CONSTRAINT fk_expense_claims_project_id
            FOREIGN KEY (project_id) REFERENCES projects(project_id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS ix_expense_claims_project ON expense_claims (project_id)
    WHERE project_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_type;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_type CHECK (
    expense_type IS NULL OR expense_type IN ('Office Expense', 'Personal Expense', 'Project Expense')
);
-- A project is only ever attached to a Project Expense, and a submitted Project Expense must have one.
ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_project;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_project CHECK (
    (expense_type IS DISTINCT FROM 'Project Expense' AND project_id IS NULL)
    OR (expense_type = 'Project Expense' AND (project_id IS NOT NULL OR status = 'DRAFT'))
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_revenue numeric(14, 2);
ALTER TABLE clients DROP CONSTRAINT IF EXISTS ck_clients_project_revenue;
ALTER TABLE clients ADD CONSTRAINT ck_clients_project_revenue CHECK (project_revenue IS NULL OR project_revenue >= 0);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_revenue numeric(14, 2);
ALTER TABLE projects DROP CONSTRAINT IF EXISTS ck_projects_project_revenue;
ALTER TABLE projects ADD CONSTRAINT ck_projects_project_revenue CHECK (project_revenue IS NULL OR project_revenue >= 0);

INSERT INTO expense_types (name, code, description, is_active, display_order, created_by)
SELECT 'Project Expense', 'PROJECT', 'Expenses charged directly to one project. They count in that project''s Actual Expense.', true, 3, 1
WHERE NOT EXISTS (SELECT 1 FROM expense_types WHERE code = 'PROJECT');

-- migrate:down
DELETE FROM expense_types WHERE code = 'PROJECT';
ALTER TABLE projects DROP CONSTRAINT IF EXISTS ck_projects_project_revenue;
ALTER TABLE projects DROP COLUMN IF EXISTS project_revenue;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS ck_clients_project_revenue;
ALTER TABLE clients DROP COLUMN IF EXISTS project_revenue;
ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_project;
ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_type;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_type CHECK (expense_type IN ('Office Expense', 'Personal Expense'));
DROP INDEX IF EXISTS ix_expense_claims_project;
ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS fk_expense_claims_project_id;
ALTER TABLE expense_claims DROP COLUMN IF EXISTS project_id;
