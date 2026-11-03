-- migrate:up
-- =============================================================================
-- Clients (BFD section 9: Won and Convert to Client)
--
-- A client is the company after its lead was won. The company record is the same one
-- (clients.company_id); contacts, communication and notes stay on it and on the lead
-- it came from, so nothing is copied and nothing is lost.
--
--   * Client ID  CLI-0019  from entity_counters, never reused (also after a reversal).
--   * One active client per company: a client that gets a new lead for more work and
--     wins it keeps the same Client ID.
--   * leads.converted_client_id  "The lead shows Converted to CLI-0019".
--   * clients.converted_from_lead_id  "The client shows Converted from LEAD-0057".
--
-- Client Management and Project Management take over from here (separate documents).
-- =============================================================================

CREATE TABLE IF NOT EXISTS clients (
    client_id integer GENERATED ALWAYS AS IDENTITY,
    -- Filled by trg_clients_01_assign_code; the CHECK below runs after that trigger, so it can never stay empty.
    client_code varchar(50),
    company_id integer NOT NULL,
    converted_from_lead_id integer,
    won_on date NOT NULL,
    win_note text NOT NULL,
    -- "The Lead By user is shown as the client owner."
    owner_id integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    reversed_reason text,
    CONSTRAINT pk_clients PRIMARY KEY (client_id),
    CONSTRAINT fk_clients_company_id FOREIGN KEY (company_id) REFERENCES companies(company_id),
    CONSTRAINT fk_clients_converted_from_lead FOREIGN KEY (converted_from_lead_id) REFERENCES leads(lead_id),
    CONSTRAINT fk_clients_owner_id FOREIGN KEY (owner_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_clients_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_clients_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_clients_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_clients_win_note_non_blank CHECK (length(btrim(win_note)) > 0),
    CONSTRAINT ck_clients_code_present CHECK (client_code IS NOT NULL),
    CONSTRAINT ck_clients_code_format CHECK (client_code ~ '^CLI-[0-9]{4,}$'),
    CONSTRAINT ck_clients_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- A Client ID is never given twice (a reversed client keeps its number in history).
CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_client_code ON clients (client_code);
-- One active client per company.
CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_one_active_per_company ON clients (company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_clients_owner ON clients (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_clients_converted_from_lead ON clients (converted_from_lead_id);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_client_id integer;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leads_converted_client') THEN
        ALTER TABLE leads ADD CONSTRAINT fk_leads_converted_client
            FOREIGN KEY (converted_client_id) REFERENCES clients(client_id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS ix_leads_converted_client ON leads (converted_client_id) WHERE converted_client_id IS NOT NULL;

-- Client ID: CLI-0001, CLI-0002 ... (continues after any CLI-nnnn client_code already on a company).
INSERT INTO entity_counters (entity_type, counter_key, last_number)
SELECT 'CLIENT', 'GLOBAL',
       GREATEST(
           COALESCE((SELECT MAX(substring(client_code FROM 5)::integer) FROM companies WHERE client_code ~ '^CLI-[0-9]{1,9}$'), 0),
           COALESCE((SELECT MAX(substring(client_code FROM 5)::integer) FROM clients WHERE client_code ~ '^CLI-[0-9]{1,9}$'), 0)
       )
ON CONFLICT (entity_type, counter_key) DO NOTHING;

CREATE OR REPLACE FUNCTION fn_clients_assign_code()
RETURNS trigger AS $$
DECLARE
    v_next integer;
BEGIN
    IF NEW.client_code IS NULL OR btrim(NEW.client_code) = '' THEN
        INSERT INTO entity_counters (entity_type, counter_key, last_number)
        VALUES ('CLIENT', 'GLOBAL', 1)
        ON CONFLICT (entity_type, counter_key)
        DO UPDATE SET last_number = entity_counters.last_number + 1
        RETURNING last_number INTO v_next;
        NEW.client_code := 'CLI-' || lpad(v_next::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_01_assign_code ON clients;
CREATE TRIGGER trg_clients_01_assign_code
    BEFORE INSERT ON clients
    FOR EACH ROW EXECUTE FUNCTION fn_clients_assign_code();

-- Same safety rules as the other core tables: no hard deletes, immutable created_*, updated_at maintained.
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_clients ON clients;
CREATE TRIGGER trg_prevent_hard_delete_clients BEFORE DELETE ON clients
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();
DROP TRIGGER IF EXISTS trg_prevent_truncate_clients ON clients;
CREATE TRIGGER trg_prevent_truncate_clients BEFORE TRUNCATE ON clients
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();
DROP TRIGGER IF EXISTS trg_handle_update_audit_clients ON clients;
CREATE TRIGGER trg_handle_update_audit_clients BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_app') THEN
        GRANT SELECT, INSERT, UPDATE ON clients TO pulse_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_readonly') THEN
        GRANT SELECT ON clients TO pulse_readonly;
    END IF;
END $$;

-- migrate:down
DROP TRIGGER IF EXISTS trg_handle_update_audit_clients ON clients;
DROP TRIGGER IF EXISTS trg_prevent_truncate_clients ON clients;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_clients ON clients;
DROP TRIGGER IF EXISTS trg_clients_01_assign_code ON clients;
DROP FUNCTION IF EXISTS fn_clients_assign_code();
DROP INDEX IF EXISTS ix_leads_converted_client;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS fk_leads_converted_client;
ALTER TABLE leads DROP COLUMN IF EXISTS converted_client_id;
DROP TABLE IF EXISTS clients;
-- The entity_counters row stays: Client IDs are never reused.
