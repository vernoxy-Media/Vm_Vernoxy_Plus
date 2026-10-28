-- migrate:up
-- =============================================================================
-- Migration: Leave Management Module Schema
-- Description: Creates tables, constraints, grants, and seed data for the
--              Leave Management module strictly as specified in the BFD.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. leave_types
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_types (
    leave_type_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(50) NOT NULL,
    code varchar(5) NOT NULL,
    is_paid boolean NOT NULL DEFAULT true,
    balance_tracked boolean NOT NULL DEFAULT true,
    half_day_allowed boolean NOT NULL DEFAULT true,
    applies_to varchar(20) NOT NULL DEFAULT 'ALL',
    calendar_color varchar(30) NOT NULL DEFAULT 'blue',
    description varchar(200),
    status varchar(20) NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer REFERENCES employees(emp_id),
    updated_at timestamptz,
    updated_by integer REFERENCES employees(emp_id),
    CONSTRAINT pk_leave_types PRIMARY KEY (leave_type_id),
    CONSTRAINT uq_leave_types_name UNIQUE (name),
    CONSTRAINT uq_leave_types_code UNIQUE (code),
    CONSTRAINT ck_leave_types_code_caps CHECK (code ~ '^[A-Z]{2,5}$'),
    CONSTRAINT ck_leave_types_applies_to CHECK (applies_to IN ('ALL', 'FEMALE_ONLY', 'MALE_ONLY')),
    CONSTRAINT ck_leave_types_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT ck_leave_types_no_limit_unpaid CHECK (balance_tracked = true OR is_paid = false)
);

