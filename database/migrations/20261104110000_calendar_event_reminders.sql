-- migrate:up
-- Which meeting reminders were already sent to whom, so a reminder is shown once even with several tabs or devices open.
CREATE TABLE IF NOT EXISTS calendar_event_reminders (
    event_id integer     NOT NULL REFERENCES calendar_events (event_id),
    emp_id   integer     NOT NULL REFERENCES employees (emp_id),
    kind     varchar(10) NOT NULL CHECK (kind IN ('before', 'start')),
    sent_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (event_id, emp_id, kind)
);

-- migrate:down
DROP TABLE IF EXISTS calendar_event_reminders;
