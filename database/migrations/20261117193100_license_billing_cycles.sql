-- migrate:up
-- (Renumbered from 20261117180000, then 20261117190000: qa used both numbers. Safe to run again.)
-- Software License: Billing Cycles become a list the Admin manages (Settings -> License Settings),
-- instead of five names fixed in the code. Each cycle says how long one term is, because the
-- "term and cycle" check and the yearly cost are worked out from that length:
--
--   kind FIXED     one term lasts `months` (1 = Monthly, 3 = Quarterly, 8, 12 = Yearly ...)
--   kind TERM      the length comes from the term's own start and expiry dates, in whole years
--                  of 2 or more (Multi-year)
--   kind ONE_TIME  no renewal; not part of the yearly cost
--
-- software_license_terms.billing_cycle keeps holding the cycle's name, now tied to this list by a
-- foreign key: an unknown name cannot be saved, and renaming a cycle renames it on every term.

CREATE TABLE IF NOT EXISTS software_license_billing_cycles (
    cycle_id      serial PRIMARY KEY,
    name          varchar(30)  NOT NULL,
    kind          varchar(10)  NOT NULL,
    months        smallint,
    display_order integer      NOT NULL DEFAULT 1,
    is_active     boolean      NOT NULL DEFAULT true,
    created_at    timestamptz  NOT NULL DEFAULT clock_timestamp(),
    updated_at    timestamptz,
    CONSTRAINT ux_software_license_billing_cycles_name UNIQUE (name),
    CONSTRAINT ck_software_license_billing_cycles_kind CHECK (kind IN ('FIXED', 'TERM', 'ONE_TIME')),
    CONSTRAINT ck_software_license_billing_cycles_months CHECK (
        (kind = 'FIXED' AND months BETWEEN 1 AND 120) OR (kind <> 'FIXED' AND months IS NULL)
    )
);

-- "Yearly" and "yearly" may not both exist.
CREATE UNIQUE INDEX IF NOT EXISTS ux_software_license_billing_cycles_name_ci
    ON software_license_billing_cycles (lower(name));

INSERT INTO software_license_billing_cycles (name, kind, months, display_order) VALUES
    ('Monthly',    'FIXED',    1,    1),
    ('Quarterly',  'FIXED',    3,    2),
    ('Yearly',     'FIXED',    12,   3),
    ('Multi-year', 'TERM',     NULL, 4),
    ('One-time',   'ONE_TIME', NULL, 5)
ON CONFLICT (name) DO NOTHING;

-- Older spellings the code used to translate on the fly.
UPDATE software_license_terms SET billing_cycle = 'Yearly'     WHERE billing_cycle = 'Annual';
UPDATE software_license_terms SET billing_cycle = 'Multi-year' WHERE billing_cycle = 'Biennial';
UPDATE software_license_terms SET billing_cycle = 'One-time'   WHERE billing_cycle IN ('Custom', 'None');
UPDATE software_license_terms SET billing_cycle = NULL         WHERE billing_cycle IS NOT NULL AND btrim(billing_cycle) = '';

-- Any other name already on a term is kept, as an inactive cycle measured by its dates, so the
-- foreign key can be added without losing data. The Admin can fix its kind later.
INSERT INTO software_license_billing_cycles (name, kind, months, display_order, is_active)
SELECT DISTINCT t.billing_cycle, 'TERM', NULL::smallint, 99, false
FROM software_license_terms t
WHERE t.billing_cycle IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM software_license_billing_cycles c WHERE c.name = t.billing_cycle)
ON CONFLICT (name) DO NOTHING;

DO $$ BEGIN
    ALTER TABLE software_license_terms
        ADD CONSTRAINT fk_software_license_terms_billing_cycle
        FOREIGN KEY (billing_cycle) REFERENCES software_license_billing_cycles (name)
        ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON software_license_billing_cycles TO pulse_app;
        GRANT USAGE, SELECT ON SEQUENCE software_license_billing_cycles_cycle_id_seq TO pulse_app;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_readonly') THEN
        GRANT SELECT ON software_license_billing_cycles TO pulse_readonly;
    END IF;
END $$;

-- migrate:down
ALTER TABLE software_license_terms DROP CONSTRAINT IF EXISTS fk_software_license_terms_billing_cycle;
DROP TABLE IF EXISTS software_license_billing_cycles;
