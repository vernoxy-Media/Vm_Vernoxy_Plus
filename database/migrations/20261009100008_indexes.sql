-- migrate:up

-- =============================================================================
-- Rule B: Unique constraints as partial unique indexes (WHERE deleted_at IS NULL)
-- =============================================================================

-- 1. employees
CREATE UNIQUE INDEX ux_employees_email ON employees (lower(email)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_employees_mob ON employees (mob) WHERE deleted_at IS NULL;

-- 2. departments
CREATE UNIQUE INDEX ux_departments_name ON departments (lower(name)) WHERE deleted_at IS NULL;

-- 3. roles
CREATE UNIQUE INDEX ux_roles_role_name ON roles (lower(role_name)) WHERE deleted_at IS NULL;

-- 4. customer_types
CREATE UNIQUE INDEX ux_customer_types_name ON customer_types (lower(name)) WHERE deleted_at IS NULL;

-- 5. pipeline_stages
CREATE UNIQUE INDEX ux_pipeline_stages_name ON pipeline_stages (lower(name)) WHERE deleted_at IS NULL;

-- 6. master_lookup
CREATE UNIQUE INDEX ux_master_lookup_type_code ON master_lookup (lookup_type, code) WHERE deleted_at IS NULL;

-- 7. industries (root vs child unique)
CREATE UNIQUE INDEX ux_industries_root_name ON industries (lower(name)) WHERE parent_id IS NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX ux_industries_parent_name ON industries (parent_id, lower(name)) WHERE parent_id IS NOT NULL AND deleted_at IS NULL;

-- 8. company_persons
CREATE UNIQUE INDEX ux_company_persons_company_person ON company_persons (company_id, person_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_company_persons_primary ON company_persons (company_id) WHERE is_primary = true AND deleted_at IS NULL;

-- 9. company_channels
CREATE UNIQUE INDEX ux_company_channels_value ON company_channels (company_id, channel_type, lower(value)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_company_channels_primary ON company_channels (company_id, channel_type) WHERE is_primary = true AND deleted_at IS NULL;


-- =============================================================================
-- Rule E: General and Foreign Key Indexes (WHERE deleted_at IS NULL)
-- =============================================================================

-- companies
CREATE INDEX ix_companies_name_trgm ON companies USING gin (lower(name) gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX ix_companies_keyset ON companies (lower(name), company_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_companies_owner_id ON companies (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_companies_industry_sub ON companies (industry_id, sub_industry_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_companies_customer_type_id ON companies (customer_type_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_companies_parent_company_id ON companies (parent_company_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_companies_state_city ON companies (state, city) WHERE deleted_at IS NULL;

-- persons
CREATE INDEX ix_persons_name_trgm ON persons USING gin (lower(name) gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX ix_persons_email ON persons (lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX ix_persons_mobile ON persons (mobile) WHERE deleted_at IS NULL;

-- company_channels
CREATE INDEX ix_company_channels_company_id ON company_channels (company_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_company_channels_type_value ON company_channels (channel_type, lower(value)) WHERE deleted_at IS NULL;

-- company_persons
CREATE INDEX ix_company_persons_person_id ON company_persons (person_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_company_persons_reports_to_id ON company_persons (reports_to_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_company_persons_department_id ON company_persons (department_id) WHERE deleted_at IS NULL;

-- employees
CREATE INDEX ix_employees_dep_id ON employees (dep_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_employees_role_id ON employees (role_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_employees_reporting_manager ON employees (reporting_manager) WHERE deleted_at IS NULL;

-- master_lookup
CREATE INDEX ix_master_lookup_type_sort ON master_lookup (lookup_type, sort_order) WHERE deleted_at IS NULL;

-- pipeline_stages
CREATE INDEX ix_pipeline_stages_sort_order ON pipeline_stages (sort_order) WHERE deleted_at IS NULL;

-- industries
CREATE INDEX ix_industries_parent_id ON industries (parent_id) WHERE deleted_at IS NULL;

-- leads
CREATE INDEX ix_leads_owner_status_close_date ON leads (owner_id, status, expected_close_date) WHERE deleted_at IS NULL;
CREATE INDEX ix_leads_stage_status ON leads (pipeline_stage_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ix_leads_company_id ON leads (company_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_leads_person_id ON leads (person_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_leads_source_id ON leads (source_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_leads_open_forecast ON leads (expected_close_date) INCLUDE (expected_value, currency_code, pipeline_stage_id) WHERE status = 'open' AND deleted_at IS NULL;
CREATE INDEX ix_leads_won_revenue ON leads (closed_at) INCLUDE (owner_id, actual_value, currency_code) WHERE status = 'won' AND deleted_at IS NULL;
CREATE INDEX ix_leads_keyset ON leads (created_at DESC, lead_id DESC) WHERE deleted_at IS NULL;


-- migrate:down
DROP INDEX IF EXISTS ix_leads_keyset;
DROP INDEX IF EXISTS ix_leads_won_revenue;
DROP INDEX IF EXISTS ix_leads_open_forecast;
DROP INDEX IF EXISTS ix_leads_source_id;
DROP INDEX IF EXISTS ix_leads_person_id;
DROP INDEX IF EXISTS ix_leads_company_id;
DROP INDEX IF EXISTS ix_leads_stage_status;
DROP INDEX IF EXISTS ix_leads_owner_status_close_date;

DROP INDEX IF EXISTS ix_industries_parent_id;
DROP INDEX IF EXISTS ix_pipeline_stages_sort_order;
DROP INDEX IF EXISTS ix_master_lookup_type_sort;

DROP INDEX IF EXISTS ix_employees_reporting_manager;
DROP INDEX IF EXISTS ix_employees_role_id;
DROP INDEX IF EXISTS ix_employees_dep_id;

DROP INDEX IF EXISTS ix_company_persons_department_id;
DROP INDEX IF EXISTS ix_company_persons_reports_to_id;
DROP INDEX IF EXISTS ix_company_persons_person_id;

DROP INDEX IF EXISTS ix_company_channels_type_value;
DROP INDEX IF EXISTS ix_company_channels_company_id;

DROP INDEX IF EXISTS ix_persons_mobile;
DROP INDEX IF EXISTS ix_persons_email;
DROP INDEX IF EXISTS ix_persons_name_trgm;

DROP INDEX IF EXISTS ix_companies_state_city;
DROP INDEX IF EXISTS ix_companies_parent_company_id;
DROP INDEX IF EXISTS ix_companies_customer_type_id;
DROP INDEX IF EXISTS ix_companies_industry_sub;
DROP INDEX IF EXISTS ix_companies_owner_id;
DROP INDEX IF EXISTS ix_companies_keyset;
DROP INDEX IF EXISTS ix_companies_name_trgm;

DROP INDEX IF EXISTS ux_company_channels_primary;
DROP INDEX IF EXISTS ux_company_channels_value;
DROP INDEX IF EXISTS ux_company_persons_primary;
DROP INDEX IF EXISTS ux_company_persons_company_person;
DROP INDEX IF EXISTS ux_industries_parent_name;
DROP INDEX IF EXISTS ux_industries_root_name;
DROP INDEX IF EXISTS ux_master_lookup_type_code;
DROP INDEX IF EXISTS ux_pipeline_stages_name;
DROP INDEX IF EXISTS ux_customer_types_name;
DROP INDEX IF EXISTS ux_roles_role_name;
DROP INDEX IF EXISTS ux_departments_name;
DROP INDEX IF EXISTS ux_employees_mob;
DROP INDEX IF EXISTS ux_employees_email;
