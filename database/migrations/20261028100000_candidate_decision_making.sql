-- migrate:up
-- =============================================================================
-- Migration: Candidate Decision Making & Selection
-- Description: Adds columns to candidates table for tracking final hiring
--              decision details (Selected, On Hold, Rejected).
-- =============================================================================

ALTER TABLE candidates
    ADD COLUMN IF NOT EXISTS final_role_id INT REFERENCES roles(role_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS final_dep_id INT REFERENCES departments(dep_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS offered_ctc NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS expected_joining_date DATE,
    ADD COLUMN IF NOT EXISTS reporting_manager_id INT REFERENCES employees(emp_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS employment_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS decision_notes TEXT,
    ADD COLUMN IF NOT EXISTS on_hold_review_date DATE,
    ADD COLUMN IF NOT EXISTS on_hold_notes TEXT,
    ADD COLUMN IF NOT EXISTS send_regret_email BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS decision_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS decision_by INT REFERENCES employees(emp_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_candidates_final_role ON candidates(final_role_id);
CREATE INDEX IF NOT EXISTS ix_candidates_final_dep ON candidates(final_dep_id);
CREATE INDEX IF NOT EXISTS ix_candidates_decision_date ON candidates(decision_date);

-- migrate:down
ALTER TABLE candidates
    DROP COLUMN IF EXISTS final_role_id,
    DROP COLUMN IF EXISTS final_dep_id,
    DROP COLUMN IF EXISTS offered_ctc,
    DROP COLUMN IF EXISTS expected_joining_date,
    DROP COLUMN IF EXISTS reporting_manager_id,
    DROP COLUMN IF EXISTS employment_type,
    DROP COLUMN IF EXISTS decision_notes,
    DROP COLUMN IF EXISTS on_hold_review_date,
    DROP COLUMN IF EXISTS on_hold_notes,
    DROP COLUMN IF EXISTS send_regret_email,
    DROP COLUMN IF EXISTS decision_date,
    DROP COLUMN IF EXISTS decision_by;
