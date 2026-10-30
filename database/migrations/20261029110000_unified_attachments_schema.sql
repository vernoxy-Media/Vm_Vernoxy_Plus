-- migrate:up
-- =============================================================================
-- Migration: Unified Attachments Schema
-- Description: Creates a centralized, normalized polymorphic attachments table
--              to store files, documents, images across all modules (Expense claims,
--              Leave requests, Attendance proofs, Employee avatars, Tasks, etc.).
--              Replaces module-specific file tables with zero duplicate data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create attachments table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
    attachment_id integer GENERATED ALWAYS AS IDENTITY,

    -- Polymorphic Parent Link
    entity_type varchar(50) NOT NULL,
    entity_id integer NOT NULL,

    -- File Metadata
    file_name varchar(255) NOT NULL,
    file_url varchar(500) NOT NULL,
    file_size_bytes bigint NOT NULL,
    mime_type varchar(100) NOT NULL,
    display_order integer NOT NULL DEFAULT 1,

    -- Audit & Soft Delete (Strictly No Hard Delete)
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NOT NULL REFERENCES employees(emp_id),
    deleted_at timestamptz,
    deleted_by integer REFERENCES employees(emp_id),

    CONSTRAINT pk_attachments PRIMARY KEY (attachment_id),
    CONSTRAINT ck_attachments_file_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 26214400), -- max 25MB
    CONSTRAINT ck_attachments_soft_delete CHECK (
        (deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL)
    )
);

-- Fast Index for looking up all active attachments of any entity
CREATE INDEX IF NOT EXISTS ix_attachments_entity 
    ON attachments (entity_type, entity_id, display_order ASC) 
    WHERE deleted_at IS NULL;

-- Fast Index for employee file queries / audits
CREATE INDEX IF NOT EXISTS ix_attachments_created_by 
    ON attachments (created_by) 
    WHERE deleted_at IS NULL;

-- Hard Delete Prevention Trigger
CREATE TRIGGER trg_prevent_hard_delete_attachments
    BEFORE DELETE ON attachments
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

-- Permissions for application user
GRANT SELECT, INSERT, UPDATE ON attachments TO pulse_app;

-- -----------------------------------------------------------------------------
-- 2. Clean up redundant expense_claim_receipts table
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_expense_receipts ON expense_claim_receipts;
DROP TABLE IF EXISTS expense_claim_receipts;

-- migrate:down
-- Recreate expense_claim_receipts if rolled back
CREATE TABLE IF NOT EXISTS expense_claim_receipts (
    receipt_id integer GENERATED ALWAYS AS IDENTITY,
    claim_id integer NOT NULL REFERENCES expense_claims(claim_id) ON DELETE CASCADE,
    file_name varchar(255) NOT NULL,
    file_url varchar(500) NOT NULL,
    file_size_bytes bigint NOT NULL,
    mime_type varchar(100) NOT NULL,
    display_order integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NOT NULL REFERENCES employees(emp_id),
    deleted_at timestamptz,
    deleted_by integer REFERENCES employees(emp_id),
    CONSTRAINT pk_expense_claim_receipts PRIMARY KEY (receipt_id),
    CONSTRAINT ck_expense_receipts_size CHECK (file_size_bytes <= 5242880),
    CONSTRAINT ck_expense_receipts_mime CHECK (
        mime_type IN ('application/pdf', 'image/jpeg', 'image/png')
    ),
    CONSTRAINT ck_expense_receipts_soft_delete CHECK (
        (deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL)
    )
);

CREATE TRIGGER trg_prevent_hard_delete_expense_receipts
    BEFORE DELETE ON expense_claim_receipts
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_prevent_hard_delete_attachments ON attachments;
DROP TABLE IF EXISTS attachments;
