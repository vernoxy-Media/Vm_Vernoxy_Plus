
-- migrate:up
-- =============================================================================
-- Migration: Expense Management Module Schema
-- Description: Creates tables, constraints, triggers, and seed data for the
--              Expense Management module strictly as specified in the BFD v1.0.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. expense_categories (Master Data)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_categories (
    category_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    code varchar(30),
    allowed_type varchar(20) NOT NULL DEFAULT 'BOTH',
    limit_per_claim numeric(12, 2),
    receipt_rule varchar(20) NOT NULL DEFAULT 'ABOVE_THRESHOLD',
    receipt_threshold_amount numeric(12, 2) NOT NULL DEFAULT 500.00,
    is_active boolean NOT NULL DEFAULT true,
    display_order integer NOT NULL DEFAULT 0,

    -- Audit & Soft Delete
    row_version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer REFERENCES employees(emp_id),
    updated_at timestamptz,
    updated_by integer REFERENCES employees(emp_id),
    deleted_at timestamptz,
    deleted_by integer REFERENCES employees(emp_id),

    CONSTRAINT pk_expense_categories PRIMARY KEY (category_id),
    CONSTRAINT ck_expense_categories_type CHECK (allowed_type IN ('OFFICE', 'PERSONAL', 'BOTH')),
    CONSTRAINT ck_expense_categories_receipt_rule CHECK (receipt_rule IN ('ALWAYS', 'ABOVE_THRESHOLD')),
    CONSTRAINT ck_expense_categories_limit CHECK (limit_per_claim IS NULL OR limit_per_claim > 0),
    CONSTRAINT ck_expense_categories_threshold CHECK (receipt_threshold_amount >= 0),
    CONSTRAINT ck_expense_categories_soft_delete CHECK (
        (deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_expense_categories_name 
    ON expense_categories (lower(name)) 
    WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 2. expense_general_settings (Singleton Configuration)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_general_settings (
    setting_id integer GENERATED ALWAYS AS IDENTITY,
    claim_window_days integer NOT NULL DEFAULT 60,
    after_claim_window_action varchar(20) NOT NULL DEFAULT 'FLAG_AS_LATE',
    duplicate_check_enabled boolean NOT NULL DEFAULT true,
    default_reimbursement_method varchar(20) NOT NULL DEFAULT 'DIRECT',
    approver_reminder_days integer NOT NULL DEFAULT 3,
    currency varchar(10) NOT NULL DEFAULT 'INR',

    -- Audit
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,
    updated_by integer REFERENCES employees(emp_id),

    CONSTRAINT pk_expense_general_settings PRIMARY KEY (setting_id),
    CONSTRAINT ck_expense_settings_window CHECK (claim_window_days BETWEEN 1 AND 365),
    CONSTRAINT ck_expense_settings_after_window CHECK (after_claim_window_action IN ('FLAG_AS_LATE', 'STOP_SUBMISSION')),
    CONSTRAINT ck_expense_settings_reimburse CHECK (default_reimbursement_method IN ('DIRECT', 'PAYROLL')),
    CONSTRAINT ck_expense_settings_reminder CHECK (approver_reminder_days BETWEEN 1 AND 30)
);

-- -----------------------------------------------------------------------------
-- 3. expense_authorised_approvers (Department Approver Mapping)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_authorised_approvers (
    approver_mapping_id integer GENERATED ALWAYS AS IDENTITY,
    department_id integer NOT NULL REFERENCES departments(dep_id),
    approver_emp_id integer NOT NULL REFERENCES employees(emp_id),

    -- Audit & Soft Delete
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer REFERENCES employees(emp_id),
    updated_at timestamptz,
    updated_by integer REFERENCES employees(emp_id),
    deleted_at timestamptz,
    deleted_by integer REFERENCES employees(emp_id),

    CONSTRAINT pk_expense_authorised_approvers PRIMARY KEY (approver_mapping_id),
    CONSTRAINT ck_expense_approvers_soft_delete CHECK (
        (deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_expense_dept_approver 
    ON expense_authorised_approvers (department_id) 
    WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 4. expense_claims (Core Entity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_claims (
    claim_id integer GENERATED ALWAYS AS IDENTITY,
    claim_no varchar(30),
    emp_id integer NOT NULL REFERENCES employees(emp_id),
    expense_date date NOT NULL,
    category_id integer NOT NULL REFERENCES expense_categories(category_id),
    expense_type varchar(20) NOT NULL,
    amount numeric(12, 2) NOT NULL,
    merchant_name varchar(100),
    description varchar(500) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'DRAFT',

    -- System Automated Flags
    is_above_limit boolean NOT NULL DEFAULT false,
    is_possible_duplicate boolean NOT NULL DEFAULT false,
    duplicate_reference_claim_id integer REFERENCES expense_claims(claim_id),
    is_late boolean NOT NULL DEFAULT false,

    -- Routing & Submission
    submitted_at timestamptz,
    approver_emp_id integer REFERENCES employees(emp_id),

    -- Review & Decision
    decided_at timestamptz,
    decided_by integer REFERENCES employees(emp_id),
    decision_remarks varchar(500),
    rejection_reason varchar(50),
    flags_acknowledged boolean NOT NULL DEFAULT false,
    is_self_approved boolean NOT NULL DEFAULT false,

    -- Reimbursement
    reimbursement_method varchar(20),
    reimbursed_at timestamptz,
    reimbursed_by integer REFERENCES employees(emp_id),

    -- Direct Reimbursement Specifics
    payment_mode varchar(30),
    payment_reference_no varchar(80),
    payment_date date,

    -- Payroll Reimbursement Specifics
    payroll_run_id integer REFERENCES payroll_runs(payroll_run_id),
    payroll_adjustment_id integer REFERENCES payroll_adjustments(payroll_adjustment_id),

    -- Origin Tracking
    copied_from_claim_id integer REFERENCES expense_claims(claim_id),

    -- Audit & Soft Delete
    row_version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NOT NULL REFERENCES employees(emp_id),
    updated_at timestamptz,
    updated_by integer REFERENCES employees(emp_id),
    deleted_at timestamptz,
    deleted_by integer REFERENCES employees(emp_id),

    CONSTRAINT pk_expense_claims PRIMARY KEY (claim_id),
    CONSTRAINT ck_expense_claims_status CHECK (
        status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED')
    ),
    CONSTRAINT ck_expense_claims_type CHECK (
        expense_type IN ('Office Expense', 'Personal Expense')
    ),
    CONSTRAINT ck_expense_claims_amount CHECK (
        amount > 0 AND amount <= 1000000.00
    ),
    CONSTRAINT ck_expense_claims_desc_len CHECK (
        char_length(btrim(description)) >= 10 AND char_length(description) <= 500
    ),
    CONSTRAINT ck_expense_claims_date CHECK (
        expense_date <= CURRENT_DATE
    ),
    CONSTRAINT ck_expense_claims_rejection CHECK (
        (status <> 'REJECTED') OR (
            rejection_reason IN (
                'Receipt missing or unclear',
                'Amount does not match receipt',
                'Not a business expense',
                'Not allowed under policy',
                'Above policy limit',
                'Duplicate claim',
                'Submitted too late',
                'Wrong category or type',
                'Other'
            ) 
            AND decision_remarks IS NOT NULL 
            AND char_length(btrim(decision_remarks)) >= 10
        )
    ),
    CONSTRAINT ck_expense_claims_reimbursement_method CHECK (
        reimbursement_method IS NULL OR reimbursement_method IN ('DIRECT', 'PAYROLL')
    ),
    CONSTRAINT ck_expense_claims_payment_mode CHECK (
        payment_mode IS NULL OR payment_mode IN ('Bank Transfer', 'UPI', 'Cash', 'Cheque')
    ),
    CONSTRAINT ck_expense_claims_soft_delete CHECK (
        (deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_expense_claims_claim_no 
    ON expense_claims (claim_no) 
    WHERE claim_no IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_expense_claims_emp_status 
    ON expense_claims (emp_id, status, expense_date DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_expense_claims_approver_queue 
    ON expense_claims (approver_emp_id, status, submitted_at ASC) 
    WHERE status = 'SUBMITTED' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_expense_claims_payroll_run 
    ON expense_claims (payroll_run_id) 
    WHERE payroll_run_id IS NOT NULL AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 5. expense_claim_receipts (Receipt Storage)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_claim_receipts (
    receipt_id integer GENERATED ALWAYS AS IDENTITY,
    claim_id integer NOT NULL REFERENCES expense_claims(claim_id) ON DELETE CASCADE,
    file_name varchar(255) NOT NULL,
    file_url varchar(500) NOT NULL,
    file_size_bytes bigint NOT NULL,
    mime_type varchar(100) NOT NULL,
    display_order integer NOT NULL DEFAULT 1,

    -- Audit & Soft Delete
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

CREATE INDEX IF NOT EXISTS ix_expense_receipts_claim 
    ON expense_claim_receipts (claim_id) 
    WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 6. expense_claim_history (Claim Audit Trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_claim_history (
    history_id integer GENERATED ALWAYS AS IDENTITY,
    claim_id integer NOT NULL REFERENCES expense_claims(claim_id) ON DELETE CASCADE,
    event varchar(50) NOT NULL,
    performed_by integer NOT NULL REFERENCES employees(emp_id),
    performed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    remarks varchar(500),
    details text,

    CONSTRAINT pk_expense_claim_history PRIMARY KEY (history_id),
    CONSTRAINT ck_expense_history_event CHECK (
        event IN (
            'Draft Saved',
            'Submitted',
            'Withdrawn',
            'Approved',
            'Rejected',
            'Reopened by Admin',
            'Added to Payroll',
            'Removed from Payroll',
            'Reimbursed Directly',
            'Reimbursed with Salary'
        )
    )
);

CREATE INDEX IF NOT EXISTS ix_expense_history_claim 
    ON expense_claim_history (claim_id, performed_at DESC);

-- -----------------------------------------------------------------------------
-- 7. expense_settings_change_log (Settings Audit Log)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_settings_change_log (
    log_id integer GENERATED ALWAYS AS IDENTITY,
    entity_type varchar(30) NOT NULL,
    entity_id integer NOT NULL,
    field_name varchar(50) NOT NULL,
    old_value text,
    new_value text,
    changed_by integer NOT NULL REFERENCES employees(emp_id),
    changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT pk_expense_settings_change_log PRIMARY KEY (log_id),
    CONSTRAINT ck_expense_settings_log_type CHECK (
        entity_type IN ('CATEGORY', 'GENERAL_SETTINGS', 'AUTHORISED_APPROVER')
    )
);

CREATE INDEX IF NOT EXISTS ix_expense_settings_log 
    ON expense_settings_change_log (entity_type, entity_id, changed_at DESC);

-- -----------------------------------------------------------------------------
-- 8. Hard Delete Prevention Triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_prevent_hard_delete_expense_categories
    BEFORE DELETE ON expense_categories
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_hard_delete_expense_approvers
    BEFORE DELETE ON expense_authorised_approvers
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_hard_delete_expense_claims
    BEFORE DELETE ON expense_claims
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_hard_delete_expense_receipts
    BEFORE DELETE ON expense_claim_receipts
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

-- -----------------------------------------------------------------------------
-- 9. Initial Seed Data
-- -----------------------------------------------------------------------------
INSERT INTO expense_general_settings (
    claim_window_days, after_claim_window_action, duplicate_check_enabled,
    default_reimbursement_method, approver_reminder_days, currency
) VALUES (
    60, 'FLAG_AS_LATE', true, 'DIRECT', 3, 'INR'
);

INSERT INTO expense_categories (name, code, allowed_type, limit_per_claim, receipt_rule, receipt_threshold_amount, display_order)
VALUES 
    ('Travel – Local Conveyance', 'TRAVEL_LOCAL', 'BOTH', 1500.00, 'ABOVE_THRESHOLD', 500.00, 1),
    ('Travel – Outstation', 'TRAVEL_OUTSTATION', 'OFFICE', NULL, 'ALWAYS', 0.00, 2),
    ('Food & Meals', 'FOOD_MEALS', 'BOTH', 2000.00, 'ABOVE_THRESHOLD', 500.00, 3),
    ('Office Supplies', 'OFFICE_SUPPLIES', 'OFFICE', 5000.00, 'ALWAYS', 0.00, 4),
    ('Internet & Mobile', 'INTERNET_MOBILE', 'PERSONAL', 1500.00, 'ALWAYS', 0.00, 5),
    ('Client Entertainment', 'CLIENT_ENTERTAINMENT', 'OFFICE', 10000.00, 'ALWAYS', 0.00, 6),
    ('Training & Certification', 'TRAINING_CERT', 'BOTH', 25000.00, 'ALWAYS', 0.00, 7),
    ('Medical', 'MEDICAL', 'PERSONAL', 15000.00, 'ALWAYS', 0.00, 8);

-- Permissions for application user
GRANT SELECT, INSERT, UPDATE ON expense_categories TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON expense_general_settings TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON expense_authorised_approvers TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON expense_claims TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON expense_claim_receipts TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON expense_claim_history TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON expense_settings_change_log TO pulse_app;

-- migrate:down
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_expense_receipts ON expense_claim_receipts;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_expense_claims ON expense_claims;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_expense_approvers ON expense_authorised_approvers;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_expense_categories ON expense_categories;

DROP TABLE IF EXISTS expense_settings_change_log;
DROP TABLE IF EXISTS expense_claim_history;
DROP TABLE IF EXISTS expense_claim_receipts;
DROP TABLE IF EXISTS expense_claims;
DROP TABLE IF EXISTS expense_authorised_approvers;
DROP TABLE IF EXISTS expense_general_settings;
DROP TABLE IF EXISTS expense_categories;
