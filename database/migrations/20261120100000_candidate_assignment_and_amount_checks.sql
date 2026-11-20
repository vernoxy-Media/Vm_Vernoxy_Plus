-- migrate:up
-- The Admin can hand a candidate to any active employee, who then moves that candidate through the pipeline.
ALTER TABLE candidates
    ADD COLUMN IF NOT EXISTS assigned_to_emp_id integer;

ALTER TABLE candidates
    ADD CONSTRAINT fk_candidates_assigned_to_emp
    FOREIGN KEY (assigned_to_emp_id) REFERENCES employees(emp_id) ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS ix_candidates_assigned_to ON candidates (assigned_to_emp_id) WHERE assigned_to_emp_id IS NOT NULL;

-- Salaries and experience can never be negative, whichever screen or import writes them.
-- NOT VALID: every new or changed row is checked, but rows saved before this rule (QA has test data such as a
-- negative CTC) do not block the migration. Such a row must be corrected the next time it is edited.
ALTER TABLE candidates
    ADD CONSTRAINT ck_candidates_current_ctc_not_negative CHECK (current_ctc IS NULL OR current_ctc >= 0) NOT VALID,
    ADD CONSTRAINT ck_candidates_expected_ctc_not_negative CHECK (expected_ctc IS NULL OR expected_ctc >= 0) NOT VALID,
    ADD CONSTRAINT ck_candidates_offered_ctc_not_negative CHECK (offered_ctc IS NULL OR offered_ctc >= 0) NOT VALID,
    ADD CONSTRAINT ck_candidates_experience_range CHECK (
        (exp_years IS NULL OR exp_years BETWEEN 0 AND 50) AND (exp_months IS NULL OR exp_months BETWEEN 0 AND 11)
    ) NOT VALID;

-- migrate:down
ALTER TABLE candidates
    DROP CONSTRAINT IF EXISTS ck_candidates_experience_range,
    DROP CONSTRAINT IF EXISTS ck_candidates_offered_ctc_not_negative,
    DROP CONSTRAINT IF EXISTS ck_candidates_expected_ctc_not_negative,
    DROP CONSTRAINT IF EXISTS ck_candidates_current_ctc_not_negative;
DROP INDEX IF EXISTS ix_candidates_assigned_to;
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS fk_candidates_assigned_to_emp;
ALTER TABLE candidates DROP COLUMN IF EXISTS assigned_to_emp_id;
