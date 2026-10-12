-- migrate:up

-- =============================================================================
-- Rule D: Integrity triggers (skip when row is being soft deleted)
-- =============================================================================

-- (a) Generic fn_prevent_hierarchy_cycle(table, pk_col, parent_col)
CREATE OR REPLACE FUNCTION fn_prevent_hierarchy_cycle()
RETURNS trigger AS $$
DECLARE
    v_tbl text := TG_ARGV[0];
    v_pk_col text := TG_ARGV[1];
    v_parent_col text := TG_ARGV[2];
    v_pk_val integer;
    v_parent_val integer;
    v_cycle_found boolean := false;
    v_query text;
BEGIN
    -- Skip integrity checks if the row is being soft deleted
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    v_pk_val := (to_jsonb(NEW) ->> v_pk_col)::integer;
    v_parent_val := (to_jsonb(NEW) ->> v_parent_col)::integer;

    IF v_parent_val IS NULL THEN
        RETURN NEW;
    END IF;

    -- Self-loop check
    IF v_pk_val IS NOT NULL AND v_pk_val = v_parent_val THEN
        RAISE EXCEPTION 'Hierarchy cycle detected in %: row % cannot reference itself', v_tbl, v_pk_val;
    END IF;

    -- On UPDATE, skip if parent reference did not change
    IF TG_OP = 'UPDATE' THEN
        IF (to_jsonb(OLD) ->> v_parent_col) IS NOT DISTINCT FROM (to_jsonb(NEW) ->> v_parent_col) THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Traverse ancestors using recursive CTE to ensure no cycle
    IF v_pk_val IS NOT NULL THEN
        v_query := format('
            WITH RECURSIVE ancestor_tree AS (
                SELECT %I AS current_id, %I AS parent_id, 1 AS depth
                FROM %I
                WHERE %I = $1 AND deleted_at IS NULL
                UNION ALL
                SELECT t.%I, t.%I, a.depth + 1
                FROM %I t
                INNER JOIN ancestor_tree a ON t.%I = a.parent_id
                WHERE t.deleted_at IS NULL AND a.depth < 100
            )
            SELECT EXISTS (
                SELECT 1 FROM ancestor_tree WHERE current_id = $2 OR parent_id = $2
            );
        ', v_pk_col, v_parent_col, v_tbl, v_pk_col, v_pk_col, v_parent_col, v_tbl, v_pk_col);

        EXECUTE v_query INTO v_cycle_found USING v_parent_val, v_pk_val;

        IF v_cycle_found THEN
            RAISE EXCEPTION 'Hierarchy cycle detected in %: % would create a cycle with ancestor %', v_tbl, v_pk_val, v_parent_val;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_hierarchy_cycle_employees
    BEFORE INSERT OR UPDATE OF reporting_manager ON employees
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hierarchy_cycle('employees', 'emp_id', 'reporting_manager');

CREATE TRIGGER trg_prevent_hierarchy_cycle_companies
    BEFORE INSERT OR UPDATE OF parent_company_id ON companies
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hierarchy_cycle('companies', 'company_id', 'parent_company_id');

CREATE TRIGGER trg_prevent_hierarchy_cycle_company_persons
    BEFORE INSERT OR UPDATE OF reports_to_id ON company_persons
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hierarchy_cycle('company_persons', 'company_person_id', 'reports_to_id');


-- (b) industries: max 2 levels (parent must be top-level; a row with children cannot become a child)
CREATE OR REPLACE FUNCTION fn_industries_max_levels()
RETURNS trigger AS $$
DECLARE
    v_parent_parent_id integer;
    v_has_children boolean;
BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_id IS NOT NULL THEN
        -- 1. Parent must be top-level (parent_id IS NULL)
        SELECT parent_id INTO v_parent_parent_id
        FROM industries
        WHERE industry_id = NEW.parent_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent industry % does not exist or is soft-deleted', NEW.parent_id;
        END IF;

        IF v_parent_parent_id IS NOT NULL THEN
            RAISE EXCEPTION 'Industry hierarchy exceeds 2 levels: parent industry % is already a sub-industry', NEW.parent_id;
        END IF;

        -- 2. A row with children cannot become a child
        IF TG_OP = 'UPDATE' THEN
            SELECT EXISTS (
                SELECT 1 FROM industries WHERE parent_id = NEW.industry_id AND deleted_at IS NULL
            ) INTO v_has_children;

            IF v_has_children THEN
                RAISE EXCEPTION 'Industry % already has sub-industries and cannot become a child', NEW.industry_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_industries_max_levels
    BEFORE INSERT OR UPDATE OF parent_id ON industries
    FOR EACH ROW EXECUTE FUNCTION fn_industries_max_levels();


-- (c) companies: industry_id must be top-level; sub_industry_id (if set) must be a child of industry_id
CREATE OR REPLACE FUNCTION fn_companies_industry_hierarchy()
RETURNS trigger AS $$
DECLARE
    v_parent_id integer;
    v_sub_parent_id integer;
BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 1. industry_id must be top-level
    SELECT parent_id INTO v_parent_id
    FROM industries
    WHERE industry_id = NEW.industry_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Industry % does not exist or is soft-deleted', NEW.industry_id;
    END IF;

    IF v_parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Company industry_id % must be a top-level industry', NEW.industry_id;
    END IF;

    -- 2. sub_industry_id (if set) must be a child of industry_id
    IF NEW.sub_industry_id IS NOT NULL THEN
        SELECT parent_id INTO v_sub_parent_id
        FROM industries
        WHERE industry_id = NEW.sub_industry_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sub-industry % does not exist or is soft-deleted', NEW.sub_industry_id;
        END IF;

        IF v_sub_parent_id IS DISTINCT FROM NEW.industry_id THEN
            RAISE EXCEPTION 'Sub-industry % is not a child of industry_id %', NEW.sub_industry_id, NEW.industry_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_industry_hierarchy
    BEFORE INSERT OR UPDATE OF industry_id, sub_industry_id ON companies
    FOR EACH ROW EXECUTE FUNCTION fn_companies_industry_hierarchy();


-- (d) company_persons: reports_to_id must belong to the same company_id
CREATE OR REPLACE FUNCTION fn_company_persons_reports_to_company()
RETURNS trigger AS $$
DECLARE
    v_target_company_id integer;
BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.reports_to_id IS NOT NULL THEN
        SELECT company_id INTO v_target_company_id
        FROM company_persons
        WHERE company_person_id = NEW.reports_to_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Reporting manager contact % not found or soft-deleted', NEW.reports_to_id;
        END IF;

        IF v_target_company_id <> NEW.company_id THEN
            RAISE EXCEPTION 'reports_to_id % belongs to company %, not company %', NEW.reports_to_id, v_target_company_id, NEW.company_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_company_persons_reports_to_company
    BEFORE INSERT OR UPDATE OF reports_to_id, company_id ON company_persons
    FOR EACH ROW EXECUTE FUNCTION fn_company_persons_reports_to_company();


-- (e) leads integrity
CREATE OR REPLACE FUNCTION fn_leads_integrity()
RETURNS trigger AS $$
DECLARE
    v_stage_won boolean;
    v_stage_lost boolean;
    v_has_active_contact boolean;
    v_source_type text;
    v_lost_type text;
BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 1. Stage status consistency
    SELECT is_won, is_lost INTO v_stage_won, v_stage_lost
    FROM pipeline_stages
    WHERE pipeline_stage_id = NEW.pipeline_stage_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pipeline stage % not found or soft-deleted', NEW.pipeline_stage_id;
    END IF;

    IF v_stage_won AND NEW.status <> 'won' THEN
        RAISE EXCEPTION 'Pipeline stage % is marked as WON; lead status must be "won"', NEW.pipeline_stage_id;
    END IF;

    IF v_stage_lost AND NEW.status <> 'lost' THEN
        RAISE EXCEPTION 'Pipeline stage % is marked as LOST; lead status must be "lost"', NEW.pipeline_stage_id;
    END IF;

    IF (NOT v_stage_won) AND (NOT v_stage_lost) AND (NEW.status NOT IN ('open', 'on_hold')) THEN
        RAISE EXCEPTION 'Pipeline stage % is an active stage; lead status must be "open" or "on_hold"', NEW.pipeline_stage_id;
    END IF;

    -- 2. person_id (if set) must have an active company_persons row for the same company
    IF NEW.person_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM company_persons
            WHERE company_id = NEW.company_id
              AND person_id = NEW.person_id
              AND is_active = true
              AND deleted_at IS NULL
        ) INTO v_has_active_contact;

        IF NOT v_has_active_contact THEN
            RAISE EXCEPTION 'person_id % does not have an active affiliation with company_id %', NEW.person_id, NEW.company_id;
        END IF;
    END IF;

    -- 3. source_id must have lookup_type 'lead_source'
    IF NEW.source_id IS NOT NULL THEN
        SELECT lookup_type INTO v_source_type
        FROM master_lookup
        WHERE lookup_id = NEW.source_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'source_id % not found or soft-deleted', NEW.source_id;
        END IF;

        IF v_source_type <> 'lead_source' THEN
            RAISE EXCEPTION 'source_id % must have lookup_type "lead_source" (got %)', NEW.source_id, v_source_type;
        END IF;
    END IF;

    -- 4. lost_reason_id must have lookup_type 'lost_reason'
    IF NEW.lost_reason_id IS NOT NULL THEN
        SELECT lookup_type INTO v_lost_type
        FROM master_lookup
        WHERE lookup_id = NEW.lost_reason_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'lost_reason_id % not found or soft-deleted', NEW.lost_reason_id;
        END IF;

        IF v_lost_type <> 'lost_reason' THEN
            RAISE EXCEPTION 'lost_reason_id % must have lookup_type "lost_reason" (got %)', NEW.lost_reason_id, v_lost_type;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_integrity
    BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION fn_leads_integrity();

-- migrate:down
DROP TRIGGER IF EXISTS trg_leads_integrity ON leads;
DROP FUNCTION IF EXISTS fn_leads_integrity();

DROP TRIGGER IF EXISTS trg_company_persons_reports_to_company ON company_persons;
DROP FUNCTION IF EXISTS fn_company_persons_reports_to_company();

DROP TRIGGER IF EXISTS trg_companies_industry_hierarchy ON companies;
DROP FUNCTION IF EXISTS fn_companies_industry_hierarchy();

DROP TRIGGER IF EXISTS trg_industries_max_levels ON industries;
DROP FUNCTION IF EXISTS fn_industries_max_levels();

DROP TRIGGER IF EXISTS trg_prevent_hierarchy_cycle_company_persons ON company_persons;
DROP TRIGGER IF EXISTS trg_prevent_hierarchy_cycle_companies ON companies;
DROP TRIGGER IF EXISTS trg_prevent_hierarchy_cycle_employees ON employees;
DROP FUNCTION IF EXISTS fn_prevent_hierarchy_cycle();
