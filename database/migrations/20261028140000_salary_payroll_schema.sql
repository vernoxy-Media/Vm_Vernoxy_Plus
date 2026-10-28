-- migrate:up
-- =============================================================================
-- Salary & Payroll schema
-- Extends employee pay policy; adds payroll snapshot tables.
-- Integer PKs to match existing HRMS (emp_id, lookup_id, ...).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_run_status') THEN
        CREATE TYPE payroll_run_status AS ENUM ('DRAFT', 'LOCKED', 'PAID');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_paid_as') THEN
        CREATE TYPE payroll_paid_as AS ENUM ('FULL', 'HALF', 'UNPAID', 'NOT_APPLICABLE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_adjustment_type') THEN
        CREATE TYPE payroll_adjustment_type AS ENUM ('DAY_ADJUSTMENT', 'ADDITION', 'DEDUCTION');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_employee_flag') THEN
        CREATE TYPE payroll_employee_flag AS ENUM (
            'NONE', 'ERROR', 'WARNING', 'JOINED_IN_MONTH', 'LEFT_IN_MONTH', 'ADJUSTED'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_ot_status') THEN
        CREATE TYPE payroll_ot_status AS ENUM ('PENDING', 'APPROVED', 'REDUCED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_ot_rate_type') THEN
        CREATE TYPE payroll_ot_rate_type AS ENUM ('FIXED', 'MULTIPLIER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_ot_paid_as') THEN
        CREATE TYPE payroll_ot_paid_as AS ENUM ('SALARY', 'COMP_OFF');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_payment_mode') THEN
        CREATE TYPE payroll_payment_mode AS ENUM ('BANK_TRANSFER', 'CHEQUE', 'CASH');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_slip_status') THEN
        CREATE TYPE payroll_slip_status AS ENUM ('GENERATED', 'RELEASED', 'REPLACED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_run_action') THEN
        CREATE TYPE payroll_run_action AS ENUM (
            'CALCULATED', 'RECALCULATED', 'LOCKED', 'UNLOCKED', 'PAID'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_total_rounding') THEN
        CREATE TYPE payroll_total_rounding AS ENUM ('NEAREST_RUPEE', 'NONE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_ot_rounding') THEN
        CREATE TYPE payroll_ot_rounding AS ENUM ('NONE', 'FIFTEEN', 'THIRTY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_missing_punch') THEN
        CREATE TYPE payroll_missing_punch AS ENUM ('UNPAID', 'FULL');
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Lookups: addition / deduction categories and day-adjustment reasons
-- ---------------------------------------------------------------------------
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('addition_category', 'bonus', 'Bonus', 10),
    ('addition_category', 'incentive', 'Incentive', 20),
    ('addition_category', 'referral_bonus', 'Referral Bonus', 30),
    ('addition_category', 'arrears', 'Arrears', 40),
    ('addition_category', 'reimbursement', 'Reimbursement', 50),
    ('addition_category', 'other', 'Other', 60),

    ('deduction_category', 'salary_advance_recovery', 'Salary Advance Recovery', 10),
    ('deduction_category', 'loan_instalment', 'Loan Instalment', 20),
    ('deduction_category', 'penalty', 'Penalty', 30),
    ('deduction_category', 'excess_payment_recovery', 'Excess Payment Recovery', 40),
    ('deduction_category', 'other', 'Other', 50),

    ('day_adjustment_reason', 'attendance_correction_after_lock', 'Attendance correction after month lock', 10),
    ('day_adjustment_reason', 'approved_work_outside_office', 'Approved work outside office', 20),
    ('day_adjustment_reason', 'management_approval', 'Management approval (paid absence)', 30),
    ('day_adjustment_reason', 'penalty', 'Penalty', 40),
    ('day_adjustment_reason', 'other', 'Other', 50)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- ---------------------------------------------------------------------------
-- Employee pay policy (1:1) — Pay & Policies tab
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_pay_policies (
    emp_id integer NOT NULL,
    salary_effective_from date,
    pf_applicable boolean NOT NULL DEFAULT false,
    uan varchar(30),
    employee_pf_pct numeric(5, 2) NOT NULL DEFAULT 12.00,
    employer_pf_pct numeric(5, 2) NOT NULL DEFAULT 12.00,
    ot_eligible boolean NOT NULL DEFAULT false,
    ot_rate_type payroll_ot_rate_type,
    ot_rate numeric(12, 2),
    ot_multiplier numeric(4, 2),
    minimum_ot_per_day numeric(4, 2) NOT NULL DEFAULT 0,
    ot_paid_as payroll_ot_paid_as NOT NULL DEFAULT 'SALARY',
    payment_mode payroll_payment_mode,
    bank_name varchar(150),
    account_number varchar(50),
    ifsc_code varchar(20),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    CONSTRAINT pk_employee_pay_policies PRIMARY KEY (emp_id),
    CONSTRAINT fk_employee_pay_policies_emp FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE,
    CONSTRAINT fk_employee_pay_policies_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT fk_employee_pay_policies_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT ck_employee_pay_policies_pf_pct CHECK (
        employee_pf_pct >= 0 AND employee_pf_pct <= 100
        AND employer_pf_pct >= 0 AND employer_pf_pct <= 100
    ),
    CONSTRAINT ck_employee_pay_policies_ot CHECK (
        ot_eligible = false
        OR (
            ot_rate_type IS NOT NULL
            AND (
                (ot_rate_type = 'FIXED' AND ot_rate IS NOT NULL AND ot_rate >= 0)
                OR (ot_rate_type = 'MULTIPLIER' AND ot_multiplier IS NOT NULL AND ot_multiplier > 0)
            )
        )
    )
);

INSERT INTO employee_pay_policies (emp_id, salary_effective_from, pf_applicable)
SELECT e.emp_id, e.joining_date, COALESCE(e.pf, 0) > 0
FROM employees e
WHERE e.deleted_at IS NULL
ON CONFLICT (emp_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Payroll settings (single configuration row) + change log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_settings (
    settings_id integer GENERATED ALWAYS AS IDENTITY,
    default_employee_pf_pct numeric(5, 2) NOT NULL DEFAULT 12.00,
    default_employer_pf_pct numeric(5, 2) NOT NULL DEFAULT 12.00,
    apply_pf_wage_limit boolean NOT NULL DEFAULT true,
    pf_wage_limit numeric(12, 2) NOT NULL DEFAULT 15000.00,
    missing_punch_default payroll_missing_punch NOT NULL DEFAULT 'UNPAID',
    ot_rounding payroll_ot_rounding NOT NULL DEFAULT 'THIRTY',
    total_salary_rounding payroll_total_rounding NOT NULL DEFAULT 'NEAREST_RUPEE',
    pay_day smallint NOT NULL DEFAULT 7,
    updated_by integer,
    updated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_payroll_settings PRIMARY KEY (settings_id),
    CONSTRAINT fk_payroll_settings_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT ck_payroll_settings_pf_pct CHECK (
        default_employee_pf_pct >= 0 AND default_employee_pf_pct <= 100
        AND default_employer_pf_pct >= 0 AND default_employer_pf_pct <= 100
    ),
    CONSTRAINT ck_payroll_settings_pf_limit CHECK (pf_wage_limit > 0),
    CONSTRAINT ck_payroll_settings_pay_day CHECK (pay_day >= 1 AND pay_day <= 28)
);

INSERT INTO payroll_settings (default_employee_pf_pct, default_employer_pf_pct)
SELECT 12.00, 12.00
WHERE NOT EXISTS (SELECT 1 FROM payroll_settings);

CREATE TABLE IF NOT EXISTS payroll_settings_history (
    history_id integer GENERATED ALWAYS AS IDENTITY,
    settings_id integer NOT NULL,
    field_name varchar(80) NOT NULL,
    old_value text,
    new_value text,
    performed_by integer,
    performed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_payroll_settings_history PRIMARY KEY (history_id),
    CONSTRAINT fk_payroll_settings_history_settings FOREIGN KEY (settings_id) REFERENCES payroll_settings(settings_id) ON DELETE CASCADE,
    CONSTRAINT fk_payroll_settings_history_performed_by FOREIGN KEY (performed_by) REFERENCES employees(emp_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_payroll_settings_history_settings
    ON payroll_settings_history (settings_id, performed_at DESC);

-- ---------------------------------------------------------------------------
-- Payroll runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_runs (
    payroll_run_id integer GENERATED ALWAYS AS IDENTITY,
    payroll_month smallint NOT NULL,
    payroll_year integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status payroll_run_status NOT NULL DEFAULT 'DRAFT',
    calculated_at timestamptz,
    calculated_by integer,
    locked_at timestamptz,
    locked_by integer,
    unlocked_at timestamptz,
    unlocked_by integer,
    unlock_reason varchar(250),
    payment_date date,
    payment_reference varchar(100),
    paid_at timestamptz,
    paid_by integer,
    remarks text,
    attendance_locked boolean NOT NULL DEFAULT false,
    attendance_locked_at timestamptz,
    full_day_hours numeric(4, 2),
    apply_pf_wage_limit boolean,
    pf_wage_limit numeric(12, 2),
    missing_punch_default payroll_missing_punch,
    ot_rounding payroll_ot_rounding,
    total_salary_rounding payroll_total_rounding,
    source_fingerprint varchar(64),
    total_employees integer NOT NULL DEFAULT 0,
    gross_earnings numeric(14, 2) NOT NULL DEFAULT 0,
    employee_pf_total numeric(14, 2) NOT NULL DEFAULT 0,
    employer_pf_total numeric(14, 2) NOT NULL DEFAULT 0,
    total_salary numeric(14, 2) NOT NULL DEFAULT 0,
    row_version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    CONSTRAINT pk_payroll_runs PRIMARY KEY (payroll_run_id),
    CONSTRAINT ux_payroll_runs_month UNIQUE (payroll_year, payroll_month),
    CONSTRAINT ck_payroll_runs_month CHECK (payroll_month BETWEEN 1 AND 12),
    CONSTRAINT ck_payroll_runs_dates CHECK (end_date >= start_date),
    CONSTRAINT fk_payroll_runs_calculated_by FOREIGN KEY (calculated_by) REFERENCES employees(emp_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payroll_runs_locked_by FOREIGN KEY (locked_by) REFERENCES employees(emp_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payroll_runs_unlocked_by FOREIGN KEY (unlocked_by) REFERENCES employees(emp_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payroll_runs_paid_by FOREIGN KEY (paid_by) REFERENCES employees(emp_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payroll_runs_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT fk_payroll_runs_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_payroll_runs_year_month ON payroll_runs (payroll_year, payroll_month);
CREATE INDEX IF NOT EXISTS ix_payroll_runs_status ON payroll_runs (status);

CREATE TABLE IF NOT EXISTS payroll_run_history (
    history_id integer GENERATED ALWAYS AS IDENTITY,
    payroll_run_id integer NOT NULL,
    payroll_employee_id integer,
    action payroll_run_action NOT NULL,
    reason varchar(250),
    performed_by integer,
    performed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_payroll_run_history PRIMARY KEY (history_id),
    CONSTRAINT fk_payroll_run_history_run FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(payroll_run_id) ON DELETE CASCADE,
    CONSTRAINT fk_payroll_run_history_performed_by FOREIGN KEY (performed_by) REFERENCES employees(emp_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_payroll_run_history_run ON payroll_run_history (payroll_run_id, performed_at DESC);

-- ---------------------------------------------------------------------------
-- Payroll employees (frozen snapshot per employee per run)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_employees (
    payroll_employee_id integer GENERATED ALWAYS AS IDENTITY,
    payroll_run_id integer NOT NULL,
    emp_id integer NOT NULL,
    employee_code varchar(20) NOT NULL,
    employee_name varchar(255) NOT NULL,
    department_names varchar(500),
    role_name varchar(100),
    shift_name varchar(100),
    monthly_salary numeric(12, 2) NOT NULL,
    daily_rate numeric(12, 2) NOT NULL DEFAULT 0,
    pf_applicable boolean NOT NULL DEFAULT false,
    uan varchar(30),
    payment_mode payroll_payment_mode,
    bank_name varchar(150),
    account_number varchar(50),
    ifsc_code varchar(20),
    total_working_days numeric(6, 2) NOT NULL DEFAULT 0,
    present_days numeric(6, 2) NOT NULL DEFAULT 0,
    paid_leave_days numeric(6, 2) NOT NULL DEFAULT 0,
    unpaid_leave_days numeric(6, 2) NOT NULL DEFAULT 0,
    absent_days numeric(6, 2) NOT NULL DEFAULT 0,
    missing_punch_days numeric(6, 2) NOT NULL DEFAULT 0,
    not_employed_days numeric(6, 2) NOT NULL DEFAULT 0,
    full_days numeric(6, 2) NOT NULL DEFAULT 0,
    half_days numeric(6, 2) NOT NULL DEFAULT 0,
    paid_days numeric(6, 2) NOT NULL DEFAULT 0,
    lop_days numeric(6, 2) NOT NULL DEFAULT 0,
    basic_salary numeric(12, 2) NOT NULL DEFAULT 0,
    ot_hours numeric(6, 2) NOT NULL DEFAULT 0,
    ot_rate numeric(12, 2) NOT NULL DEFAULT 0,
    ot_amount numeric(12, 2) NOT NULL DEFAULT 0,
    pf_wage numeric(12, 2) NOT NULL DEFAULT 0,
    employee_pf numeric(12, 2) NOT NULL DEFAULT 0,
    employer_pf numeric(12, 2) NOT NULL DEFAULT 0,
    total_additions numeric(12, 2) NOT NULL DEFAULT 0,
    total_deductions numeric(12, 2) NOT NULL DEFAULT 0,
    gross_earnings numeric(12, 2) NOT NULL DEFAULT 0,
    total_salary numeric(12, 2) NOT NULL DEFAULT 0,
    flag payroll_employee_flag NOT NULL DEFAULT 'NONE',
    validation_message text,
    is_paid boolean NOT NULL DEFAULT false,
    calculated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,
    CONSTRAINT pk_payroll_employees PRIMARY KEY (payroll_employee_id),
    CONSTRAINT ux_payroll_employees_run_emp UNIQUE (payroll_run_id, emp_id),
    CONSTRAINT fk_payroll_employees_run FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(payroll_run_id) ON DELETE CASCADE,
    CONSTRAINT fk_payroll_employees_emp FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_payroll_employees_run_emp ON payroll_employees (payroll_run_id, emp_id);
CREATE INDEX IF NOT EXISTS ix_payroll_employees_flag ON payroll_employees (flag);
CREATE INDEX IF NOT EXISTS ix_payroll_employees_emp ON payroll_employees (emp_id);

-- ---------------------------------------------------------------------------
-- Day-wise frozen calculations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_employee_days (
    payroll_employee_day_id integer GENERATED ALWAYS AS IDENTITY,
    payroll_employee_id integer NOT NULL,
    attendance_date date NOT NULL,
    attendance_code varchar(10) NOT NULL,
    day_type varchar(30) NOT NULL,
    is_working_day boolean NOT NULL DEFAULT true,
    holiday_name varchar(150),
    paid_as payroll_paid_as NOT NULL,
    daily_rate numeric(12, 2) NOT NULL DEFAULT 0,
    calculated_amount numeric(12, 2) NOT NULL DEFAULT 0,
    is_adjusted boolean NOT NULL DEFAULT false,
    original_paid_as payroll_paid_as,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_payroll_employee_days PRIMARY KEY (payroll_employee_day_id),
    CONSTRAINT ux_payroll_employee_days_date UNIQUE (payroll_employee_id, attendance_date),
    CONSTRAINT fk_payroll_employee_days_employee FOREIGN KEY (payroll_employee_id)
        REFERENCES payroll_employees(payroll_employee_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_payroll_employee_days_emp_date
    ON payroll_employee_days (payroll_employee_id, attendance_date);

-- ---------------------------------------------------------------------------
-- Adjustments (day / addition / deduction)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_adjustments (
    payroll_adjustment_id integer GENERATED ALWAYS AS IDENTITY,
    payroll_employee_id integer NOT NULL,
    payroll_employee_day_id integer,
    type payroll_adjustment_type NOT NULL,
    category_id integer,
    old_paid_as payroll_paid_as,
    new_paid_as payroll_paid_as,
    amount numeric(12, 2) NOT NULL DEFAULT 0,
    related_date date,
    reference_number varchar(80),
    reason varchar(250) NOT NULL,
    note varchar(250),
    attachment_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,
    CONSTRAINT pk_payroll_adjustments PRIMARY KEY (payroll_adjustment_id),
    CONSTRAINT fk_payroll_adjustments_employee FOREIGN KEY (payroll_employee_id)
        REFERENCES payroll_employees(payroll_employee_id) ON DELETE CASCADE,
    CONSTRAINT fk_payroll_adjustments_day FOREIGN KEY (payroll_employee_day_id)
        REFERENCES payroll_employee_days(payroll_employee_day_id) ON DELETE SET NULL,
    CONSTRAINT fk_payroll_adjustments_category FOREIGN KEY (category_id)
        REFERENCES master_lookup(lookup_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payroll_adjustments_created_by FOREIGN KEY (created_by)
        REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT ck_payroll_adjustments_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS ix_payroll_adjustments_employee_type
    ON payroll_adjustments (payroll_employee_id, type);
CREATE INDEX IF NOT EXISTS ix_payroll_adjustments_day
    ON payroll_adjustments (payroll_employee_day_id)
    WHERE payroll_employee_day_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_adjustments_active_day
    ON payroll_adjustments (payroll_employee_day_id)
    WHERE type = 'DAY_ADJUSTMENT' AND is_active = true AND payroll_employee_day_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- OT entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_ot_entries (
    payroll_ot_entry_id integer GENERATED ALWAYS AS IDENTITY,
    payroll_run_id integer NOT NULL,
    emp_id integer NOT NULL,
    payroll_employee_id integer,
    attendance_date date NOT NULL,
    day_type varchar(30) NOT NULL,
    worked_hours numeric(6, 2) NOT NULL DEFAULT 0,
    proposed_hours numeric(6, 2) NOT NULL DEFAULT 0,
    approved_hours numeric(6, 2) NOT NULL DEFAULT 0,
    hourly_rate numeric(12, 2) NOT NULL DEFAULT 0,
    ot_multiplier numeric(4, 2),
    ot_amount numeric(12, 2) NOT NULL DEFAULT 0,
    ot_paid_as payroll_ot_paid_as NOT NULL DEFAULT 'SALARY',
    comp_off_credited boolean NOT NULL DEFAULT false,
    status payroll_ot_status NOT NULL DEFAULT 'PENDING',
    approver_id integer,
    comment varchar(250),
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,
    CONSTRAINT pk_payroll_ot_entries PRIMARY KEY (payroll_ot_entry_id),
    CONSTRAINT ux_payroll_ot_entries_day UNIQUE (payroll_run_id, emp_id, attendance_date),
    CONSTRAINT fk_payroll_ot_entries_run FOREIGN KEY (payroll_run_id)
        REFERENCES payroll_runs(payroll_run_id) ON DELETE CASCADE,
    CONSTRAINT fk_payroll_ot_entries_emp FOREIGN KEY (emp_id)
        REFERENCES employees(emp_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payroll_ot_entries_payroll_emp FOREIGN KEY (payroll_employee_id)
        REFERENCES payroll_employees(payroll_employee_id) ON DELETE SET NULL,
    CONSTRAINT fk_payroll_ot_entries_approver FOREIGN KEY (approver_id)
        REFERENCES employees(emp_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_payroll_ot_entries_run_status ON payroll_ot_entries (payroll_run_id, status);
CREATE INDEX IF NOT EXISTS ix_payroll_ot_entries_emp_date ON payroll_ot_entries (emp_id, attendance_date);

-- ---------------------------------------------------------------------------
-- Salary slips
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_salary_slips (
    payroll_slip_id integer GENERATED ALWAYS AS IDENTITY,
    payroll_employee_id integer NOT NULL,
    template_id integer,
    slip_number varchar(40) NOT NULL,
    revision_number integer NOT NULL DEFAULT 0,
    status payroll_slip_status NOT NULL DEFAULT 'GENERATED',
    template_version varchar(40),
    pdf_file_url text,
    generated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    released_at timestamptz,
    released_to_email varchar(255),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,
    CONSTRAINT pk_payroll_salary_slips PRIMARY KEY (payroll_slip_id),
    CONSTRAINT ux_payroll_salary_slips_number UNIQUE (slip_number),
    CONSTRAINT fk_payroll_salary_slips_employee FOREIGN KEY (payroll_employee_id)
        REFERENCES payroll_employees(payroll_employee_id) ON DELETE CASCADE,
    CONSTRAINT fk_payroll_salary_slips_template FOREIGN KEY (template_id)
        REFERENCES document_templates(template_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_payroll_salary_slips_employee ON payroll_salary_slips (payroll_employee_id);
CREATE INDEX IF NOT EXISTS ix_payroll_salary_slips_number ON payroll_salary_slips (slip_number);

ALTER TABLE payroll_run_history
    ADD CONSTRAINT fk_payroll_run_history_employee
    FOREIGN KEY (payroll_employee_id) REFERENCES payroll_employees(payroll_employee_id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON
    employee_pay_policies,
    payroll_settings,
    payroll_settings_history,
    payroll_runs,
    payroll_run_history,
    payroll_employees,
    payroll_employee_days,
    payroll_adjustments,
    payroll_ot_entries,
    payroll_salary_slips
TO pulse_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;

GRANT SELECT ON
    employee_pay_policies,
    payroll_settings,
    payroll_settings_history,
    payroll_runs,
    payroll_run_history,
    payroll_employees,
    payroll_employee_days,
    payroll_adjustments,
    payroll_ot_entries,
    payroll_salary_slips
TO pulse_readonly;

-- migrate:down
REVOKE SELECT ON
    employee_pay_policies,
    payroll_settings,
    payroll_settings_history,
    payroll_runs,
    payroll_run_history,
    payroll_employees,
    payroll_employee_days,
    payroll_adjustments,
    payroll_ot_entries,
    payroll_salary_slips
FROM pulse_readonly;

REVOKE SELECT, INSERT, UPDATE ON
    employee_pay_policies,
    payroll_settings,
    payroll_settings_history,
    payroll_runs,
    payroll_run_history,
    payroll_employees,
    payroll_employee_days,
    payroll_adjustments,
    payroll_ot_entries,
    payroll_salary_slips
FROM pulse_app;

DROP TABLE IF EXISTS payroll_salary_slips;
DROP TABLE IF EXISTS payroll_ot_entries;
DROP TABLE IF EXISTS payroll_adjustments;
DROP TABLE IF EXISTS payroll_employee_days;
DROP TABLE IF EXISTS payroll_run_history;
DROP TABLE IF EXISTS payroll_employees;
DROP TABLE IF EXISTS payroll_runs;
DROP TABLE IF EXISTS payroll_settings_history;
DROP TABLE IF EXISTS payroll_settings;
DROP TABLE IF EXISTS employee_pay_policies;

DROP TYPE IF EXISTS payroll_missing_punch;
DROP TYPE IF EXISTS payroll_ot_rounding;
DROP TYPE IF EXISTS payroll_total_rounding;
DROP TYPE IF EXISTS payroll_run_action;
DROP TYPE IF EXISTS payroll_slip_status;
DROP TYPE IF EXISTS payroll_payment_mode;
DROP TYPE IF EXISTS payroll_ot_paid_as;
DROP TYPE IF EXISTS payroll_ot_rate_type;
DROP TYPE IF EXISTS payroll_ot_status;
DROP TYPE IF EXISTS payroll_employee_flag;
DROP TYPE IF EXISTS payroll_adjustment_type;
DROP TYPE IF EXISTS payroll_paid_as;
DROP TYPE IF EXISTS payroll_run_status;
