-- migrate:up
-- -----------------------------------------------------------------------------
-- Expense Types Master Data Table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS expense_types (
    type_id SERIAL CONSTRAINT pk_expense_types PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by INT,
    updated_at TIMESTAMPTZ,
    updated_by INT,
    deleted_at TIMESTAMPTZ,
    deleted_by INT,
    CONSTRAINT uq_expense_types_name UNIQUE (name),
    CONSTRAINT uq_expense_types_code UNIQUE (code),
    CONSTRAINT fk_expense_types_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id) ON DELETE NO ACTION,
    CONSTRAINT fk_expense_types_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id) ON DELETE NO ACTION,
    CONSTRAINT fk_expense_types_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id) ON DELETE NO ACTION,
    CONSTRAINT chk_expense_types_soft_delete CHECK (
        (deleted_at IS NULL AND deleted_by IS NULL) OR
        (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_expense_types_active ON expense_types (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_types_display_order ON expense_types (display_order);

-- Prevent hard delete trigger
CREATE TRIGGER trg_prevent_hard_delete_expense_types
BEFORE DELETE ON expense_types
FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

-- Seed Default Expense Types (Office Expense & Personal Expense)
INSERT INTO expense_types (name, code, description, is_active, display_order, created_by)
VALUES
    ('Office Expense', 'OFFICE', 'Expenses incurred directly for company business, clients, and official operations.', true, 1, 1),
    ('Personal Expense', 'PERSONAL', 'Expenses incurred for personal needs that company policy allows to be claimed under benefits.', true, 2, 1)
ON CONFLICT (name) DO NOTHING;

-- migrate:down
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_expense_types ON expense_types;
DROP TABLE IF EXISTS expense_types;
