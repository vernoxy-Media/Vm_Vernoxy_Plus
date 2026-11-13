-- migrate:up
-- The Probation Period list in Settings, and the Probation Period suggestions on the employee forms, come from
-- master data. These are the values the forms used to carry in code. Existing rows are never changed.
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
SELECT v.lookup_type, v.code, v.label, v.sort_order
FROM (VALUES
    ('probation_period', 'none', 'None', 10),
    ('probation_period', '30_days', '30 Days', 20),
    ('probation_period', '60_days', '60 Days', 30),
    ('probation_period', '90_days', '90 Days (3 Months)', 40),
    ('probation_period', '6_months', '6 Months', 50),
    ('probation_period', '1_year', '1 Year', 60)
) AS v(lookup_type, code, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM master_lookup WHERE lookup_type = 'probation_period' AND deleted_at IS NULL)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL DO NOTHING;

-- migrate:down
DELETE FROM master_lookup
WHERE lookup_type = 'probation_period' AND created_by IS NULL AND updated_at IS NULL
  AND code IN ('none', '30_days', '60_days', '90_days', '6_months', '1_year');
