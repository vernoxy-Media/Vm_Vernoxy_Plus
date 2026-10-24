-- migrate:up
-- Enhance leads table with complete sales CRM fields and standard pipeline stages

-- 1. Relax existing restrictive constraints on leads
ALTER TABLE leads ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN title DROP NOT NULL;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS ck_leads_status_consistency;

-- 2. Add full sales & qualification CRM fields
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS company_name varchar(255),
    ADD COLUMN IF NOT EXISTS no_of_branches integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS no_of_plants integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS full_address text,
    ADD COLUMN IF NOT EXISTS city varchar(100),
    ADD COLUMN IF NOT EXISTS state varchar(100),
    ADD COLUMN IF NOT EXISTS country varchar(100) DEFAULT 'India',
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
    ADD COLUMN IF NOT EXISTS industry varchar(100),
    ADD COLUMN IF NOT EXISTS industry_id integer REFERENCES industries(industry_id),
    ADD COLUMN IF NOT EXISTS products_services text,
    ADD COLUMN IF NOT EXISTS estimated_employees integer,
    ADD COLUMN IF NOT EXISTS estimated_turnover decimal(15,2),
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
    ADD COLUMN IF NOT EXISTS brochure_url text,
    ADD COLUMN IF NOT EXISTS lead_source varchar(100) DEFAULT 'Cold calling',
    ADD COLUMN IF NOT EXISTS lead_by_id integer REFERENCES employees(emp_id),
    ADD COLUMN IF NOT EXISTS service_fit varchar(150),
    ADD COLUMN IF NOT EXISTS lead_stage varchar(50) DEFAULT 'New';

-- 3. Ensure pipeline stages include Converted and On Hold
INSERT INTO pipeline_stages (name, sort_order, win_probability, is_won, is_lost, is_active)
VALUES
    ('New', 10, 10, false, false, true),
    ('Contacted', 20, 30, false, false, true),
    ('Qualified', 30, 60, false, false, true),
    ('Converted', 40, 100, true, false, true),
    ('Lost', 50, 0, false, true, true),
    ('On Hold', 60, 10, false, false, true)
ON CONFLICT (lower(name)) WHERE deleted_at IS NULL
DO UPDATE SET is_active = true, sort_order = EXCLUDED.sort_order;

