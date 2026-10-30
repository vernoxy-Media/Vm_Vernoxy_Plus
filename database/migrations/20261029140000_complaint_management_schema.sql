-- migrate:up
-- =============================================================================
-- Migration: Complaint Management Module Schema
-- Description: Creates tables, constraints, triggers, indexes, and seed data for
--              Complaint Management strictly as specified in BFD v1.0.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. complaint_types (Master Data Table - BFD Page 12 & 29)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_types (
    type_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    code varchar(50) NOT NULL,
    description varchar(500) NOT NULL,
    default_handler_id integer REFERENCES employees(emp_id),
    default_department_id integer REFERENCES departments(dep_id),
    default_priority varchar(20) NOT NULL DEFAULT 'Medium',
    is_always_confidential boolean NOT NULL DEFAULT false,
    display_order integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,

    -- Audit & Soft Delete
    row_version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer REFERENCES employees(emp_id),
    updated_at timestamptz,
    updated_by integer REFERENCES employees(emp_id),
    deleted_at timestamptz,
    deleted_by integer REFERENCES employees(emp_id),

    CONSTRAINT pk_complaint_types PRIMARY KEY (type_id),
    CONSTRAINT ck_complaint_types_priority CHECK (default_priority IN ('Low', 'Medium', 'High', 'Urgent')),
    CONSTRAINT ck_complaint_types_soft_delete CHECK (
        (deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_complaint_types_name 
    ON complaint_types (lower(name)) 
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_complaint_types_code 
    ON complaint_types (lower(code)) 
    WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 2. complaint_settings (Singleton Configuration - BFD Page 29)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_settings (
    setting_id integer GENERATED ALWAYS AS IDENTITY,
    target_days_low integer NOT NULL DEFAULT 15,
    target_days_medium integer NOT NULL DEFAULT 7,
    target_days_high integer NOT NULL DEFAULT 3,
    target_days_urgent integer NOT NULL DEFAULT 1,
    confirmation_window_days integer NOT NULL DEFAULT 7,
    reminder_before_target_days integer NOT NULL DEFAULT 1,
    review_reminder_hours integer NOT NULL DEFAULT 24,
    old_date_warning_days integer NOT NULL DEFAULT 90,
    duplicate_warning boolean NOT NULL DEFAULT true,

    -- Audit
    row_version integer NOT NULL DEFAULT 1,
    updated_at timestamptz,
    updated_by integer REFERENCES employees(emp_id),

    CONSTRAINT pk_complaint_settings PRIMARY KEY (setting_id),
    CONSTRAINT ck_complaint_settings_low CHECK (target_days_low BETWEEN 1 AND 90),
    CONSTRAINT ck_complaint_settings_medium CHECK (target_days_medium BETWEEN 1 AND 90),
    CONSTRAINT ck_complaint_settings_high CHECK (target_days_high BETWEEN 1 AND 90),
    CONSTRAINT ck_complaint_settings_urgent CHECK (target_days_urgent BETWEEN 1 AND 90),
    CONSTRAINT ck_complaint_settings_window CHECK (confirmation_window_days BETWEEN 1 AND 30)
);

-- -----------------------------------------------------------------------------
-- 3. complaint_settings_change_log (BFD Page 29)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_settings_change_log (
    log_id integer GENERATED ALWAYS AS IDENTITY,
    field_name varchar(100) NOT NULL,
    old_value varchar(255),
    new_value varchar(255) NOT NULL,
    changed_by integer NOT NULL REFERENCES employees(emp_id),
    changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT pk_complaint_settings_change_log PRIMARY KEY (log_id)
);

-- -----------------------------------------------------------------------------
-- 4. complaints (Core Entity - BFD Pages 6, 8, 11, 14, 18, 19, 20, 26, 33)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id integer GENERATED ALWAYS AS IDENTITY,
    complaint_no varchar(30) NOT NULL,
    complainant_id integer NOT NULL REFERENCES employees(emp_id),
    complaint_type_id integer NOT NULL REFERENCES complaint_types(type_id),
    complaint_date date NOT NULL,
    related_department_id integer NOT NULL REFERENCES departments(dep_id),
    related_project_id integer REFERENCES projects(project_id),
    subject varchar(150) NOT NULL,
    description varchar(2000) NOT NULL,
    is_confidential boolean NOT NULL DEFAULT false,
    confidential_reason varchar(500),
    status varchar(20) NOT NULL DEFAULT 'New',
    priority varchar(20),
    handler_id integer REFERENCES employees(emp_id),
    assigned_at timestamptz,
    assigned_by integer REFERENCES employees(emp_id),
    first_target_date date,
    target_date date,
    target_change_reason varchar(500),
    priority_change_reason varchar(500),
    reassign_reason varchar(500),
    work_started_at timestamptz,
    reopen_count integer NOT NULL DEFAULT 0,
    is_self_reviewed boolean NOT NULL DEFAULT false,
    closure_type varchar(30),
    closed_at timestamptz,
    closed_by integer REFERENCES employees(emp_id),
    closure_remarks varchar(1000),
    close_without_action_reason varchar(50),
    close_without_action_remarks varchar(1000),
    linked_complaint_id integer REFERENCES complaints(complaint_id),
    withdrawal_reason varchar(1000),
    withdrawn_at timestamptz,

    -- Audit & Soft Delete
    row_version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NOT NULL REFERENCES employees(emp_id),
    updated_at timestamptz,
    updated_by integer REFERENCES employees(emp_id),
    deleted_at timestamptz,
    deleted_by integer REFERENCES employees(emp_id),

    CONSTRAINT pk_complaints PRIMARY KEY (complaint_id),
    CONSTRAINT uq_complaints_no UNIQUE (complaint_no),
    CONSTRAINT ck_complaints_subject CHECK (char_length(subject) BETWEEN 5 AND 150),
    CONSTRAINT ck_complaints_description CHECK (char_length(description) BETWEEN 20 AND 2000),
    CONSTRAINT ck_complaints_status CHECK (status IN ('New', 'Open', 'In Progress', 'Resolved', 'Closed')),
    CONSTRAINT ck_complaints_priority CHECK (priority IS NULL OR priority IN ('Low', 'Medium', 'High', 'Urgent')),
    CONSTRAINT ck_complaints_handler CHECK (handler_id IS NULL OR handler_id <> complainant_id),
    CONSTRAINT ck_complaints_closure_type CHECK (closure_type IS NULL OR closure_type IN ('Resolved', 'Without action', 'Withdrawn')),
    CONSTRAINT ck_complaints_close_without_action_reason CHECK (
        close_without_action_reason IS NULL OR 
        close_without_action_reason IN ('Duplicate', 'Not a complaint', 'Belongs to another process', 'Not enough information', 'Other')
    ),
    CONSTRAINT ck_complaints_soft_delete CHECK (
        (deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL)
    )
);

-- -----------------------------------------------------------------------------
-- 5. complaint_actions (Actions Taken - BFD Page 22, 23)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_actions (
    action_id integer GENERATED ALWAYS AS IDENTITY,
    complaint_id integer NOT NULL REFERENCES complaints(complaint_id),
    action_date date NOT NULL,
    action_text varchar(1000) NOT NULL,
    created_by integer NOT NULL REFERENCES employees(emp_id),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT pk_complaint_actions PRIMARY KEY (action_id),
    CONSTRAINT ck_complaint_actions_text CHECK (char_length(action_text) BETWEEN 10 AND 1000)
);

-- -----------------------------------------------------------------------------
-- 6. complaint_remarks (Remarks Thread - BFD Page 22, 23)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_remarks (
    remark_id integer GENERATED ALWAYS AS IDENTITY,
    complaint_id integer NOT NULL REFERENCES complaints(complaint_id),
    remark_text varchar(1000) NOT NULL,
    is_internal boolean NOT NULL DEFAULT false,
    created_by integer NOT NULL REFERENCES employees(emp_id),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT pk_complaint_remarks PRIMARY KEY (remark_id),
    CONSTRAINT ck_complaint_remarks_text CHECK (char_length(remark_text) BETWEEN 1 AND 1000)
);

-- -----------------------------------------------------------------------------
-- 7. complaint_resolutions (Resolution Cycles - BFD Page 24, 25, 26)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_resolutions (
    resolution_id integer GENERATED ALWAYS AS IDENTITY,
    complaint_id integer NOT NULL REFERENCES complaints(complaint_id),
    cycle_number integer NOT NULL DEFAULT 1,
    outcome varchar(50) NOT NULL,
    resolution_details varchar(2000) NOT NULL,
    root_cause varchar(500),
    resolved_by integer NOT NULL REFERENCES employees(emp_id),
    resolved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    confirmation_window_ends_at timestamptz NOT NULL,
    employee_confirmation_status varchar(20) NOT NULL DEFAULT 'Pending',
    employee_confirmed_at timestamptz,
    employee_comment varchar(500),
    reopened_at timestamptz,
    reopen_reason varchar(1000),

    CONSTRAINT pk_complaint_resolutions PRIMARY KEY (resolution_id),
    CONSTRAINT ck_complaint_resolutions_outcome CHECK (
        outcome IN ('Resolved – issue fixed', 'Resolved – explained', 'Partly resolved', 'Not upheld', 'Action taken')
    ),
    CONSTRAINT ck_complaint_resolutions_details CHECK (char_length(resolution_details) BETWEEN 20 AND 2000),
    CONSTRAINT ck_complaint_resolutions_conf_status CHECK (
        employee_confirmation_status IN ('Pending', 'Confirmed', 'Reopened', 'No response')
    ),
    CONSTRAINT ck_complaint_resolutions_reopen CHECK (
        reopen_reason IS NULL OR char_length(reopen_reason) BETWEEN 10 AND 1000
    )
);

-- -----------------------------------------------------------------------------
-- 8. complaint_history (Immutable Event Log - BFD Page 27)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_history (
    history_id integer GENERATED ALWAYS AS IDENTITY,
    complaint_id integer NOT NULL REFERENCES complaints(complaint_id),
    event varchar(100) NOT NULL,
    performed_by integer REFERENCES employees(emp_id),
    old_value text,
    new_value text,
    remarks varchar(1000),
    is_internal boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT pk_complaint_history PRIMARY KEY (history_id)
);

-- -----------------------------------------------------------------------------
-- 9. Performance Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_complaints_complainant_status ON complaints (complainant_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_handler_status ON complaints (handler_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status);
CREATE INDEX IF NOT EXISTS idx_complaints_target_date ON complaints (target_date);
CREATE INDEX IF NOT EXISTS idx_complaints_date_basis ON complaints (complaint_date, created_at, closed_at);
CREATE INDEX IF NOT EXISTS idx_complaints_type_dept ON complaints (complaint_type_id, related_department_id);

CREATE INDEX IF NOT EXISTS idx_complaint_actions_complaint ON complaint_actions (complaint_id, action_date);
CREATE INDEX IF NOT EXISTS idx_complaint_remarks_complaint ON complaint_remarks (complaint_id, created_at);
CREATE INDEX IF NOT EXISTS idx_complaint_resolutions_complaint ON complaint_resolutions (complaint_id, cycle_number);
CREATE INDEX IF NOT EXISTS idx_complaint_history_complaint ON complaint_history (complaint_id, created_at);

-- -----------------------------------------------------------------------------
-- 10. Hard Delete Prevention Triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_prevent_hard_delete_complaint_types
    BEFORE DELETE ON complaint_types
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_hard_delete_complaints
    BEFORE DELETE ON complaints
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_hard_delete_complaint_actions
    BEFORE DELETE ON complaint_actions
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_hard_delete_complaint_remarks
    BEFORE DELETE ON complaint_remarks
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_hard_delete_complaint_resolutions
    BEFORE DELETE ON complaint_resolutions
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

-- -----------------------------------------------------------------------------
-- 11. Initial Seed Data (BFD Page 12 & Page 29)
-- -----------------------------------------------------------------------------
INSERT INTO complaint_settings (
    target_days_low, target_days_medium, target_days_high, target_days_urgent,
    confirmation_window_days, reminder_before_target_days, review_reminder_hours,
    old_date_warning_days, duplicate_warning
) VALUES (
    15, 7, 3, 1, 7, 1, 24, 90, true
);

INSERT INTO complaint_types (name, code, description, default_priority, is_always_confidential, display_order)
VALUES 
    ('Workplace & Facilities', 'WORKPLACE_FACILITIES', 'Cleanliness, seating, air conditioning, water, transport, parking', 'Medium', false, 1),
    ('IT & Equipment', 'IT_EQUIPMENT', 'Laptop, phone, network, software access, email', 'Medium', false, 2),
    ('HR & Policy', 'HR_POLICY', 'Leave balance, attendance record, policy not followed, documents', 'Medium', false, 3),
    ('Payroll & Reimbursement', 'PAYROLL_REIMBURSEMENT', 'Salary, OT, deductions, expense claim payment', 'High', false, 4),
    ('Behaviour & Conduct', 'BEHAVIOUR_CONDUCT', 'Rude behaviour, unfair treatment, misuse of position', 'High', true, 5),
    ('Project & Work', 'PROJECT_WORK', 'Work allocation, workload, project resources, process issues', 'Medium', false, 6),
    ('Health & Safety', 'HEALTH_SAFETY', 'Unsafe area, fire equipment, first aid, injury at work', 'Urgent', false, 7),
    ('Other', 'OTHER', 'Anything not covered above', 'Low', false, 8);

-- Permissions for application database role
GRANT SELECT, INSERT, UPDATE ON complaint_types TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON complaint_settings TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON complaint_settings_change_log TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON complaints TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON complaint_actions TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON complaint_remarks TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON complaint_resolutions TO pulse_app;
GRANT SELECT, INSERT, UPDATE ON complaint_history TO pulse_app;

-- migrate:down
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_complaint_resolutions ON complaint_resolutions;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_complaint_remarks ON complaint_remarks;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_complaint_actions ON complaint_actions;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_complaints ON complaints;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_complaint_types ON complaint_types;

DROP TABLE IF EXISTS complaint_history;
DROP TABLE IF EXISTS complaint_resolutions;
DROP TABLE IF EXISTS complaint_remarks;
DROP TABLE IF EXISTS complaint_actions;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS complaint_settings_change_log;
DROP TABLE IF EXISTS complaint_settings;
DROP TABLE IF EXISTS complaint_types;

