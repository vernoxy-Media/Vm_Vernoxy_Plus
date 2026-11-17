-- migrate:up
-- (Renumbered from 20261117200000 so it cannot clash with a teammate's round-hour migration. Safe to run again.)
-- Employee Documents: the standard document checklist comes from this table instead of a list in the
-- code (PREDEFINED_DOCS). The Admin keeps it in Settings -> Employee Documents: the name, whether it
-- is required before an employee can be activated, the order, and whether new employees get it.
--
-- Every employee still has their own rows in employee_documents (created from this checklist), and
-- "Add Document" on an employee's Documents tab still adds a one-off document for that employee only.
--
--   is_system         Pulse generates or handles the document itself (Offer / Joining Letter, NDA, the exit
--                     letters), so the code relies on its document_type: it cannot be removed or switched off.
--   lock_when_active  exit documents, locked until the employee is deactivated.

CREATE TABLE IF NOT EXISTS employee_document_checklist (
    checklist_id               serial PRIMARY KEY,
    document_type              varchar(50)  NOT NULL,
    title                      varchar(150) NOT NULL,
    category                   varchar(50)  NOT NULL,
    is_required_for_activation boolean      NOT NULL DEFAULT false,
    lock_when_active           boolean      NOT NULL DEFAULT false,
    is_system                  boolean      NOT NULL DEFAULT false,
    display_order              integer      NOT NULL DEFAULT 1,
    is_active                  boolean      NOT NULL DEFAULT true,
    created_at                 timestamptz  NOT NULL DEFAULT clock_timestamp(),
    created_by                 integer REFERENCES employees (emp_id) ON UPDATE NO ACTION,
    updated_at                 timestamptz,
    updated_by                 integer REFERENCES employees (emp_id) ON UPDATE NO ACTION,
    CONSTRAINT ux_employee_document_checklist_type UNIQUE (document_type),
    CONSTRAINT ck_employee_document_checklist_category CHECK (category IN ('agreement', 'given_to_employee', 'taken_from_employee'))
);

-- The checklist the code used until now, in the same order. PAN Card is optional (20261117130000).
INSERT INTO employee_document_checklist
    (document_type, title, category, is_required_for_activation, lock_when_active, is_system, display_order)
VALUES
    ('nda_signed',            'NDA signed',                                   'agreement',           true,  false, true,  1),
    ('offer_letter',          'Offer Letter',                                 'given_to_employee',   false, false, true,  2),
    ('joining_letter',        'Joining Letter',                               'given_to_employee',   false, false, true,  3),
    ('experience_letter',     'Experience Letter',                            'given_to_employee',   false, true,  true,  4),
    ('salary_slip',           'Salary Slip',                                  'given_to_employee',   false, true,  true,  5),
    ('relieving_letter',      'Relieving Letter',                             'given_to_employee',   false, true,  true,  6),
    ('marksheet_10th',        '10th Standard Marksheet',                      'taken_from_employee', true,  false, false, 7),
    ('marksheet_12th',        '12th Standard Marksheet (or Diploma)',         'taken_from_employee', true,  false, false, 8),
    ('marksheet_ug',          'Graduation Degree / Marksheet',                'taken_from_employee', false, false, false, 9),
    ('marksheet_pg',          'Post-Graduation Marksheet',                    'taken_from_employee', false, false, false, 10),
    ('pan_card',              'PAN Card',                                     'taken_from_employee', false, false, false, 11),
    ('aadhaar_card',          'Aadhaar Card',                                 'taken_from_employee', true,  false, false, 12),
    ('passport_photos',       'Passport Size Photo',                          'taken_from_employee', true,  false, false, 13),
    ('bank_details',          'Bank Details (Passbook or cancelled cheque)',  'taken_from_employee', true,  false, false, 14),
    ('experience_letter_old', 'Previous Experience / Relieving Letter',       'taken_from_employee', false, false, false, 15),
    ('salary_slip_old',       'Last 3 Salary Slips',                          'taken_from_employee', false, false, false, 16)
ON CONFLICT (document_type) DO NOTHING;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON employee_document_checklist TO pulse_app;
        GRANT USAGE, SELECT ON SEQUENCE employee_document_checklist_checklist_id_seq TO pulse_app;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_readonly') THEN
        GRANT SELECT ON employee_document_checklist TO pulse_readonly;
    END IF;
END $$;

-- migrate:down
DROP TABLE IF EXISTS employee_document_checklist;
