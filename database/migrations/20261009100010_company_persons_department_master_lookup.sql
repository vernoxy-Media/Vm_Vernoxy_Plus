-- migrate:up



-- 2. Drop the FK from company_persons.department_id to departments
ALTER TABLE company_persons DROP CONSTRAINT IF EXISTS fk_company_persons_department_id;

-- 3. Add FK from company_persons.department_id to master_lookup(lookup_id)
ALTER TABLE company_persons ADD CONSTRAINT fk_company_persons_department_id
    FOREIGN KEY (department_id) REFERENCES master_lookup(lookup_id);

-- 4. Trigger function to enforce master_lookup.lookup_type = 'person_department'
CREATE OR REPLACE FUNCTION fn_company_persons_department_lookup()
RETURNS trigger AS $$
DECLARE
    v_lookup_type text;
BEGIN
    -- Skip when soft deleting
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.department_id IS NOT NULL THEN
        SELECT lookup_type INTO v_lookup_type
        FROM master_lookup
        WHERE lookup_id = NEW.department_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'department_id % does not exist in master_lookup or is soft-deleted', NEW.department_id;
        END IF;

        IF v_lookup_type <> 'person_department' THEN
            RAISE EXCEPTION 'company_persons.department_id % must have lookup_type "person_department" (got "%")', NEW.department_id, v_lookup_type;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_company_persons_department_lookup
    BEFORE INSERT OR UPDATE OF department_id ON company_persons
    FOR EACH ROW EXECUTE FUNCTION fn_company_persons_department_lookup();

-- 5. Ensure matching partial index exists
CREATE INDEX IF NOT EXISTS ix_company_persons_department_id
    ON company_persons (department_id)
    WHERE deleted_at IS NULL;

-- migrate:down
DROP TRIGGER IF EXISTS trg_company_persons_department_lookup ON company_persons;
DROP FUNCTION IF EXISTS fn_company_persons_department_lookup();

ALTER TABLE company_persons DROP CONSTRAINT IF EXISTS fk_company_persons_department_id;

ALTER TABLE company_persons ADD CONSTRAINT fk_company_persons_department_id
    FOREIGN KEY (department_id) REFERENCES departments(dep_id);