-- -----------------------------------------------------------------------------
-- 2. leave_policies
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_policies (
    policy_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    pro_rata boolean NOT NULL DEFAULT true,
    status varchar(20) NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer REFERENCES employees(emp_id),
    updated_at timestamptz,
    updated_by integer REFERENCES employees(emp_id),
    CONSTRAINT pk_leave_policies PRIMARY KEY (policy_id),
    CONSTRAINT uq_leave_policies_name UNIQUE (name),
    CONSTRAINT ck_leave_policies_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- -----------------------------------------------------------------------------
-- 3. leave_policy_rules
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_policy_rules (
    rule_id integer GENERATED ALWAYS AS IDENTITY,
    policy_id integer NOT NULL REFERENCES leave_policies(policy_id) ON DELETE CASCADE,
    leave_type_id integer NOT NULL REFERENCES leave_types(leave_type_id),
    days_per_year numeric(4, 1),
    credit_frequency varchar(20) NOT NULL DEFAULT 'YEARLY',
    carry_forward_days numeric(4, 1) NOT NULL DEFAULT 0.0,
    max_at_once numeric(4, 1),
    min_notice_days integer NOT NULL DEFAULT 0,
    backdated_days integer NOT NULL DEFAULT 0,
    attachment_after_days numeric(4, 1),
    allowed_during_probation boolean NOT NULL DEFAULT true,
    comp_off_expiry_days integer NOT NULL DEFAULT 90,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,
    CONSTRAINT pk_leave_policy_rules PRIMARY KEY (rule_id),
    CONSTRAINT uq_leave_policy_rules UNIQUE (policy_id, leave_type_id),
    CONSTRAINT ck_policy_rules_credit_freq CHECK (credit_frequency IN ('YEARLY', 'MONTHLY', 'FROM_APPROVED_OT')),
    CONSTRAINT ck_policy_rules_days_per_year CHECK (days_per_year IS NULL OR (days_per_year >= 0 AND days_per_year <= 365)),
    CONSTRAINT ck_policy_rules_carry_forward CHECK (carry_forward_days >= 0),
    CONSTRAINT ck_policy_rules_min_notice CHECK (min_notice_days >= 0),
    CONSTRAINT ck_policy_rules_backdated CHECK (backdated_days >= 0)
);

-- -----------------------------------------------------------------------------
-- 4. leave_general_settings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_general_settings (
    setting_id integer GENERATED ALWAYS AS IDENTITY,
    leave_year_start varchar(30) NOT NULL DEFAULT 'JANUARY_TO_DECEMBER',
    count_sandwich_leave boolean NOT NULL DEFAULT false,
    pending_reminder_hours integer NOT NULL DEFAULT 24,
    approve_after_leave_started boolean NOT NULL DEFAULT true,
    year_end_processing varchar(20) NOT NULL DEFAULT 'AUTOMATIC',
    comp_off_hours_per_day numeric(4, 2) NOT NULL DEFAULT 8.00,
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_by integer REFERENCES employees(emp_id),
    CONSTRAINT pk_leave_general_settings PRIMARY KEY (setting_id),
    CONSTRAINT ck_leave_general_settings_year CHECK (leave_year_start IN ('JANUARY_TO_DECEMBER', 'APRIL_TO_MARCH')),
    CONSTRAINT ck_leave_general_settings_processing CHECK (year_end_processing IN ('AUTOMATIC', 'MANUAL'))
);

-- -----------------------------------------------------------------------------
-- 5. leave_balances
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_balances (
    balance_id integer GENERATED ALWAYS AS IDENTITY,
    emp_id integer NOT NULL REFERENCES employees(emp_id),
    leave_type_id integer NOT NULL REFERENCES leave_types(leave_type_id),
    leave_year integer NOT NULL,
    opening_balance numeric(4, 1) NOT NULL DEFAULT 0.0,
    credited_days numeric(4, 1) NOT NULL DEFAULT 0.0,
    carried_forward_days numeric(4, 1) NOT NULL DEFAULT 0.0,
    days_taken numeric(4, 1) NOT NULL DEFAULT 0.0,
    days_booked numeric(4, 1) NOT NULL DEFAULT 0.0,
    lapsed_days numeric(4, 1) NOT NULL DEFAULT 0.0,
    is_frozen boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,
    CONSTRAINT pk_leave_balances PRIMARY KEY (balance_id),
    CONSTRAINT uq_leave_balances_emp_type_year UNIQUE (emp_id, leave_type_id, leave_year),
    CONSTRAINT ck_leave_balances_opening CHECK (opening_balance >= 0),
    CONSTRAINT ck_leave_balances_credited CHECK (credited_days >= 0),
    CONSTRAINT ck_leave_balances_carried CHECK (carried_forward_days >= 0),
    CONSTRAINT ck_leave_balances_taken CHECK (days_taken >= 0),
    CONSTRAINT ck_leave_balances_booked CHECK (days_booked >= 0),
    CONSTRAINT ck_leave_balances_lapsed CHECK (lapsed_days >= 0)
);

-- -----------------------------------------------------------------------------
-- 6. leave_comp_off_grants
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_comp_off_grants (
    grant_id integer GENERATED ALWAYS AS IDENTITY,
    emp_id integer NOT NULL REFERENCES employees(emp_id),
    ot_date date NOT NULL,
    ot_hours numeric(4, 2) NOT NULL,
    days_credited numeric(3, 1) NOT NULL,
    days_used numeric(3, 1) NOT NULL DEFAULT 0.0,
    expiry_date date NOT NULL,
    is_lapsed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_leave_comp_off_grants PRIMARY KEY (grant_id),
    CONSTRAINT ck_comp_off_ot_hours CHECK (ot_hours > 0),
    CONSTRAINT ck_comp_off_days_credited CHECK (days_credited > 0),
    CONSTRAINT ck_comp_off_days_used CHECK (days_used >= 0 AND days_used <= days_credited)
);

-- -----------------------------------------------------------------------------
-- 7. leave_requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
    request_id integer GENERATED ALWAYS AS IDENTITY,
    request_no varchar(30) NOT NULL,
    emp_id integer NOT NULL REFERENCES employees(emp_id),
    leave_type_id integer NOT NULL REFERENCES leave_types(leave_type_id),
    is_paid boolean NOT NULL,
    duration varchar(20) NOT NULL DEFAULT 'FULL_DAY',
    from_date date NOT NULL,
    to_date date NOT NULL,
    leave_days numeric(4, 1) NOT NULL,
    reason varchar(500) NOT NULL,
    attachment_url varchar(500),
    is_short_notice boolean NOT NULL DEFAULT false,
    status varchar(30) NOT NULL DEFAULT 'PENDING',
    applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    applied_by integer NOT NULL REFERENCES employees(emp_id),
    decided_at timestamptz,
    decided_by integer REFERENCES employees(emp_id),
    decision_remarks varchar(500),
    is_self_approved boolean NOT NULL DEFAULT false,
    cancellation_reason varchar(500),
    cancellation_requested_at timestamptz,
    cancellation_decided_by integer REFERENCES employees(emp_id),
    cancellation_decided_at timestamptz,
    cancellation_remarks varchar(500),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz,
    CONSTRAINT pk_leave_requests PRIMARY KEY (request_id),
    CONSTRAINT uq_leave_requests_request_no UNIQUE (request_no),
    CONSTRAINT ck_leave_requests_duration CHECK (duration IN ('FULL_DAY', 'FIRST_HALF', 'SECOND_HALF')),
    CONSTRAINT ck_leave_requests_date_order CHECK (to_date >= from_date),
    CONSTRAINT ck_leave_requests_days CHECK (leave_days > 0),
    CONSTRAINT ck_leave_requests_reason_len CHECK (char_length(reason) >= 10 AND char_length(reason) <= 500),
    CONSTRAINT ck_leave_requests_status CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'CANCELLATION_REQUESTED', 'CANCELLED')
    )
);