-- 4. Seed master_lookup with standard Sales masters
-- Service Fit
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('service_fit', 'web_development', 'Web Development', 10),
    ('service_fit', 'mobile_app', 'Mobile Application', 20),
    ('service_fit', 'custom_software', 'Custom Software / ERP / CRM', 30),
    ('service_fit', 'digital_marketing', 'Digital Marketing & SEO', 40),
    ('service_fit', 'ui_ux_design', 'UI/UX Design & Branding', 50),
    ('service_fit', 'cloud_devops', 'Cloud Infrastructure & DevOps', 60),
    ('service_fit', 'ai_automation', 'AI & Process Automation', 70),
    ('service_fit', 'amc_support', 'AMC / Annual Maintenance', 80),
    ('service_fit', 'other', 'Other Services', 90)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- Nature of Business
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('nature_of_business', 'manufacturer', 'Manufacturer', 10),
    ('nature_of_business', 'trader', 'Trader', 20),
    ('nature_of_business', 'wholesaler', 'Wholesaler / Distributor', 30),
    ('nature_of_business', 'service_provider', 'Service Provider', 40),
    ('nature_of_business', 'epc_contractor', 'EPC Contractor', 50),
    ('nature_of_business', 'exporter', 'Exporter / Importer', 60),
    ('nature_of_business', 'other', 'Other', 70)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- GIDC Names
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('gidc_name', 'vatva', 'Vatva GIDC', 10),
    ('gidc_name', 'naroda', 'Naroda GIDC', 20),
    ('gidc_name', 'odhav', 'Odhav GIDC', 30),
    ('gidc_name', 'changodar', 'Changodar Industrial Area', 40),
    ('gidc_name', 'sanand', 'Sanand GIDC', 50),
    ('gidc_name', 'kathwada', 'Kathwada GIDC', 60),
    ('gidc_name', 'ankleshwar', 'Ankleshwar GIDC', 70),
    ('gidc_name', 'panoli', 'Panoli GIDC', 80),
    ('gidc_name', 'jhagadia', 'Jhagadia GIDC', 90),
    ('gidc_name', 'dahej', 'Dahej GIDC / PCPIR', 100),
    ('gidc_name', 'vapi', 'Vapi GIDC', 110),
    ('gidc_name', 'sachin', 'Sachin GIDC (Surat)', 120),
    ('gidc_name', 'hazira', 'Hazira Industrial Zone', 130),
    ('gidc_name', 'makarpura', 'Makarpura GIDC (Vadodara)', 140),
    ('gidc_name', 'halol', 'Halol GIDC', 150),
    ('gidc_name', 'nandesari', 'Nandesari GIDC', 160),
    ('gidc_name', 'chhatral', 'Chhatral GIDC', 170),
    ('gidc_name', 'metoda', 'Metoda GIDC (Rajkot)', 180),
    ('gidc_name', 'aji', 'Aji GIDC (Rajkot)', 190),
    ('gidc_name', 'other', 'Other GIDC / Industrial Zone', 200)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- GIDC Phases
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('gidc_phase', 'phase_1', 'Phase I', 10),
    ('gidc_phase', 'phase_2', 'Phase II', 20),
    ('gidc_phase', 'phase_3', 'Phase III', 30),
    ('gidc_phase', 'phase_4', 'Phase IV', 40),
    ('gidc_phase', 'phase_5', 'Phase V', 50),
    ('gidc_phase', 'main_estate', 'Main Estate', 60),
    ('gidc_phase', 'not_applicable', 'Not Applicable', 70)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- Designations
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('designation', 'director_md', 'Director / Managing Director', 10),
    ('designation', 'proprietor', 'Proprietor / Owner', 20),
    ('designation', 'ceo_coo', 'CEO / COO / CXO', 30),
    ('designation', 'purchase_manager', 'Purchase / Procurement Manager', 40),
    ('designation', 'plant_manager', 'Plant / Works Manager', 50),
    ('designation', 'marketing_sales_head', 'Sales / Marketing Head', 60),
    ('designation', 'it_head', 'IT Head / CTO', 70),
    ('designation', 'accounts_finance', 'Accounts / Finance Manager', 80),
    ('designation', 'general_manager', 'General Manager', 90),
    ('designation', 'other', 'Other', 100)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- Website Quality
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('website_quality', 'good', 'Good', 10),
    ('website_quality', 'average', 'Average', 20),
    ('website_quality', 'poor', 'Poor', 30),
    ('website_quality', 'no_website', 'No Website', 40)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- Lead Sources (ensure Cold calling is present and matches requirements)
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('lead_source', 'cold_calling', 'Cold calling', 5)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- migrate:down
ALTER TABLE leads
    DROP COLUMN IF EXISTS company_name,
    DROP COLUMN IF EXISTS no_of_branches,
    DROP COLUMN IF EXISTS no_of_plants,
    DROP COLUMN IF EXISTS full_address,
    DROP COLUMN IF EXISTS city,
    DROP COLUMN IF EXISTS state,
    DROP COLUMN IF EXISTS country,
    DROP COLUMN IF EXISTS pin,
    DROP COLUMN IF EXISTS google_maps_url,
    DROP COLUMN IF EXISTS is_gidc,
    DROP COLUMN IF EXISTS gidc_name,
    DROP COLUMN IF EXISTS gidc_area_phase,
    DROP COLUMN IF EXISTS contact_person,
    DROP COLUMN IF EXISTS designation,
    DROP COLUMN IF EXISTS mobile,
    DROP COLUMN IF EXISTS email,
    DROP COLUMN IF EXISTS nature_of_business,
    DROP COLUMN IF EXISTS industry,
    DROP COLUMN IF EXISTS industry_id,
    DROP COLUMN IF EXISTS products_services,
    DROP COLUMN IF EXISTS estimated_employees,
    DROP COLUMN IF EXISTS estimated_turnover,
    DROP COLUMN IF EXISTS year_established,
    DROP COLUMN IF EXISTS existing_major_clients,
    DROP COLUMN IF EXISTS website,
    DROP COLUMN IF EXISTS website_quality,
    DROP COLUMN IF EXISTS developed_by,
    DROP COLUMN IF EXISTS linkedin_url,
    DROP COLUMN IF EXISTS instagram_url,
    DROP COLUMN IF EXISTS facebook_url,
    DROP COLUMN IF EXISTS youtube_url,
    DROP COLUMN IF EXISTS google_business_profile_url,
    DROP COLUMN IF EXISTS brochure_url,
    DROP COLUMN IF EXISTS lead_source,
    DROP COLUMN IF EXISTS lead_by_id,
    DROP COLUMN IF EXISTS service_fit,
    DROP COLUMN IF EXISTS lead_stage;
