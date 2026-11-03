-- migrate:up
-- =============================================================================
-- Lead Management foundation (BFD "Lead Management" v1.1)
--
--   * Lead status = leads.lead_stage (New / Contacted / Qualified / Converted /
--     Lost / On Hold). The application only sets lead_stage; a trigger keeps the
--     legacy leads.status + leads.pipeline_stage_id (used by fn_leads_integrity
--     and reports) in step, so nothing existing breaks.
--   * LEAD-0001 style ids come from entity_counters (never reused).
--   * One open lead per company is enforced by the database.
--   * Value checks are added NOT VALID: they apply to every new / changed row
--     and do not rewrite or reject legacy rows.
--   * Hard deletes on the CRM activity tables are blocked (repo "Rule A").
-- =============================================================================

-- 1. Pipeline stages the BFD needs (live already has them; fresh DBs do not) ----
INSERT INTO pipeline_stages (name, sort_order, win_probability, is_won, is_lost, is_active)
SELECT v.name, v.sort_order, v.win_probability, v.is_won, v.is_lost, true
FROM (VALUES
    ('New',       10,   5, false, false),
    ('Contacted', 20,  15, false, false),
    ('Qualified', 30,  40, false, false),
    ('Converted', 40, 100, true,  false),
    ('Lost',      50,   0, false, true),
    ('On Hold',   60,  10, false, false)
) AS v(name, sort_order, win_probability, is_won, is_lost)
WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_stages p
    WHERE lower(p.name) = lower(v.name) AND p.deleted_at IS NULL
);

-- 2. Lead code: LEAD-0001, LEAD-0002 ... --------------------------------------
INSERT INTO entity_counters (entity_type, counter_key, last_number)
SELECT 'LEAD', 'GLOBAL',
       COALESCE(MAX(NULLIF(regexp_replace(lead_code, '\D', '', 'g'), '')::integer), 0)
FROM leads
ON CONFLICT (entity_type, counter_key) DO NOTHING;

CREATE OR REPLACE FUNCTION fn_leads_assign_code()
RETURNS trigger AS $$
DECLARE
    v_next integer;
