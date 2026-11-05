-- migrate:up
-- =============================================================================
-- Migration: Leave Management Completion (BFD 1.0)
-- Description:
--   1. leave_request_days  : day-wise breakdown of every request (Leave Days,
--                            half, Weekly Off / Holiday excluded). Attendance,
--                            Payroll and Reports read approved leave from here.
--   2. leave_requests      : leave year, admin-added flag, withdraw details,
--                            Short notice, lookup indexes.
--   3. leave_ledger        : leave year, expiry for Comp-off, append-only trigger.
--   4. leave_comp_off_grants: link to the payroll OT entry it came from.
--   5. leave_credit_runs   : idempotency keys for monthly / yearly / year-end jobs.
--   6. leave_balances      : wider numeric range for long running balances.
--   7. master_lookup       : every Leave dropdown (colours, applies to, credit,
--                            duration, status, leave year, year-end processing).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. leave_requests additions
-- -----------------------------------------------------------------------------
ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS leave_year integer,
    ADD COLUMN IF NOT EXISTS added_by_admin boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
    ADD COLUMN IF NOT EXISTS withdraw_reason varchar(500),
    ADD COLUMN IF NOT EXISTS is_system_action boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS comp_off_allocation jsonb;

UPDATE leave_requests
SET leave_year = EXTRACT(YEAR FROM from_date)::int
WHERE leave_year IS NULL;

CREATE INDEX IF NOT EXISTS ix_leave_requests_emp_dates
    ON leave_requests (emp_id, from_date, to_date);
CREATE INDEX IF NOT EXISTS ix_leave_requests_status_from
    ON leave_requests (status, from_date);

-- -----------------------------------------------------------------------------
-- 2. leave_request_days
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_request_days (
    request_day_id integer GENERATED ALWAYS AS IDENTITY,
    request_id integer NOT NULL REFERENCES leave_requests(request_id) ON DELETE CASCADE,
    emp_id integer NOT NULL REFERENCES employees(emp_id),
    leave_date date NOT NULL,
    day_part varchar(20) NOT NULL DEFAULT 'FULL_DAY',
    day_fraction numeric(2, 1) NOT NULL DEFAULT 1.0,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_leave_request_days PRIMARY KEY (request_day_id),
    CONSTRAINT uq_leave_request_days UNIQUE (request_id, leave_date),
    CONSTRAINT ck_leave_request_days_part CHECK (day_part IN ('FULL_DAY', 'FIRST_HALF', 'SECOND_HALF')),
    CONSTRAINT ck_leave_request_days_fraction CHECK (day_fraction IN (0.5, 1.0))
);

CREATE INDEX IF NOT EXISTS ix_leave_request_days_emp_date
    ON leave_request_days (emp_id, leave_date);
CREATE INDEX IF NOT EXISTS ix_leave_request_days_date
    ON leave_request_days (leave_date);

-- Back-fill day rows for requests that already exist (working days only = all
-- dates in range, best effort; the scheduler recalculates open months).
INSERT INTO leave_request_days (request_id, emp_id, leave_date, day_part, day_fraction)
SELECT r.request_id, r.emp_id, d::date,
       r.duration,
       CASE WHEN r.duration = 'FULL_DAY' THEN 1.0 ELSE 0.5 END
FROM leave_requests r
CROSS JOIN LATERAL generate_series(r.from_date, r.to_date, interval '1 day') AS d
WHERE EXTRACT(DOW FROM d) <> 0
ON CONFLICT (request_id, leave_date) DO NOTHING;

-- Remove the placeholder attendance rows that the earlier implementation wrote
-- for approved leave (fake 09:00 check-in). Attendance now reads leave from
-- leave_request_days, so real check-ins are never mixed with leave.
UPDATE attendance_days
SET deleted_at = clock_timestamp()
WHERE day_status = 'leave'
  AND leave_request_id IS NOT NULL
  AND check_out_at IS NULL
  AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 3. leave_balances: allow larger values (opening + credits over years)
-- -----------------------------------------------------------------------------
ALTER TABLE leave_balances
    ALTER COLUMN opening_balance TYPE numeric(7, 2),
    ALTER COLUMN credited_days TYPE numeric(7, 2),
    ALTER COLUMN carried_forward_days TYPE numeric(7, 2),
    ALTER COLUMN days_taken TYPE numeric(7, 2),
    ALTER COLUMN days_booked TYPE numeric(7, 2),
    ALTER COLUMN lapsed_days TYPE numeric(7, 2);

