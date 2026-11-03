-- migrate:up
-- =============================================================================
-- Follow-ups at run time (BFD section 7, Parts 3 to 6)
--
--   reminder_sent_at / overdue_notified_at
--       let the background job claim each follow-up exactly once, even when two
--       servers run the job at the same moment.
--   completed_communication_id
--       "Completing a follow-up records what happened ... saved as a conversation
--       on the lead": the link from the follow-up to that conversation.
--   calendar_event_id
--       "Every pending follow-up appears in the Calendar of the Assigned to user":
--       the Calendar event that mirrors the follow-up.
--
-- Completed needs Done on and Cancelled needs a reason; the checks are NOT VALID so
-- they apply to every new or changed row without touching existing data.
-- =============================================================================

ALTER TABLE crm_follow_ups
    ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
    ADD COLUMN IF NOT EXISTS overdue_notified_at timestamptz,
    ADD COLUMN IF NOT EXISTS completed_communication_id integer,
    ADD COLUMN IF NOT EXISTS calendar_event_id integer;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_crm_fu_completed_communication') THEN
        ALTER TABLE crm_follow_ups ADD CONSTRAINT fk_crm_fu_completed_communication
            FOREIGN KEY (completed_communication_id) REFERENCES crm_communications(communication_id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_crm_fu_calendar_event') THEN
        ALTER TABLE crm_follow_ups ADD CONSTRAINT fk_crm_fu_calendar_event
            FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(event_id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_crm_fu_completed_has_done_on') THEN
        ALTER TABLE crm_follow_ups ADD CONSTRAINT ck_crm_fu_completed_has_done_on
            CHECK (status <> 'Completed' OR done_on IS NOT NULL) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_crm_fu_cancelled_has_reason') THEN
        ALTER TABLE crm_follow_ups ADD CONSTRAINT ck_crm_fu_cancelled_has_reason
            CHECK (status <> 'Cancelled' OR (reason IS NOT NULL AND btrim(reason) <> '')) NOT VALID;
    END IF;
END $$;

-- Job scans: due reminders, newly overdue, and follow-ups that still need a Calendar event.
CREATE INDEX IF NOT EXISTS ix_crm_fu_reminder_due
    ON crm_follow_ups (follow_up_on)
    WHERE deleted_at IS NULL AND status = 'Pending' AND reminder_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_crm_fu_needs_calendar
    ON crm_follow_ups (follow_up_id)
    WHERE deleted_at IS NULL AND status IN ('Pending', 'Overdue') AND calendar_event_id IS NULL;

CREATE INDEX IF NOT EXISTS ix_crm_fu_calendar_event
    ON crm_follow_ups (calendar_event_id) WHERE calendar_event_id IS NOT NULL;

-- The Follow-ups page filters by who it is assigned to and by tab (status + date).
CREATE INDEX IF NOT EXISTS ix_crm_fu_assigned_due
    ON crm_follow_ups (assigned_to, follow_up_on) WHERE deleted_at IS NULL;

-- migrate:down
DROP INDEX IF EXISTS ix_crm_fu_assigned_due;
DROP INDEX IF EXISTS ix_crm_fu_calendar_event;
DROP INDEX IF EXISTS ix_crm_fu_needs_calendar;
DROP INDEX IF EXISTS ix_crm_fu_reminder_due;
ALTER TABLE crm_follow_ups DROP CONSTRAINT IF EXISTS ck_crm_fu_cancelled_has_reason;
ALTER TABLE crm_follow_ups DROP CONSTRAINT IF EXISTS ck_crm_fu_completed_has_done_on;
ALTER TABLE crm_follow_ups DROP CONSTRAINT IF EXISTS fk_crm_fu_calendar_event;
ALTER TABLE crm_follow_ups DROP CONSTRAINT IF EXISTS fk_crm_fu_completed_communication;
ALTER TABLE crm_follow_ups
    DROP COLUMN IF EXISTS calendar_event_id,
    DROP COLUMN IF EXISTS completed_communication_id,
    DROP COLUMN IF EXISTS overdue_notified_at,
    DROP COLUMN IF EXISTS reminder_sent_at;
