-- migrate:up
-- 1. A lookup row can now belong to another one. Used for GIDC Area / Phase -> GIDC Name.
ALTER TABLE master_lookup ADD COLUMN IF NOT EXISTS parent_id integer NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_master_lookup_parent') THEN
        ALTER TABLE master_lookup
            ADD CONSTRAINT fk_master_lookup_parent FOREIGN KEY (parent_id) REFERENCES master_lookup (lookup_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_master_lookup_parent ON master_lookup (parent_id) WHERE parent_id IS NOT NULL;

-- 2. Lost reasons: the six values of the Lead Management BFD (section 8). Codes stay the same so nothing that
--    points at a row breaks. Reasons the BFD does not list are hidden, not deleted.
UPDATE master_lookup SET label = 'Budget too low',             sort_order = 10 WHERE lookup_type = 'lost_reason' AND code = 'price_high'          AND deleted_at IS NULL;
UPDATE master_lookup SET label = 'Chose a competitor',         sort_order = 20 WHERE lookup_type = 'lost_reason' AND code = 'chose_competitor'    AND deleted_at IS NULL;
UPDATE master_lookup SET label = 'No requirement now',         sort_order = 30 WHERE lookup_type = 'lost_reason' AND code = 'requirement_changed' AND deleted_at IS NULL;
UPDATE master_lookup SET label = 'Not reachable',              sort_order = 40 WHERE lookup_type = 'lost_reason' AND code = 'no_response'         AND deleted_at IS NULL;
UPDATE master_lookup SET label = 'Not a fit for our services', sort_order = 50 WHERE lookup_type = 'lost_reason' AND code = 'not_a_fit'           AND deleted_at IS NULL;
UPDATE master_lookup SET label = 'Other',                      sort_order = 60 WHERE lookup_type = 'lost_reason' AND code = 'other'               AND deleted_at IS NULL;
UPDATE master_lookup SET is_active = false WHERE lookup_type = 'lost_reason' AND code IN ('no_budget', 'bad_timing', 'duplicate') AND deleted_at IS NULL;

-- 3. Country, State and City masters for the company form (the BFD keeps them as Admin masters).
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
SELECT 'country', 'india', 'India', 10
WHERE NOT EXISTS (SELECT 1 FROM master_lookup m WHERE m.lookup_type = 'country' AND m.code = 'india' AND m.deleted_at IS NULL);

INSERT INTO master_lookup (lookup_type, code, label, sort_order)
SELECT 'state', lower(regexp_replace(n, '[^A-Za-z0-9]+', '_', 'g')), n, (row_number() OVER (ORDER BY n))::int * 10
FROM unnest(ARRAY[
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh',
    'Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha',
    'Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
    'Ladakh','Lakshadweep','Puducherry'
]) AS n
WHERE NOT EXISTS (
    SELECT 1 FROM master_lookup m
    WHERE m.lookup_type = 'state' AND m.code = lower(regexp_replace(n, '[^A-Za-z0-9]+', '_', 'g')) AND m.deleted_at IS NULL
);

INSERT INTO master_lookup (lookup_type, code, label, sort_order)
SELECT 'city', lower(regexp_replace(n, '[^A-Za-z0-9]+', '_', 'g')), n, (row_number() OVER (ORDER BY n))::int * 10
FROM unnest(ARRAY['Ahmedabad','Ankleshwar','Morbi','Rajkot','Surat','Vadodara','Vapi']) AS n
WHERE NOT EXISTS (
    SELECT 1 FROM master_lookup m
    WHERE m.lookup_type = 'city' AND m.code = lower(regexp_replace(n, '[^A-Za-z0-9]+', '_', 'g')) AND m.deleted_at IS NULL
);

-- migrate:down
UPDATE master_lookup SET is_active = true WHERE lookup_type = 'lost_reason' AND code IN ('no_budget', 'bad_timing', 'duplicate');
UPDATE master_lookup SET label = 'Price Too High',        sort_order = 10 WHERE lookup_type = 'lost_reason' AND code = 'price_high';
UPDATE master_lookup SET label = 'Chose Competitor',      sort_order = 20 WHERE lookup_type = 'lost_reason' AND code = 'chose_competitor';
UPDATE master_lookup SET label = 'Requirement Changed',   sort_order = 50 WHERE lookup_type = 'lost_reason' AND code = 'requirement_changed';
UPDATE master_lookup SET label = 'No Response / Ghosted', sort_order = 40 WHERE lookup_type = 'lost_reason' AND code = 'no_response';
UPDATE master_lookup SET label = 'Not a Good Fit',        sort_order = 70 WHERE lookup_type = 'lost_reason' AND code = 'not_a_fit';
UPDATE master_lookup SET label = 'Other',                 sort_order = 90 WHERE lookup_type = 'lost_reason' AND code = 'other';
DELETE FROM master_lookup WHERE lookup_type IN ('country', 'state', 'city') AND created_by IS NULL AND updated_at IS NULL;
DROP INDEX IF EXISTS ix_master_lookup_parent;
ALTER TABLE master_lookup DROP CONSTRAINT IF EXISTS fk_master_lookup_parent;
ALTER TABLE master_lookup DROP COLUMN IF EXISTS parent_id;