-- -----------------------------------------------------------------------------
-- 8. leave_ledger (Append-only balance audit trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_ledger (
    ledger_id integer GENERATED ALWAYS AS IDENTITY,
    emp_id integer NOT NULL REFERENCES employees(emp_id),
    leave_type_id integer NOT NULL REFERENCES leave_types(leave_type_id),
    entry_type varchar(30) NOT NULL,
    days numeric(4, 1) NOT NULL,
    balance_after numeric(4, 1) NOT NULL,
    note varchar(500) NOT NULL,
    reference_request_id integer REFERENCES leave_requests(request_id),
    performed_by integer REFERENCES employees(emp_id),
    performed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_leave_ledger PRIMARY KEY (ledger_id),
    CONSTRAINT ck_leave_ledger_entry_type CHECK (
        entry_type IN (
            'OPENING_BALANCE',
            'MONTHLY_CREDIT',
            'YEARLY_CREDIT',
            'PRO_RATA_CREDIT',
            'CARRIED_FORWARD',
            'LAPSED',
            'COMP_OFF_CREDIT',
            'TAKEN',
            'RETURNED',
            'ADJUSTED'
        )
    ),
    CONSTRAINT ck_leave_ledger_days CHECK (days <> 0)
);

-- -----------------------------------------------------------------------------
-- 9. leave_request_history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_request_history (
    history_id integer GENERATED ALWAYS AS IDENTITY,
    request_id integer NOT NULL REFERENCES leave_requests(request_id) ON DELETE CASCADE,
    event varchar(50) NOT NULL,
    performed_by integer REFERENCES employees(emp_id),
    performed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    details text,
    CONSTRAINT pk_leave_request_history PRIMARY KEY (history_id)
);

-- -----------------------------------------------------------------------------
-- 10. leave_settings_change_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_settings_change_log (
    log_id integer GENERATED ALWAYS AS IDENTITY,
    entity_type varchar(30) NOT NULL,
    entity_id integer NOT NULL,
    field_name varchar(50) NOT NULL,
    old_value text,
    new_value text,
    changed_by integer NOT NULL REFERENCES employees(emp_id),
    changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_leave_settings_change_log PRIMARY KEY (log_id),
    CONSTRAINT ck_leave_settings_change_log_type CHECK (
        entity_type IN ('LEAVE_TYPE', 'LEAVE_POLICY', 'GENERAL_SETTINGS')
    )
);

-- -----------------------------------------------------------------------------
-- 11. Add fields to existing tables: employees & attendance_days
-- -----------------------------------------------------------------------------
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS leave_policy_id integer NULL REFERENCES leave_policies(policy_id),
    ADD COLUMN IF NOT EXISTS probation_end_date date NULL,
    ADD COLUMN IF NOT EXISTS leave_approver_id integer NULL REFERENCES employees(emp_id);

ALTER TABLE attendance_days
    ADD COLUMN IF NOT EXISTS leave_request_id integer NULL REFERENCES leave_requests(request_id),
    ADD COLUMN IF NOT EXISTS leave_half varchar(20) NULL;

-- -----------------------------------------------------------------------------
-- 12. Seed Default Settings & Leave Types (BFD Pages 8, 9, 10)
-- -----------------------------------------------------------------------------

-- Singleton general settings row
INSERT INTO leave_general_settings (
    leave_year_start, count_sandwich_leave, pending_reminder_hours,
    approve_after_leave_started, year_end_processing, comp_off_hours_per_day
)
VALUES (
    'JANUARY_TO_DECEMBER', false, 24, true, 'AUTOMATIC', 8.00
)
ON CONFLICT DO NOTHING;

-- Seed Default Leave Types (Page 8)
INSERT INTO leave_types (name, code, is_paid, balance_tracked, half_day_allowed, applies_to, calendar_color, description, status)
VALUES
    ('Casual Leave', 'CL', true, true, true, 'ALL', 'blue', 'Short personal needs, such as a family function', 'ACTIVE'),
    ('Sick Leave', 'SL', true, true, true, 'ALL', 'emerald', 'Illness or a medical visit', 'ACTIVE'),
    ('Earned Leave', 'EL', true, true, false, 'ALL', 'amber', 'Planned leave, such as a holiday', 'ACTIVE'),
    ('Comp-off', 'CO', true, true, true, 'ALL', 'purple', 'A day off for approved overtime paid as Comp-off', 'ACTIVE'),
    ('Leave Without Pay', 'LWP', false, false, true, 'ALL', 'slate', 'Leave when no paid balance is left, or for long personal needs', 'ACTIVE')
ON CONFLICT (code) DO UPDATE
SET is_paid = EXCLUDED.is_paid,
    balance_tracked = EXCLUDED.balance_tracked,
    half_day_allowed = EXCLUDED.half_day_allowed,
    applies_to = EXCLUDED.applies_to,
    calendar_color = EXCLUDED.calendar_color,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

-- Seed Standard Leave Policy (Page 9)
INSERT INTO leave_policies (name, pro_rata, status)
VALUES ('Standard Leave Policy', true, 'ACTIVE')
ON CONFLICT (name) DO NOTHING;

-- Seed Policy Rules for Standard Leave Policy (Pages 9–10)
DO $$
DECLARE
    v_policy_id integer;
    v_cl_id integer;
    v_sl_id integer;
    v_el_id integer;
    v_co_id integer;
    v_lwp_id integer;
BEGIN
    SELECT policy_id INTO v_policy_id FROM leave_policies WHERE name = 'Standard Leave Policy' LIMIT 1;
    SELECT leave_type_id INTO v_cl_id FROM leave_types WHERE code = 'CL' LIMIT 1;
    SELECT leave_type_id INTO v_sl_id FROM leave_types WHERE code = 'SL' LIMIT 1;
    SELECT leave_type_id INTO v_el_id FROM leave_types WHERE code = 'EL' LIMIT 1;
    SELECT leave_type_id INTO v_co_id FROM leave_types WHERE code = 'CO' LIMIT 1;
    SELECT leave_type_id INTO v_lwp_id FROM leave_types WHERE code = 'LWP' LIMIT 1;

    -- CL: 12 days/yr, monthly credit (1/mo), no carry forward, max at once 3, notice 1 day, probation allowed
    INSERT INTO leave_policy_rules (
        policy_id, leave_type_id, days_per_year, credit_frequency, carry_forward_days,
        max_at_once, min_notice_days, backdated_days, attachment_after_days, allowed_during_probation, comp_off_expiry_days
    ) VALUES (
        v_policy_id, v_cl_id, 12.0, 'MONTHLY', 0.0,
        3.0, 1, 0, NULL, true, 90
    ) ON CONFLICT (policy_id, leave_type_id) DO NOTHING;

    -- SL: 6 days/yr, yearly credit, no carry forward, notice 0, backdated up to 7 days, attachment after 2 days
    INSERT INTO leave_policy_rules (
        policy_id, leave_type_id, days_per_year, credit_frequency, carry_forward_days,
        max_at_once, min_notice_days, backdated_days, attachment_after_days, allowed_during_probation, comp_off_expiry_days
    ) VALUES (
        v_policy_id, v_sl_id, 6.0, 'YEARLY', 0.0,
        NULL, 0, 7, 2.0, true, 90
    ) ON CONFLICT (policy_id, leave_type_id) DO NOTHING;

    -- EL: 15 days/yr, monthly credit (1.25/mo), carry forward up to 30, max at once 10, notice 7 days, NOT allowed during probation
    INSERT INTO leave_policy_rules (
        policy_id, leave_type_id, days_per_year, credit_frequency, carry_forward_days,
        max_at_once, min_notice_days, backdated_days, attachment_after_days, allowed_during_probation, comp_off_expiry_days
    ) VALUES (
        v_policy_id, v_el_id, 15.0, 'MONTHLY', 30.0,
        10.0, 7, 0, NULL, false, 90
    ) ON CONFLICT (policy_id, leave_type_id) DO NOTHING;

    -- CO: from approved OT, max at once 2, notice 1 day, comp-off expiry 90 days
    INSERT INTO leave_policy_rules (
        policy_id, leave_type_id, days_per_year, credit_frequency, carry_forward_days,
        max_at_once, min_notice_days, backdated_days, attachment_after_days, allowed_during_probation, comp_off_expiry_days
    ) VALUES (
        v_policy_id, v_co_id, NULL, 'FROM_APPROVED_OT', 0.0,
        2.0, 1, 0, NULL, true, 90
    ) ON CONFLICT (policy_id, leave_type_id) DO NOTHING;

    -- LWP: No limit, no carry forward, notice 0, backdated up to 7 days
    INSERT INTO leave_policy_rules (
        policy_id, leave_type_id, days_per_year, credit_frequency, carry_forward_days,
        max_at_once, min_notice_days, backdated_days, attachment_after_days, allowed_during_probation, comp_off_expiry_days
    ) VALUES (
        v_policy_id, v_lwp_id, NULL, 'YEARLY', 0.0,
        NULL, 0, 7, NULL, true, 90
    ) ON CONFLICT (policy_id, leave_type_id) DO NOTHING;

    -- Default all existing employees without a leave policy to Standard Leave Policy
    UPDATE employees SET leave_policy_id = v_policy_id WHERE leave_policy_id IS NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 13. Grants
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON
            leave_types,
            leave_policies,
            leave_policy_rules,
            leave_general_settings,
            leave_balances,
            leave_comp_off_grants,
            leave_requests,
            leave_ledger,
            leave_request_history,
            leave_settings_change_log
        TO pulse_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_readonly') THEN
        GRANT SELECT ON
            leave_types,
            leave_policies,
            leave_policy_rules,
            leave_general_settings,
            leave_balances,
            leave_comp_off_grants,
            leave_requests,
            leave_ledger,
            leave_request_history,
            leave_settings_change_log
        TO pulse_readonly;
    END IF;
END $$;

-- migrate:down
ALTER TABLE attendance_days
    DROP COLUMN IF EXISTS leave_half,
    DROP COLUMN IF EXISTS leave_request_id;

ALTER TABLE employees
    DROP COLUMN IF EXISTS leave_approver_id,
    DROP COLUMN IF EXISTS probation_end_date,
    DROP COLUMN IF EXISTS leave_policy_id;

DROP TABLE IF EXISTS leave_settings_change_log;
DROP TABLE IF EXISTS leave_request_history;
DROP TABLE IF EXISTS leave_ledger;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS leave_comp_off_grants;
DROP TABLE IF EXISTS leave_balances;
DROP TABLE IF EXISTS leave_general_settings;
DROP TABLE IF EXISTS leave_policy_rules;
DROP TABLE IF EXISTS leave_policies;
DROP TABLE IF EXISTS leave_types;
