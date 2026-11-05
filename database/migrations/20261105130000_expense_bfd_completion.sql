-- migrate:up
-- =============================================================================
-- Expense Management BFD 1.0 completion
--  * Save as Draft needs only the Expense Date (BFD 4 Part 1, marker 9): the
--    other fields may be empty on a Draft and are required once submitted.
--  * Claim No. is given at submission (BFD 5) from entity_counters, per
--    submission month; drafts that were never submitted lose their early number.
--  * Rejection reasons and payment modes are master data (no hardcoded lists).
--  * Accounts users are named in Expense Settings (BFD 1 "Who uses it").
-- =============================================================================

ALTER TABLE expense_claims ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE expense_claims ALTER COLUMN expense_type DROP NOT NULL;
ALTER TABLE expense_claims ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE expense_claims ALTER COLUMN description DROP NOT NULL;

ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_amount;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_amount
    CHECK (amount IS NULL OR (amount > 0 AND amount <= 1000000.00));

ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_desc_len;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_desc_len
    CHECK (description IS NULL OR char_length(description) <= 500);

ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_type;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_type
    CHECK (expense_type IS NULL OR expense_type IN ('Office Expense', 'Personal Expense'));

-- Anything past Draft must be complete.
ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_complete;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_complete
    CHECK (
        status = 'DRAFT'
        OR (category_id IS NOT NULL AND expense_type IS NOT NULL AND amount IS NOT NULL
            AND description IS NOT NULL AND char_length(btrim(description)) >= 10 AND claim_no IS NOT NULL)
    );

-- Rejection reason comes from master data now; the remarks rule stays.
ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_rejection;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_rejection
    CHECK (
        status <> 'REJECTED'
        OR (rejection_reason IS NOT NULL AND decision_remarks IS NOT NULL AND char_length(btrim(decision_remarks)) >= 10)
    );

-- Drafts that were never submitted do not keep a number (BFD 3 marker 4: "Drafts show a dash").
UPDATE expense_claims c
SET claim_no = NULL
WHERE c.status = 'DRAFT'
  AND c.submitted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM activity_logs a
      WHERE a.entity_type = 'EXPENSE_CLAIM' AND a.entity_id = c.claim_id AND a.event IN ('Submitted', 'Withdrawn')
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_expense_claims_claim_no
    ON expense_claims (claim_no) WHERE claim_no IS NOT NULL;

-- Counter per submission month, continuing from the numbers already used.
INSERT INTO entity_counters (entity_type, counter_key, last_number)
SELECT 'EXPENSE_CLAIM', substring(claim_no from 5 for 7), max(split_part(claim_no, '/', 4)::int)
FROM expense_claims
WHERE claim_no ~ '^EXP/[0-9]{4}/[0-9]{2}/[0-9]+$'
GROUP BY substring(claim_no from 5 for 7)
ON CONFLICT (entity_type, counter_key)
DO UPDATE SET last_number = GREATEST(entity_counters.last_number, EXCLUDED.last_number);

-- Payment modes come from master data, so any active label is allowed.
ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_payment_mode;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_payment_mode
    CHECK (payment_mode IS NULL OR char_length(btrim(payment_mode)) > 0);

-- "Today" is the company day (Asia/Kolkata), not the UTC day of the database.
ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_date;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_date
    CHECK (expense_date <= (now() AT TIME ZONE 'Asia/Kolkata')::date);

ALTER TABLE expense_general_settings
    ADD COLUMN IF NOT EXISTS accounts_emp_ids integer[] NOT NULL DEFAULT '{}';

INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active) VALUES
  ('expense_rejection_reason', 'receipt_missing',  'Receipt missing or unclear',     10, true),
  ('expense_rejection_reason', 'amount_mismatch',  'Amount does not match receipt',  20, true),
  ('expense_rejection_reason', 'not_business',     'Not a business expense',         30, true),
  ('expense_rejection_reason', 'not_allowed',      'Not allowed under policy',       40, true),
  ('expense_rejection_reason', 'above_limit',      'Above policy limit',             50, true),
  ('expense_rejection_reason', 'duplicate',        'Duplicate claim',                60, true),
  ('expense_rejection_reason', 'too_late',         'Submitted too late',             70, true),
  ('expense_rejection_reason', 'wrong_category',   'Wrong category or type',         80, true),
  ('expense_rejection_reason', 'other',            'Other',                          90, true),

  ('expense_payment_mode', 'bank_transfer', 'Bank Transfer', 10, true),
  ('expense_payment_mode', 'upi',           'UPI',           20, true),
  ('expense_payment_mode', 'cash',          'Cash',          30, true),
  ('expense_payment_mode', 'cheque',        'Cheque',        40, true)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL DO NOTHING;

-- migrate:down
UPDATE master_lookup SET deleted_at = clock_timestamp()
WHERE lookup_type IN ('expense_rejection_reason', 'expense_payment_mode') AND deleted_at IS NULL;

ALTER TABLE expense_general_settings DROP COLUMN IF EXISTS accounts_emp_ids;

ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_date;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_date CHECK (expense_date <= CURRENT_DATE) NOT VALID;
ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_payment_mode;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_payment_mode
    CHECK (payment_mode IS NULL OR payment_mode IN ('Bank Transfer', 'UPI', 'Cash', 'Cheque')) NOT VALID;

ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_complete;
ALTER TABLE expense_claims DROP CONSTRAINT IF EXISTS ck_expense_claims_rejection;
ALTER TABLE expense_claims ADD CONSTRAINT ck_expense_claims_rejection
    CHECK (status <> 'REJECTED' OR (rejection_reason IS NOT NULL AND decision_remarks IS NOT NULL AND char_length(btrim(decision_remarks)) >= 10));
-- Drafts saved with only a date are soft-deleted with placeholder values so the NOT NULLs can come back.
UPDATE expense_claims
SET category_id = COALESCE(category_id, (SELECT min(category_id) FROM expense_categories)),
    expense_type = COALESCE(expense_type, 'Office Expense'),
    amount = COALESCE(amount, 0.01),
    description = COALESCE(description, 'Incomplete draft (rolled back)'),
    deleted_at = COALESCE(deleted_at, clock_timestamp())
WHERE status = 'DRAFT' AND (category_id IS NULL OR expense_type IS NULL OR amount IS NULL OR description IS NULL);
ALTER TABLE expense_claims ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE expense_claims ALTER COLUMN expense_type SET NOT NULL;
ALTER TABLE expense_claims ALTER COLUMN amount SET NOT NULL;
ALTER TABLE expense_claims ALTER COLUMN description SET NOT NULL;
