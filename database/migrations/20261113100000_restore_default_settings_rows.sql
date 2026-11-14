-- migrate:up
-- Each of these settings tables holds one row that its screens cannot work without. A data reset, or a database built
-- without the seed, can leave a table empty, which shows up as "Leave General settings are missing". This puts back
-- the same default row the first migration of each module inserted, and only when the table is empty: an existing
-- row is never changed.

INSERT INTO leave_general_settings (
    leave_year_start, count_sandwich_leave, pending_reminder_hours,
    approve_after_leave_started, year_end_processing, comp_off_hours_per_day
)
SELECT 'JANUARY_TO_DECEMBER', false, 24, true, 'AUTOMATIC', 8.00
WHERE NOT EXISTS (SELECT 1 FROM leave_general_settings);

INSERT INTO expense_general_settings (
    claim_window_days, after_claim_window_action, duplicate_check_enabled,
    default_reimbursement_method, approver_reminder_days, currency
)
SELECT 60, 'FLAG_AS_LATE', true, 'DIRECT', 3, 'INR'
WHERE NOT EXISTS (SELECT 1 FROM expense_general_settings);

INSERT INTO complaint_settings (
    target_days_low, target_days_medium, target_days_high, target_days_urgent,
    confirmation_window_days, reminder_before_target_days, review_reminder_hours,
    old_date_warning_days, duplicate_warning
)
SELECT 15, 7, 3, 1, 7, 1, 24, 90, true
WHERE NOT EXISTS (SELECT 1 FROM complaint_settings);

INSERT INTO software_license_settings (
    setting_id, reminder_window_days, reminder_days, remind_accounts,
    weekly_renewal_summary, unused_seat_flag_days, recovery_reminder_days,
    max_trial_days, currency
)
SELECT 1, 30, '{30, 15, 7, 1}', true, true, 90, 3, 90, '₹'
WHERE NOT EXISTS (SELECT 1 FROM software_license_settings)
ON CONFLICT DO NOTHING;

INSERT INTO payroll_settings (default_employee_pf_pct, default_employer_pf_pct)
SELECT 12.00, 12.00
WHERE NOT EXISTS (SELECT 1 FROM payroll_settings);

-- The five standard leave types, only the ones that are missing (an existing type is left as the Admin set it)
INSERT INTO leave_types (name, code, is_paid, balance_tracked, half_day_allowed, applies_to, calendar_color, description, status)
VALUES
    ('Casual Leave', 'CL', true, true, true, 'ALL', 'blue', 'Short personal needs, such as a family function', 'ACTIVE'),
    ('Sick Leave', 'SL', true, true, true, 'ALL', 'emerald', 'Illness or a medical visit', 'ACTIVE'),
    ('Earned Leave', 'EL', true, true, false, 'ALL', 'amber', 'Planned leave, such as a holiday', 'ACTIVE'),
    ('Comp-off', 'CO', true, true, true, 'ALL', 'purple', 'A day off for approved overtime paid as Comp-off', 'ACTIVE'),
    ('Leave Without Pay', 'LWP', false, false, true, 'ALL', 'slate', 'Leave when no paid balance is left, or for long personal needs', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

-- The standard leave policy and its rules, only when the database has no leave policy at all (so a policy the Admin
-- renamed or built is never duplicated). Employees without a policy then get it, as the first migration did.
INSERT INTO leave_policies (name, pro_rata, status)
SELECT 'Standard Leave Policy', true, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM leave_policies);

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

    IF v_policy_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM leave_policy_rules WHERE policy_id = v_policy_id) THEN

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

        UPDATE employees SET leave_policy_id = v_policy_id WHERE leave_policy_id IS NULL;
    END IF;
END $$;

-- migrate:down
-- Nothing to undo: these rows are the defaults every database is meant to have.
SELECT 1;
