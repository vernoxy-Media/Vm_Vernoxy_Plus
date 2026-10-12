-- migrate:up

-- 1. Add is_default column to industries
ALTER TABLE industries
    ADD COLUMN is_default boolean NOT NULL DEFAULT false;

-- Partial unique index: at most one active default industry
CREATE UNIQUE INDEX ux_industries_default
    ON industries (is_default)
    WHERE is_default AND deleted_at IS NULL;

-- Check constraint: default industry must be a top-level industry
ALTER TABLE industries
    ADD CONSTRAINT ck_industries_default_top_level
    CHECK (NOT is_default OR parent_id IS NULL);

-- Set existing active top-level industry "Unclassified" to is_default = true
UPDATE industries
SET is_default = true
WHERE industry_id = (
    SELECT industry_id
    FROM industries
    WHERE lower(name) = 'unclassified' AND parent_id IS NULL AND deleted_at IS NULL
    ORDER BY industry_id ASC
    LIMIT 1
);

-- 2. Add is_default column to customer_types
ALTER TABLE customer_types
    ADD COLUMN is_default boolean NOT NULL DEFAULT false;

-- Partial unique index: at most one active default customer type
CREATE UNIQUE INDEX ux_customer_types_default
    ON customer_types (is_default)
    WHERE is_default AND deleted_at IS NULL;

-- Set existing active customer type "Info Only" to is_default = true
UPDATE customer_types
SET is_default = true
WHERE customer_type_id = (
    SELECT customer_type_id
    FROM customer_types
    WHERE lower(name) = 'info only' AND deleted_at IS NULL
    ORDER BY customer_type_id ASC
    LIMIT 1
);

-- 3. Integrity triggers for industries
CREATE OR REPLACE FUNCTION fn_industries_integrity()
RETURNS trigger AS $$
DECLARE
    v_has_active_children boolean;
    v_has_active_companies boolean;
    v_parent_active boolean;
BEGIN
    -- Check immutability of is_default and parent_id after insert
    IF TG_OP = 'UPDATE' THEN
        IF NEW.is_default IS DISTINCT FROM OLD.is_default THEN
            RAISE EXCEPTION 'is_default is immutable for industries';
        END IF;
        IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
            RAISE EXCEPTION 'parent_id is immutable for industries';
        END IF;
    END IF;

    -- Default industry cannot be inactive
    IF NEW.is_default = true AND NEW.is_active = false THEN
        RAISE EXCEPTION 'Default industry cannot be inactive';
    END IF;

    -- A sub-industry cannot be activated (or inserted active) while its parent is inactive or deleted
    IF NEW.parent_id IS NOT NULL AND NEW.is_active = true AND NEW.deleted_at IS NULL THEN
        SELECT is_active INTO v_parent_active
        FROM industries
        WHERE industry_id = NEW.parent_id AND deleted_at IS NULL;

        IF NOT FOUND OR NOT v_parent_active THEN
            RAISE EXCEPTION 'Sub-industry cannot be active while its parent industry % is inactive or deleted', NEW.parent_id;
        END IF;
    END IF;

    -- Soft delete or deactivation checks
    IF (TG_OP = 'UPDATE' AND (
        (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR
        (OLD.is_active = true AND NEW.is_active = false)
    )) THEN
        -- Default industry can never be soft deleted or deactivated
        IF OLD.is_default = true THEN
            RAISE EXCEPTION 'Default industry cannot be deactivated or deleted';
        END IF;

        -- Rejected while the industry has active sub-industries
        SELECT EXISTS (
            SELECT 1 FROM industries
            WHERE parent_id = OLD.industry_id AND deleted_at IS NULL AND is_active = true
        ) INTO v_has_active_children;

        IF v_has_active_children THEN
            RAISE EXCEPTION 'Industry % cannot be deactivated or deleted while it has active sub-industries', OLD.industry_id;
        END IF;

        -- Rejected while referenced by any active company (industry_id or sub_industry_id)
        SELECT EXISTS (
            SELECT 1 FROM companies
            WHERE (industry_id = OLD.industry_id OR sub_industry_id = OLD.industry_id)
              AND deleted_at IS NULL AND is_active = true
        ) INTO v_has_active_companies;

        IF v_has_active_companies THEN
            RAISE EXCEPTION 'Industry % cannot be deactivated or deleted while referenced by active companies', OLD.industry_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_industries_integrity
    BEFORE INSERT OR UPDATE ON industries
    FOR EACH ROW EXECUTE FUNCTION fn_industries_integrity();

-- 4. Integrity triggers for customer_types
CREATE OR REPLACE FUNCTION fn_customer_types_integrity()
RETURNS trigger AS $$
DECLARE
    v_has_active_companies boolean;
BEGIN
    -- Default customer type cannot be inactive
    IF NEW.is_default = true AND NEW.is_active = false THEN
        RAISE EXCEPTION 'Default customer type cannot be inactive';
    END IF;

    -- Soft delete or deactivation checks
    IF (TG_OP = 'UPDATE' AND (
        (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR
        (OLD.is_active = true AND NEW.is_active = false)
    )) THEN
        -- Default customer type cannot be deactivated or deleted
        IF OLD.is_default = true THEN
            RAISE EXCEPTION 'Default customer type cannot be deactivated or deleted';
        END IF;

        -- Rejected while referenced by any active company
        SELECT EXISTS (
            SELECT 1 FROM companies
            WHERE customer_type_id = OLD.customer_type_id
              AND deleted_at IS NULL AND is_active = true
        ) INTO v_has_active_companies;

        IF v_has_active_companies THEN
            RAISE EXCEPTION 'Customer type % cannot be deactivated or deleted while referenced by active companies', OLD.customer_type_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customer_types_integrity
    BEFORE INSERT OR UPDATE ON customer_types
    FOR EACH ROW EXECUTE FUNCTION fn_customer_types_integrity();

-- migrate:down
DROP TRIGGER IF EXISTS trg_customer_types_integrity ON customer_types;
DROP FUNCTION IF EXISTS fn_customer_types_integrity();

DROP TRIGGER IF EXISTS trg_industries_integrity ON industries;
DROP FUNCTION IF EXISTS fn_industries_integrity();

DROP INDEX IF EXISTS ux_customer_types_default;
ALTER TABLE customer_types DROP COLUMN IF EXISTS is_default;

DROP CONSTRAINT IF EXISTS ck_industries_default_top_level ON industries;
DROP INDEX IF EXISTS ux_industries_default;
ALTER TABLE industries DROP COLUMN IF EXISTS is_default;
