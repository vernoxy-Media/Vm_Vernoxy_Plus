-- migrate:up
-- =============================================================================
-- leads.next_follow_up_at  (BFD section 6: "Next follow-up first" sort, the
-- "Follow-up due" tag and filter, Kanban card F/U date).
--
-- It always equals the earliest Pending / Overdue follow-up of the lead and is
-- kept up to date by a trigger on crm_follow_ups, so the Leads list can sort and
-- filter on it without joining follow-ups. The application never writes it.
-- =============================================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

CREATE INDEX IF NOT EXISTS ix_leads_next_follow_up
    ON leads (next_follow_up_at) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION fn_leads_refresh_next_follow_up(p_lead_id integer)
RETURNS void AS $$
DECLARE
    v_next timestamptz;
BEGIN
    IF p_lead_id IS NULL THEN
        RETURN;
    END IF;
    SELECT MIN(follow_up_on) INTO v_next
    FROM crm_follow_ups
    WHERE lead_id = p_lead_id
      AND deleted_at IS NULL
      AND status IN ('Pending', 'Overdue');

    -- Only touch the lead when the value really changes (avoids needless updated_at bumps).
    UPDATE leads
    SET next_follow_up_at = v_next
    WHERE lead_id = p_lead_id
      AND next_follow_up_at IS DISTINCT FROM v_next;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_crm_follow_ups_sync_lead()
RETURNS trigger AS $$
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.lead_id IS NOT NULL THEN
        PERFORM fn_leads_refresh_next_follow_up(OLD.lead_id);
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.lead_id IS NOT NULL THEN
        PERFORM fn_leads_refresh_next_follow_up(NEW.lead_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_follow_ups_sync_lead ON crm_follow_ups;
CREATE TRIGGER trg_crm_follow_ups_sync_lead
    AFTER INSERT OR UPDATE OR DELETE ON crm_follow_ups
    FOR EACH ROW EXECUTE FUNCTION fn_crm_follow_ups_sync_lead();

-- Backfill for follow-ups that already exist.
UPDATE leads l
SET next_follow_up_at = f.next_at
FROM (
    SELECT lead_id, MIN(follow_up_on) AS next_at
    FROM crm_follow_ups
    WHERE lead_id IS NOT NULL AND deleted_at IS NULL AND status IN ('Pending', 'Overdue')
    GROUP BY lead_id
) f
WHERE l.lead_id = f.lead_id AND l.next_follow_up_at IS DISTINCT FROM f.next_at;

-- migrate:down
DROP TRIGGER IF EXISTS trg_crm_follow_ups_sync_lead ON crm_follow_ups;
DROP FUNCTION IF EXISTS fn_crm_follow_ups_sync_lead();
DROP FUNCTION IF EXISTS fn_leads_refresh_next_follow_up(integer);
DROP INDEX IF EXISTS ix_leads_next_follow_up;
ALTER TABLE leads DROP COLUMN IF EXISTS next_follow_up_at;
