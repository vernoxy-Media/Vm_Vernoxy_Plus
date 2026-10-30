-- migrate:up
-- =============================================================================
-- Migration: Unified Activity Logs & Software License Management Schema
-- Description: Creates unified activity_logs table and all software license
--              management tables, lookups, settings, triggers, indexes, and seed
--              data strictly normalized and adhering to BFD v1.0.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. UNIFIED ACTIVITY LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id bigint GENERATED ALWAYS AS IDENTITY,
    entity_type varchar(50) NOT NULL,
    entity_id integer NOT NULL,
    event varchar(50) NOT NULL,
    summary text NOT NULL,
    details jsonb,
    performed_by integer REFERENCES employees(emp_id),
    performed_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT pk_activity_logs PRIMARY KEY (log_id)
);

CREATE INDEX IF NOT EXISTS ix_activity_logs_entity 
    ON activity_logs (entity_type, entity_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS ix_activity_logs_performer 
    ON activity_logs (performed_by, performed_at DESC);

CREATE INDEX IF NOT EXISTS ix_activity_logs_event_date 
    ON activity_logs (entity_type, event, performed_at DESC);


-- -----------------------------------------------------------------------------
-- 2. LOOKUP: software_license_categories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS software_license_categories (
    category_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    display_order integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,

    CONSTRAINT pk_software_license_categories PRIMARY KEY (category_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_software_license_categories_name 
    ON software_license_categories (lower(name));


-- -----------------------------------------------------------------------------
-- 3. LOOKUP: software_license_vendors
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS software_license_vendors (
    vendor_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,

    CONSTRAINT pk_software_license_vendors PRIMARY KEY (vendor_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_software_license_vendors_name 
    ON software_license_vendors (lower(name));


-- -----------------------------------------------------------------------------
-- 4. LOOKUP: software_license_revoke_reasons
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS software_license_revoke_reasons (
    reason_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    display_order integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT pk_software_license_revoke_reasons PRIMARY KEY (reason_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_software_license_revoke_reasons_name 
    ON software_license_revoke_reasons (lower(name));


-- -----------------------------------------------------------------------------
-- 5. LOOKUP: software_license_discontinue_reasons
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS software_license_discontinue_reasons (
    reason_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    display_order integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT pk_software_license_discontinue_reasons PRIMARY KEY (reason_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_software_license_discontinue_reasons_name 
    ON software_license_discontinue_reasons (lower(name));


-- -----------------------------------------------------------------------------
-- 6. M2M: software_license_managers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS software_license_managers (
    manager_id integer GENERATED ALWAYS AS IDENTITY,
    emp_id integer NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer REFERENCES employees(emp_id),

    CONSTRAINT pk_software_license_managers PRIMARY KEY (manager_id),
    CONSTRAINT ux_software_license_managers_emp UNIQUE (emp_id)
);


-- -----------------------------------------------------------------------------
-- 7. SETTINGS: software_license_settings (Singleton)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS software_license_settings (
    setting_id integer GENERATED BY DEFAULT AS IDENTITY,
    reminder_window_days integer NOT NULL DEFAULT 30,
    reminder_days integer[] NOT NULL DEFAULT '{30, 15, 7, 1}',
    remind_accounts boolean NOT NULL DEFAULT true,
    weekly_renewal_summary boolean NOT NULL DEFAULT true,
    unused_seat_flag_days integer NOT NULL DEFAULT 90,
    recovery_reminder_days integer NOT NULL DEFAULT 3,
    max_trial_days integer NOT NULL DEFAULT 90,
    currency varchar(10) NOT NULL DEFAULT '₹',
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,
    updated_by integer REFERENCES employees(emp_id),

    CONSTRAINT pk_software_license_settings PRIMARY KEY (setting_id),
    CONSTRAINT ck_software_license_settings_window CHECK (reminder_window_days BETWEEN 7 AND 180),
    CONSTRAINT ck_software_license_settings_trial CHECK (max_trial_days BETWEEN 7 AND 90)
);

-- Settings Change Log
CREATE TABLE IF NOT EXISTS software_license_settings_change_log (
    log_id integer GENERATED ALWAYS AS IDENTITY,
    setting_field varchar(100) NOT NULL,
    old_value text,
    new_value text NOT NULL,
    changed_by integer NOT NULL REFERENCES employees(emp_id),
    changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT pk_software_license_settings_change_log PRIMARY KEY (log_id)
);


-- -----------------------------------------------------------------------------
-- 8. CORE: software_licenses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS software_licenses (
    software_id integer GENERATED ALWAYS AS IDENTITY,
    software_code varchar(20) NOT NULL,
    software_name varchar(100) NOT NULL,
    vendor_id integer NOT NULL REFERENCES software_license_vendors(vendor_id),
    category_id integer NOT NULL REFERENCES software_license_categories(category_id),
    license_type varchar(50) NOT NULL,
    total_seats integer,
    software_owner_id integer NOT NULL REFERENCES employees(emp_id),
    bought_from varchar(100),
    license_key text,
    auto_renews boolean NOT NULL DEFAULT false,
    status varchar(30) NOT NULL DEFAULT 'Active',

    -- Discontinue lifecycle fields
    discontinue_date date,
    discontinue_reason_id integer REFERENCES software_license_discontinue_reasons(reason_id),
    discontinue_remarks varchar(500),
    replaced_by_software_id integer REFERENCES software_licenses(software_id),

    -- Audit fields
    created_by integer NOT NULL REFERENCES employees(emp_id),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,
    updated_by integer REFERENCES employees(emp_id),

    CONSTRAINT pk_software_licenses PRIMARY KEY (software_id),
    CONSTRAINT ux_software_licenses_code UNIQUE (software_code),
    CONSTRAINT ck_software_licenses_type CHECK (
        license_type IN (
            'Subscription · Per User',
            'Subscription · Organisation',
            'Perpetual · Per User',
            'Perpetual · Organisation',
            'Free / Open Source',
            'Trial'
        )
    ),
    CONSTRAINT ck_software_licenses_status CHECK (
        status IN ('Active', 'Expiring Soon', 'Expired', 'Discontinued')
    ),
    CONSTRAINT ck_software_licenses_seats CHECK (
        total_seats IS NULL OR (total_seats BETWEEN 1 AND 10000)
    ),
    CONSTRAINT ck_software_licenses_name_len CHECK (
        length(software_name) >= 2
    ),
    CONSTRAINT ck_software_licenses_discontinue_remarks CHECK (
        discontinue_remarks IS NULL OR length(discontinue_remarks) >= 10
    )
);

CREATE INDEX IF NOT EXISTS ix_software_licenses_status ON software_licenses (status);
CREATE INDEX IF NOT EXISTS ix_software_licenses_vendor ON software_licenses (vendor_id);
CREATE INDEX IF NOT EXISTS ix_software_licenses_category ON software_licenses (category_id);
CREATE INDEX IF NOT EXISTS ix_software_licenses_owner ON software_licenses (software_owner_id);


-- -----------------------------------------------------------------------------
-- 9. CORE: software_license_terms
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS software_license_terms (
    term_id integer GENERATED ALWAYS AS IDENTITY,
    software_id integer NOT NULL REFERENCES software_licenses(software_id) ON DELETE RESTRICT,
    term_number integer NOT NULL DEFAULT 1,
    billing_cycle varchar(30),
    cost numeric(12, 2) NOT NULL DEFAULT 0.00,
    total_seats integer,
    purchase_date date NOT NULL,
    start_date date NOT NULL,
    expiry_date date,
    invoice_order_no varchar(100),
    expense_claim_no varchar(50),
    remarks text,
    recorded_by integer NOT NULL REFERENCES employees(emp_id),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT pk_software_license_terms PRIMARY KEY (term_id),
    CONSTRAINT ux_software_license_terms_seq UNIQUE (software_id, term_number),
    CONSTRAINT ck_software_license_terms_cycle CHECK (
        billing_cycle IS NULL OR billing_cycle IN ('Monthly', 'Quarterly', 'Yearly', 'Multi-year', 'One-time')
    ),
    CONSTRAINT ck_software_license_terms_cost CHECK (
        cost >= 0.00 AND cost <= 10000000.00
    ),
    CONSTRAINT ck_software_license_terms_seats CHECK (
        total_seats IS NULL OR (total_seats BETWEEN 1 AND 10000)
    ),
    CONSTRAINT ck_software_license_terms_dates CHECK (
        expiry_date IS NULL OR expiry_date > start_date
    ),
    CONSTRAINT ck_software_license_terms_purchase CHECK (
        purchase_date <= CURRENT_DATE
    )
);

CREATE INDEX IF NOT EXISTS ix_software_license_terms_dates 
    ON software_license_terms (software_id, start_date, expiry_date);


-- -----------------------------------------------------------------------------
-- 10. CORE: software_license_assignments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS software_license_assignments (
    assignment_id integer GENERATED ALWAYS AS IDENTITY,
    software_id integer NOT NULL REFERENCES software_licenses(software_id) ON DELETE RESTRICT,
    emp_id integer NOT NULL REFERENCES employees(emp_id) ON DELETE RESTRICT,
    login_account_id varchar(100),
    assigned_from date NOT NULL,
    assigned_by integer NOT NULL REFERENCES employees(emp_id),
    status varchar(20) NOT NULL DEFAULT 'Active',
    remarks varchar(500),

    -- Recovery flag for deactivated employees
    is_flagged_to_recover boolean NOT NULL DEFAULT false,
    flagged_at timestamptz,

    -- Revoke / Transfer fields
    revoked_on date,
    revoked_by integer REFERENCES employees(emp_id),
    revoke_reason_id integer REFERENCES software_license_revoke_reasons(reason_id),
    revoke_remarks varchar(500),
    transferred_to_emp_id integer REFERENCES employees(emp_id),

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,

    CONSTRAINT pk_software_license_assignments PRIMARY KEY (assignment_id),
    CONSTRAINT ck_software_license_assignments_status CHECK (status IN ('Active', 'Revoked')),
    CONSTRAINT ck_software_license_assignments_assigned_date CHECK (assigned_from <= CURRENT_DATE),
    CONSTRAINT ck_software_license_assignments_revoke_date CHECK (revoked_on IS NULL OR revoked_on >= assigned_from)
);

-- Partial Unique Index: One active seat per employee per software
CREATE UNIQUE INDEX IF NOT EXISTS ux_software_license_assignments_active_emp 
    ON software_license_assignments (software_id, emp_id) 
    WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS ix_software_license_assignments_emp 
    ON software_license_assignments (emp_id, status);

CREATE INDEX IF NOT EXISTS ix_software_license_assignments_recover 
    ON software_license_assignments (is_flagged_to_recover) 
    WHERE is_flagged_to_recover = true;


-- -----------------------------------------------------------------------------
-- 11. SEED DATA
-- -----------------------------------------------------------------------------
-- Default Categories (Section 4, Part 2)
INSERT INTO software_license_categories (name, display_order) VALUES
    ('Productivity & Office', 1),
    ('Design & Creative', 2),
    ('Development Tools', 3),
    ('Communication & Collaboration', 4),
    ('Security & Antivirus', 5),
    ('Accounting & Finance', 6),
    ('Cloud & Hosting', 7),
    ('Operating System', 8),
    ('Project Management', 9),
    ('Other', 10)
ON CONFLICT DO NOTHING;

-- Default Revoke Reasons (Section 6, Part 2)
INSERT INTO software_license_revoke_reasons (name, display_order) VALUES
    ('Employee left', 1),
    ('Role changed', 2),
    ('Not used', 3),
    ('Moved to another user', 4),
    ('Software discontinued', 5),
    ('Other', 6)
ON CONFLICT DO NOTHING;

-- Default Discontinue Reasons (Section 7, Part 3)
INSERT INTO software_license_discontinue_reasons (name, display_order) VALUES
    ('Not needed any more', 1),
    ('Replaced by other software', 2),
    ('Too costly', 3),
    ('Vendor stopped the product', 4),
    ('Added by mistake', 5),
    ('Other', 6)
ON CONFLICT DO NOTHING;

-- Default Settings Singleton (Section 11)
INSERT INTO software_license_settings (
    setting_id, reminder_window_days, reminder_days, remind_accounts, 
    weekly_renewal_summary, unused_seat_flag_days, recovery_reminder_days, 
    max_trial_days, currency
) VALUES (
    1, 30, '{30, 15, 7, 1}', true, true, 90, 3, 90, '₹'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Migration End
-- =============================================================================
