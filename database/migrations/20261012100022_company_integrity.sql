-- migrate:up

-- 1. Integrity triggers for companies
CREATE OR REPLACE FUNCTION fn_companies_integrity()
RETURNS trigger AS $$
DECLARE
    v_has_active_children boolean;
    v_has_active_leads boolean;
    v_industry_active boolean;
    v_sub_industry_active boolean;
    v_customer_type_active boolean;
    v_owner_status employee_status;
    v_owner_deleted timestamptz;
    v_parent_deleted timestamptz;
BEGIN
    -- 1. Soft delete checks
    IF (TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
        -- Rejected while it has active child companies
        SELECT EXISTS (
            SELECT 1 FROM companies
            WHERE parent_company_id = OLD.company_id
              AND deleted_at IS NULL
        ) INTO v_has_active_children;

        IF v_has_active_children THEN
            RAISE EXCEPTION 'Company % cannot be soft deleted while it has active child companies', OLD.company_id;
        END IF;

        -- Rejected while it has active leads
        SELECT EXISTS (
            SELECT 1 FROM leads
            WHERE company_id = OLD.company_id
              AND deleted_at IS NULL
              AND status IN ('open', 'on_hold')
        ) INTO v_has_active_leads;

        IF v_has_active_leads THEN
            RAISE EXCEPTION 'Company % cannot be soft deleted while it has active leads', OLD.company_id;
        END IF;

        -- Skip insertion/update foreign checks when the row is being soft deleted
        RETURN NEW;
    END IF;

    -- If row is already deleted, skip
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 2. industry_id must reference active, non-deleted row
    SELECT is_active INTO v_industry_active
    FROM industries
    WHERE industry_id = NEW.industry_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Industry % does not exist or is soft deleted', NEW.industry_id;
    END IF;

    IF NOT v_industry_active THEN
        RAISE EXCEPTION 'Industry % is inactive', NEW.industry_id;
    END IF;

    -- 3. sub_industry_id (if set) must reference active, non-deleted row
    IF NEW.sub_industry_id IS NOT NULL THEN
        SELECT is_active INTO v_sub_industry_active
        FROM industries
        WHERE industry_id = NEW.sub_industry_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sub-industry % does not exist or is soft deleted', NEW.sub_industry_id;
        END IF;

        IF NOT v_sub_industry_active THEN
            RAISE EXCEPTION 'Sub-industry % is inactive', NEW.sub_industry_id;
        END IF;
    END IF;

    -- 4. customer_type_id must reference active, non-deleted row
    SELECT is_active INTO v_customer_type_active
    FROM customer_types
    WHERE customer_type_id = NEW.customer_type_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer type % does not exist or is soft deleted', NEW.customer_type_id;
    END IF;

    IF NOT v_customer_type_active THEN
        RAISE EXCEPTION 'Customer type % is inactive', NEW.customer_type_id;
    END IF;

    -- 5. owner_id (if set) must be an Active, non-deleted employee
    IF NEW.owner_id IS NOT NULL THEN
        SELECT status, deleted_at INTO v_owner_status, v_owner_deleted
        FROM employees
        WHERE emp_id = NEW.owner_id;

        IF NOT FOUND OR v_owner_deleted IS NOT NULL THEN
            RAISE EXCEPTION 'Owner employee % does not exist or is soft deleted', NEW.owner_id;
        END IF;

        IF v_owner_status <> 'Active' THEN
            RAISE EXCEPTION 'Owner employee % is not Active (status: %)', NEW.owner_id, v_owner_status;
        END IF;
    END IF;

    -- 6. parent_company_id (if set) must reference a non-deleted company
    IF NEW.parent_company_id IS NOT NULL THEN
        SELECT deleted_at INTO v_parent_deleted
        FROM companies
        WHERE company_id = NEW.parent_company_id;

        IF NOT FOUND OR v_parent_deleted IS NOT NULL THEN
            RAISE EXCEPTION 'Parent company % does not exist or is soft deleted', NEW.parent_company_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_integrity
    BEFORE INSERT OR UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION fn_companies_integrity();

-- migrate:down
DROP TRIGGER IF EXISTS trg_companies_integrity ON companies;
DROP FUNCTION IF EXISTS fn_companies_integrity();