-- Admin "Debit" adjustments are recorded separately so credits stay >= 0.
-- Year end moves unused days out of the old year: carried_out_days (moved to
-- the next year) and lapsed_days (lost). Available Balance =
--   opening + credited + carried_forward + adjusted
--   - taken - booked - lapsed - carried_out
ALTER TABLE leave_balances
    ADD COLUMN IF NOT EXISTS adjusted_days numeric(7, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS carried_out_days numeric(7, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS opening_set_at timestamptz;

-- -----------------------------------------------------------------------------
-- 4. leave_ledger additions + append-only protection
-- -----------------------------------------------------------------------------
ALTER TABLE leave_ledger
    ALTER COLUMN days TYPE numeric(7, 2),
    ALTER COLUMN balance_after TYPE numeric(7, 2),
    ADD COLUMN IF NOT EXISTS leave_year integer,
    ADD COLUMN IF NOT EXISTS expiry_date date,
    ADD COLUMN IF NOT EXISTS credit_key varchar(80);

UPDATE leave_ledger SET leave_year = EXTRACT(YEAR FROM performed_at)::int WHERE leave_year IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_leave_ledger_credit_key
    ON leave_ledger (credit_key) WHERE credit_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_leave_ledger_emp_type
    ON leave_ledger (emp_id, leave_type_id, performed_at DESC);

CREATE OR REPLACE FUNCTION fn_leave_ledger_append_only()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'leave_ledger is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leave_ledger_append_only ON leave_ledger;
CREATE TRIGGER trg_leave_ledger_append_only
    BEFORE UPDATE OR DELETE ON leave_ledger
    FOR EACH ROW EXECUTE FUNCTION fn_leave_ledger_append_only();

-- -----------------------------------------------------------------------------
-- 5. leave_comp_off_grants: link to source OT entry (no double credit)
-- -----------------------------------------------------------------------------
ALTER TABLE leave_comp_off_grants
    ALTER COLUMN days_credited TYPE numeric(4, 1),
    ALTER COLUMN days_used TYPE numeric(4, 1),
    ADD COLUMN IF NOT EXISTS source_ot_entry_id integer,
    ADD COLUMN IF NOT EXISTS leave_year integer,
    ADD COLUMN IF NOT EXISTS lapsed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS ux_leave_comp_off_grants_ot
    ON leave_comp_off_grants (source_ot_entry_id) WHERE source_ot_entry_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. leave_credit_runs: idempotency of scheduled credits
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_credit_runs (
    run_key varchar(80) NOT NULL,
    run_type varchar(30) NOT NULL,
    started_by integer REFERENCES employees(emp_id),
    run_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    details jsonb,
    CONSTRAINT pk_leave_credit_runs PRIMARY KEY (run_key),
    CONSTRAINT ck_leave_credit_runs_type CHECK (
        run_type IN ('MONTHLY_CREDIT', 'YEARLY_CREDIT', 'YEAR_END', 'REMINDER', 'COMP_OFF_EXPIRY', 'SYSTEM')
    )
);

-- -----------------------------------------------------------------------------
-- 6b. employees.leave_policy_assigned_at
--     Set when the Admin moves an employee to another Leave Policy. The credit
--     engine applies the new policy from the next credit date only (BFD 3.3).
-- -----------------------------------------------------------------------------
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS leave_policy_assigned_at date;

CREATE OR REPLACE FUNCTION fn_employees_leave_policy_assigned()
RETURNS trigger AS $$
BEGIN
    IF OLD.leave_policy_id IS NOT NULL
       AND NEW.leave_policy_id IS DISTINCT FROM OLD.leave_policy_id THEN
        NEW.leave_policy_assigned_at := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_leave_policy_assigned ON employees;
CREATE TRIGGER trg_employees_leave_policy_assigned
    BEFORE UPDATE OF leave_policy_id ON employees
    FOR EACH ROW EXECUTE FUNCTION fn_employees_leave_policy_assigned();

-- -----------------------------------------------------------------------------
-- 7. Master lookups for every Leave dropdown
-- -----------------------------------------------------------------------------
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
SELECT v.lookup_type, v.code, v.label, v.sort_order
FROM (VALUES
    ('leave_calendar_color', 'blue', 'Blue', 10),
    ('leave_calendar_color', 'emerald', 'Green', 20),
    ('leave_calendar_color', 'amber', 'Amber', 30),
    ('leave_calendar_color', 'purple', 'Purple', 40),
    ('leave_calendar_color', 'rose', 'Rose', 50),
    ('leave_calendar_color', 'indigo', 'Indigo', 60),
    ('leave_calendar_color', 'teal', 'Teal', 70),
    ('leave_calendar_color', 'slate', 'Grey', 80),

    ('leave_applies_to', 'all', 'All employees', 10),
    ('leave_applies_to', 'female_only', 'Only Female employees', 20),
    ('leave_applies_to', 'male_only', 'Only Male employees', 30),

    ('leave_credit_frequency', 'yearly', 'Yearly (1st day of leave year)', 10),
    ('leave_credit_frequency', 'monthly', 'Monthly (on the 1st)', 20),
    ('leave_credit_frequency', 'from_approved_ot', 'From approved OT', 30),

    ('leave_duration', 'full_day', 'Full Day', 10),
    ('leave_duration', 'first_half', 'Half Day: First Half', 20),
    ('leave_duration', 'second_half', 'Half Day: Second Half', 30),

    ('leave_request_status', 'pending', 'Pending', 10),
    ('leave_request_status', 'approved', 'Approved', 20),
    ('leave_request_status', 'rejected', 'Rejected', 30),
    ('leave_request_status', 'withdrawn', 'Withdrawn', 40),
    ('leave_request_status', 'cancellation_requested', 'Cancellation Requested', 50),
    ('leave_request_status', 'cancelled', 'Cancelled', 60),

    ('leave_year_start', 'january_to_december', 'January to December', 10),
    ('leave_year_start', 'april_to_march', 'April to March', 20),

    ('leave_year_end_processing', 'automatic', 'Automatic on the first day of the new leave year', 10),
    ('leave_year_end_processing', 'manual', 'Started by the Admin', 20),

    ('leave_adjust_direction', 'credit', 'Credit', 10),
    ('leave_adjust_direction', 'debit', 'Debit', 20)
) AS v(lookup_type, code, label, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM master_lookup m
    WHERE m.lookup_type = v.lookup_type AND m.code = v.code AND m.deleted_at IS NULL
);

-- -----------------------------------------------------------------------------
-- 8. Grants
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON leave_request_days, leave_credit_runs TO pulse_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_readonly') THEN
        GRANT SELECT ON leave_request_days, leave_credit_runs TO pulse_readonly;
    END IF;
END $$;

-- migrate:down
DELETE FROM master_lookup WHERE lookup_type IN (
    'leave_calendar_color', 'leave_applies_to', 'leave_credit_frequency', 'leave_duration',
    'leave_request_status', 'leave_year_start', 'leave_year_end_processing', 'leave_adjust_direction'
);

DROP TRIGGER IF EXISTS trg_employees_leave_policy_assigned ON employees;
DROP FUNCTION IF EXISTS fn_employees_leave_policy_assigned();
ALTER TABLE employees DROP COLUMN IF EXISTS leave_policy_assigned_at;

DROP TABLE IF EXISTS leave_credit_runs;

DROP INDEX IF EXISTS ux_leave_comp_off_grants_ot;
ALTER TABLE leave_comp_off_grants
    DROP COLUMN IF EXISTS lapsed_at,
    DROP COLUMN IF EXISTS leave_year,
    DROP COLUMN IF EXISTS source_ot_entry_id;

DROP TRIGGER IF EXISTS trg_leave_ledger_append_only ON leave_ledger;
DROP FUNCTION IF EXISTS fn_leave_ledger_append_only();
DROP INDEX IF EXISTS ix_leave_ledger_emp_type;
DROP INDEX IF EXISTS ux_leave_ledger_credit_key;
ALTER TABLE leave_ledger
    DROP COLUMN IF EXISTS credit_key,
    DROP COLUMN IF EXISTS expiry_date,
    DROP COLUMN IF EXISTS leave_year;

ALTER TABLE leave_balances
    DROP COLUMN IF EXISTS opening_set_at,
    DROP COLUMN IF EXISTS carried_out_days,
    DROP COLUMN IF EXISTS adjusted_days;

DROP TABLE IF EXISTS leave_request_days;

DROP INDEX IF EXISTS ix_leave_requests_status_from;
DROP INDEX IF EXISTS ix_leave_requests_emp_dates;
ALTER TABLE leave_requests
    DROP COLUMN IF EXISTS comp_off_allocation,
    DROP COLUMN IF EXISTS is_system_action,
    DROP COLUMN IF EXISTS withdraw_reason,
    DROP COLUMN IF EXISTS withdrawn_at,
    DROP COLUMN IF EXISTS added_by_admin,
    DROP COLUMN IF EXISTS leave_year;
