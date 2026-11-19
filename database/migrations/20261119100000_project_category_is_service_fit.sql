-- migrate:up
-- "Project Category" and "Service Fit" were two lists for the same thing (what kind of work we do for a client).
-- Service Fit is now the single list: leads and projects both pick from it (Settings > Sales > Service Fits).
--
-- 1. Every project category that exists today is made sure to be a Service Fit. A category whose name is already
--    a Service Fit (same name, any capital letters) uses that Service Fit, so nothing is duplicated.
-- 2. projects.category stops being a fixed Postgres enum (which only accepted the eight values it was created with)
--    and holds the code of the Service Fit, the same way bug priority and bug type hold their Master Data code.
-- 3. The old "Project Category" rows are retired. The enum type stays in the database, unused.

CREATE TEMP TABLE _category_map (old_code text PRIMARY KEY, new_code text NOT NULL, label text NOT NULL);

-- The eight categories the enum always had, and any category the Admin added in Master Data (its own name wins)
INSERT INTO _category_map (old_code, new_code, label)
SELECT v.code, v.code, COALESCE(m.label, v.label)
FROM (VALUES
    ('ecom_website', 'E-com Website'), ('portfolio_website', 'Portfolio Website'), ('seo', 'SEO'),
    ('social_media', 'Social Media'), ('crm', 'CRM'), ('erp', 'ERP'), ('brochure', 'Brochure'), ('other', 'Other')
) AS v(code, label)
LEFT JOIN master_lookup m ON m.lookup_type = 'project_category' AND m.code = v.code AND m.deleted_at IS NULL;

INSERT INTO _category_map (old_code, new_code, label)
SELECT m.code, m.code, m.label
FROM master_lookup m
WHERE m.lookup_type = 'project_category' AND m.deleted_at IS NULL
ON CONFLICT (old_code) DO NOTHING;

-- Point each category at the Service Fit it already is, when there is one: same code first, then same name
UPDATE _category_map c
SET new_code = s.code
FROM master_lookup s
WHERE s.lookup_type = 'service_fit' AND s.deleted_at IS NULL
  AND (s.code = c.old_code OR lower(btrim(s.label)) = lower(btrim(c.label)))
  AND s.lookup_id = (
      SELECT s2.lookup_id FROM master_lookup s2
      WHERE s2.lookup_type = 'service_fit' AND s2.deleted_at IS NULL
        AND (s2.code = c.old_code OR lower(btrim(s2.label)) = lower(btrim(c.label)))
      ORDER BY (s2.code = c.old_code) DESC, s2.lookup_id
      LIMIT 1);

-- The categories that are not a Service Fit yet become one (added at the end of the list)
INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active)
SELECT 'service_fit', c.new_code, c.label,
       COALESCE((SELECT max(sort_order) FROM master_lookup WHERE lookup_type = 'service_fit'), 0) + 10 * row_number() OVER (ORDER BY c.old_code),
       true
FROM _category_map c
WHERE NOT EXISTS (
    SELECT 1 FROM master_lookup s
    WHERE s.lookup_type = 'service_fit' AND s.code = c.new_code AND s.deleted_at IS NULL
)
AND NOT EXISTS (
    -- a deleted row still holds its code; bring it back instead of clashing with it
    SELECT 1 FROM master_lookup s WHERE s.lookup_type = 'service_fit' AND s.code = c.new_code
);

UPDATE master_lookup s
SET deleted_at = NULL, deleted_by = NULL, is_active = true, updated_at = now()
FROM _category_map c
WHERE s.lookup_type = 'service_fit' AND s.code = c.new_code AND s.deleted_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM projects p WHERE p.category::text = c.old_code);

-- This rule compares the category with the enum value 'other', so it is dropped for the change and put back on text
ALTER TABLE projects DROP CONSTRAINT IF EXISTS ck_projects_other_category;
ALTER TABLE projects ALTER COLUMN category TYPE VARCHAR(50) USING category::text;
ALTER TABLE projects ADD CONSTRAINT ck_projects_other_category
    CHECK (category <> 'other' OR (other_category IS NOT NULL AND length(btrim(other_category)) > 0));

UPDATE projects p SET category = c.new_code
FROM _category_map c
WHERE p.category = c.old_code AND c.new_code <> c.old_code;

-- The old list is retired: it can no longer be edited, and no screen reads it
UPDATE master_lookup
SET deleted_at = now(), is_active = false, updated_at = now()
WHERE lookup_type = 'project_category' AND deleted_at IS NULL;

DROP TABLE _category_map;

-- Location master data: a state belongs to a country, a city belongs to a state (Settings > Countries / States / Cities).
-- Every state that has no country yet is placed under India, the default country of the company form. Cities are left
-- for the Admin to link; a city with no state is offered for every state until then.
INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active)
SELECT 'country', 'india', 'India', 10, true
WHERE EXISTS (SELECT 1 FROM master_lookup WHERE lookup_type = 'state' AND deleted_at IS NULL AND parent_id IS NULL)
  AND NOT EXISTS (SELECT 1 FROM master_lookup WHERE lookup_type = 'country' AND lower(label) = 'india' AND deleted_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM master_lookup WHERE lookup_type = 'country' AND code = 'india');

UPDATE master_lookup s
SET parent_id = (SELECT c.lookup_id FROM master_lookup c WHERE c.lookup_type = 'country' AND lower(c.label) = 'india' AND c.deleted_at IS NULL ORDER BY c.lookup_id LIMIT 1),
    updated_at = now()
WHERE s.lookup_type = 'state' AND s.deleted_at IS NULL AND s.parent_id IS NULL
  AND EXISTS (SELECT 1 FROM master_lookup c WHERE c.lookup_type = 'country' AND lower(c.label) = 'india' AND c.deleted_at IS NULL);

-- migrate:down
-- Projects whose category is not one of the original eight values cannot go back to the enum.
ALTER TABLE projects DROP CONSTRAINT IF EXISTS ck_projects_other_category;
ALTER TABLE projects ALTER COLUMN category TYPE project_category USING category::project_category;
ALTER TABLE projects ADD CONSTRAINT ck_projects_other_category
    CHECK (category <> 'other'::project_category OR (other_category IS NOT NULL AND length(btrim(other_category)) > 0));