BEGIN
    IF NEW.lead_code IS NULL OR btrim(NEW.lead_code) = '' THEN
        INSERT INTO entity_counters (entity_type, counter_key, last_number)
        VALUES ('LEAD', 'GLOBAL', 1)
        ON CONFLICT (entity_type, counter_key)
        DO UPDATE SET last_number = entity_counters.last_number + 1
        RETURNING last_number INTO v_next;
        NEW.lead_code := 'LEAD-' || lpad(v_next::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_01_assign_code ON leads;
CREATE TRIGGER trg_leads_01_assign_code
    BEFORE INSERT ON leads
    FOR EACH ROW EXECUTE FUNCTION fn_leads_assign_code();

-- 3. lead_stage -> legacy status + pipeline_stage_id, lead_by -> owner --------
-- Named trg_leads_00_* so it runs before trg_leads_integrity.
CREATE OR REPLACE FUNCTION fn_leads_sync_stage()
RETURNS trigger AS $$
DECLARE
    v_stage_id integer;
BEGIN
    IF NEW.lead_stage IS NULL THEN
        NEW.lead_stage := 'New';
    END IF;

    IF NEW.lead_stage NOT IN ('New','Contacted','Qualified','Converted','Lost','On Hold') THEN
        RAISE EXCEPTION 'Invalid lead_stage "%": expected New, Contacted, Qualified, Converted, Lost or On Hold', NEW.lead_stage
            USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'INSERT' OR NEW.lead_stage IS DISTINCT FROM OLD.lead_stage THEN
        SELECT pipeline_stage_id INTO v_stage_id
        FROM pipeline_stages
        WHERE lower(name) = lower(NEW.lead_stage) AND deleted_at IS NULL;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'No pipeline stage named "%" (lead_stage)', NEW.lead_stage;
        END IF;
        NEW.pipeline_stage_id := v_stage_id;
        NEW.status := CASE NEW.lead_stage
            WHEN 'Converted' THEN 'won'::lead_status
            WHEN 'Lost'      THEN 'lost'::lead_status
            WHEN 'On Hold'   THEN 'on_hold'::lead_status
            ELSE 'open'::lead_status
        END;
    END IF;

    IF NEW.lead_by_id IS NOT NULL THEN
        NEW.owner_id := NEW.lead_by_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_00_sync_stage ON leads;
CREATE TRIGGER trg_leads_00_sync_stage
    BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION fn_leads_sync_stage();

-- 4. Value checks (NOT VALID: enforced for new / changed rows only) -----------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_leads_lead_stage_values') THEN
        ALTER TABLE leads ADD CONSTRAINT ck_leads_lead_stage_values
            CHECK (lead_stage IN ('New','Contacted','Qualified','Converted','Lost','On Hold')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_leads_company_required') THEN
        ALTER TABLE leads ADD CONSTRAINT ck_leads_company_required
            CHECK (company_id IS NOT NULL) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_crm_fu_status_values') THEN
        ALTER TABLE crm_follow_ups ADD CONSTRAINT ck_crm_fu_status_values
            CHECK (status IN ('Pending','Overdue','Completed','Cancelled')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_crm_fu_type_values') THEN
        ALTER TABLE crm_follow_ups ADD CONSTRAINT ck_crm_fu_type_values
            CHECK (type IN ('Call','Email','WhatsApp','Meeting','Site Visit')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_crm_fu_outcome_values') THEN
        ALTER TABLE crm_follow_ups ADD CONSTRAINT ck_crm_fu_outcome_values
            CHECK (outcome IS NULL OR outcome IN ('Interested','Not interested','Call back later','Needs more information','No response')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_crm_comm_type_values') THEN
        ALTER TABLE crm_communications ADD CONSTRAINT ck_crm_comm_type_values
            CHECK (type IN ('Call','Email','WhatsApp','Meeting','Site Visit')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_crm_comm_outcome_values') THEN
        ALTER TABLE crm_communications ADD CONSTRAINT ck_crm_comm_outcome_values
            CHECK (outcome IS NULL OR outcome IN ('Interested','Not interested','Call back later','Needs more information','No response')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_crm_notes_type_values') THEN
        ALTER TABLE crm_lead_notes ADD CONSTRAINT ck_crm_notes_type_values
            CHECK (note_type IN ('General','Requirement','Budget','Readiness','Win','Lost')) NOT VALID;
    END IF;
END $$;

-- 5. Rule: a company can have only one open lead ------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS ux_leads_one_open_per_company
    ON leads (company_id)
    WHERE deleted_at IS NULL
      AND company_id IS NOT NULL
      AND lead_stage IN ('New','Contacted','Qualified','On Hold');

-- 6. Supporting indexes for the Leads list / Kanban / Follow-ups page ---------
CREATE INDEX IF NOT EXISTS ix_leads_stage_lead_by ON leads (lead_stage, lead_by_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_crm_fu_pending_due ON crm_follow_ups (follow_up_on) WHERE deleted_at IS NULL AND status IN ('Pending','Overdue');
CREATE INDEX IF NOT EXISTS ix_crm_comm_lead_date ON crm_communications (lead_id, communication_date DESC) WHERE deleted_at IS NULL;

-- 7. No hard deletes on CRM activity tables -----------------------------------
DO $$
DECLARE
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['crm_communications', 'crm_follow_ups', 'crm_lead_notes']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'trg_prevent_hard_delete_' || tbl, tbl);
        EXECUTE format('CREATE TRIGGER %I BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete()', 'trg_prevent_hard_delete_' || tbl, tbl);
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'trg_prevent_truncate_' || tbl, tbl);
        EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate()', 'trg_prevent_truncate_' || tbl, tbl);
    END LOOP;
END $$;

-- 8. Grants (only when the app roles exist, e.g. not on a bare local DB) ------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_app') THEN
        GRANT SELECT, INSERT, UPDATE ON crm_communications, crm_follow_ups, crm_lead_notes, crm_import_batches TO pulse_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_readonly') THEN
        GRANT SELECT ON crm_communications, crm_follow_ups, crm_lead_notes, crm_import_batches TO pulse_readonly;
    END IF;
END $$;

-- migrate:down
DROP TRIGGER IF EXISTS trg_prevent_truncate_crm_lead_notes ON crm_lead_notes;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_crm_lead_notes ON crm_lead_notes;
DROP TRIGGER IF EXISTS trg_prevent_truncate_crm_follow_ups ON crm_follow_ups;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_crm_follow_ups ON crm_follow_ups;
DROP TRIGGER IF EXISTS trg_prevent_truncate_crm_communications ON crm_communications;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_crm_communications ON crm_communications;

DROP INDEX IF EXISTS ix_crm_comm_lead_date;
DROP INDEX IF EXISTS ix_crm_fu_pending_due;
DROP INDEX IF EXISTS ix_leads_stage_lead_by;
DROP INDEX IF EXISTS ux_leads_one_open_per_company;

ALTER TABLE crm_lead_notes DROP CONSTRAINT IF EXISTS ck_crm_notes_type_values;
ALTER TABLE crm_communications DROP CONSTRAINT IF EXISTS ck_crm_comm_outcome_values;
ALTER TABLE crm_communications DROP CONSTRAINT IF EXISTS ck_crm_comm_type_values;
ALTER TABLE crm_follow_ups DROP CONSTRAINT IF EXISTS ck_crm_fu_outcome_values;
ALTER TABLE crm_follow_ups DROP CONSTRAINT IF EXISTS ck_crm_fu_type_values;
ALTER TABLE crm_follow_ups DROP CONSTRAINT IF EXISTS ck_crm_fu_status_values;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS ck_leads_company_required;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS ck_leads_lead_stage_values;

DROP TRIGGER IF EXISTS trg_leads_00_sync_stage ON leads;
DROP FUNCTION IF EXISTS fn_leads_sync_stage();
DROP TRIGGER IF EXISTS trg_leads_01_assign_code ON leads;
DROP FUNCTION IF EXISTS fn_leads_assign_code();
-- entity_counters row and the pipeline stages are left in place on purpose:
-- they are shared reference data and may already be referenced by leads.
