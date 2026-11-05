-- migrate:up
-- =============================================================================
-- Baseline + Company ID for the Company Database (BFD section 3 / 4)
--
-- 1. Codify the companies columns that already exist in the live database but
--    were never captured in a migration (schema drift). All statements are
--    idempotent: a no-op on live, creates the columns on a fresh database.
-- 2. Company ID "COM-0001": assigned by the database when company_code is empty,
--    from entity_counters (never reused). Codes that are already set (the 13
--    companies in live, or anything inserted with an explicit code) are kept.
-- =============================================================================

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS company_code varchar(50),
    ADD COLUMN IF NOT EXISTS client_code varchar(50),
    ADD COLUMN IF NOT EXISTS is_client boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS no_of_branches integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS no_of_plants integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS full_address text,
    ADD COLUMN IF NOT EXISTS pin varchar(20),
    ADD COLUMN IF NOT EXISTS google_maps_url text,
    ADD COLUMN IF NOT EXISTS is_gidc boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS gidc_name varchar(150),
    ADD COLUMN IF NOT EXISTS gidc_area_phase varchar(150),
    ADD COLUMN IF NOT EXISTS contact_person varchar(150),
    ADD COLUMN IF NOT EXISTS designation varchar(100),
    ADD COLUMN IF NOT EXISTS mobile varchar(25),
    ADD COLUMN IF NOT EXISTS email varchar(255),
    ADD COLUMN IF NOT EXISTS nature_of_business varchar(100),
    ADD COLUMN IF NOT EXISTS products_services text,
    ADD COLUMN IF NOT EXISTS estimated_employees integer,
    ADD COLUMN IF NOT EXISTS estimated_turnover numeric(15,2),
    ADD COLUMN IF NOT EXISTS year_established integer,
    ADD COLUMN IF NOT EXISTS existing_major_clients text,
    ADD COLUMN IF NOT EXISTS website text,
    ADD COLUMN IF NOT EXISTS website_quality varchar(50),
    ADD COLUMN IF NOT EXISTS developed_by varchar(200),
    ADD COLUMN IF NOT EXISTS linkedin_url text,
    ADD COLUMN IF NOT EXISTS instagram_url text,
    ADD COLUMN IF NOT EXISTS facebook_url text,
    ADD COLUMN IF NOT EXISTS youtube_url text,
    ADD COLUMN IF NOT EXISTS google_business_profile_url text,
    ADD COLUMN IF NOT EXISTS brochure_url text;

CREATE UNIQUE INDEX IF NOT EXISTS companies_company_code_key ON companies (company_code);
CREATE UNIQUE INDEX IF NOT EXISTS companies_client_code_key ON companies (client_code);

-- Company ID counter, seeded from the highest code already in use.
INSERT INTO entity_counters (entity_type, counter_key, last_number)
SELECT 'COMPANY', 'GLOBAL',
       COALESCE(MAX(NULLIF(regexp_replace(company_code, '\D', '', 'g'), '')::integer), 0)
FROM companies
ON CONFLICT (entity_type, counter_key) DO NOTHING;

CREATE OR REPLACE FUNCTION fn_companies_assign_code()
RETURNS trigger AS $$
DECLARE
    v_next integer;
BEGIN
    IF NEW.company_code IS NULL OR btrim(NEW.company_code) = '' THEN
        INSERT INTO entity_counters (entity_type, counter_key, last_number)
        VALUES ('COMPANY', 'GLOBAL', 1)
        ON CONFLICT (entity_type, counter_key)
        DO UPDATE SET last_number = entity_counters.last_number + 1
        RETURNING last_number INTO v_next;
        NEW.company_code := 'COM-' || lpad(v_next::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_01_assign_code ON companies;
CREATE TRIGGER trg_companies_01_assign_code
    BEFORE INSERT ON companies
    FOR EACH ROW EXECUTE FUNCTION fn_companies_assign_code();

-- migrate:down
DROP TRIGGER IF EXISTS trg_companies_01_assign_code ON companies;
DROP FUNCTION IF EXISTS fn_companies_assign_code();
-- The companies columns and the entity_counters row are left in place on purpose:
-- they hold live data and the columns exist in the live database independently
-- of this migration.
