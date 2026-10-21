-- migrate:up

-- 1. Enums
CREATE TYPE calendar_event_type AS ENUM ('meeting', 'task_block', 'appointment', 'reminder');
CREATE TYPE calendar_event_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE calendar_rsvp_status AS ENUM ('pending', 'accepted', 'declined', 'tentative');

-- 2. calendar_events
CREATE TABLE calendar_events (
    event_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type calendar_event_type NOT NULL DEFAULT 'meeting',
    title varchar(200) NOT NULL,
    description text NULL,
    
    -- Exact timing for calendar grid
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    is_all_day boolean NOT NULL DEFAULT false,
    
    -- Location & Virtual Links
    location varchar(255) NULL,
    meeting_link varchar(500) NULL,
    
    -- Status & Relationships
    status calendar_event_status NOT NULL DEFAULT 'scheduled',
    task_id integer NULL,
    organizer_id integer NOT NULL,
    
    -- Audit & Soft Delete
    row_version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,

    CONSTRAINT fk_calendar_events_task FOREIGN KEY (task_id) REFERENCES tasks(task_id),
    CONSTRAINT fk_calendar_events_organizer FOREIGN KEY (organizer_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_calendar_events_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_calendar_events_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_calendar_events_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_calendar_events_time CHECK (end_time > start_time),
    CONSTRAINT ck_calendar_events_title_non_blank CHECK (length(btrim(title)) >= 1),
    CONSTRAINT ck_calendar_events_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

CREATE INDEX ix_calendar_events_range 
    ON calendar_events (start_time, end_time) 
    WHERE deleted_at IS NULL;

CREATE INDEX ix_calendar_events_organizer 
    ON calendar_events (organizer_id, start_time) 
    WHERE deleted_at IS NULL;

CREATE INDEX ix_calendar_events_task 
    ON calendar_events (task_id) 
    WHERE task_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_prevent_hard_delete_calendar_events
    BEFORE DELETE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_calendar_events
    BEFORE TRUNCATE ON calendar_events
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_calendar_events
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- 3. calendar_event_attendees
CREATE TABLE calendar_event_attendees (
    attendee_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id integer NOT NULL,
    employee_id integer NOT NULL,
    response_status calendar_rsvp_status NOT NULL DEFAULT 'pending',
    is_optional boolean NOT NULL DEFAULT false,
    responded_at timestamptz NULL,
    
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,

    CONSTRAINT fk_attendees_event FOREIGN KEY (event_id) REFERENCES calendar_events(event_id),
    CONSTRAINT fk_attendees_employee FOREIGN KEY (employee_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendees_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendees_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_attendees_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_attendees_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

CREATE UNIQUE INDEX ux_attendees_event_employee 
    ON calendar_event_attendees (event_id, employee_id) 
    WHERE deleted_at IS NULL;

CREATE INDEX ix_attendees_employee 
    ON calendar_event_attendees (employee_id, event_id) 
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_prevent_hard_delete_calendar_event_attendees
    BEFORE DELETE ON calendar_event_attendees
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_calendar_event_attendees
    BEFORE TRUNCATE ON calendar_event_attendees
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_calendar_event_attendees
    BEFORE UPDATE ON calendar_event_attendees
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- 4. Grants for pulse_app
GRANT SELECT, INSERT, UPDATE ON
    calendar_events,
    calendar_event_attendees
TO pulse_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;

-- migrate:down
REVOKE SELECT, INSERT, UPDATE ON
    calendar_events,
    calendar_event_attendees
FROM pulse_app;

DROP TRIGGER IF EXISTS trg_handle_update_audit_calendar_event_attendees ON calendar_event_attendees;
DROP TRIGGER IF EXISTS trg_prevent_truncate_calendar_event_attendees ON calendar_event_attendees;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_calendar_event_attendees ON calendar_event_attendees;
DROP TABLE IF EXISTS calendar_event_attendees;

DROP TRIGGER IF EXISTS trg_handle_update_audit_calendar_events ON calendar_events;
DROP TRIGGER IF EXISTS trg_prevent_truncate_calendar_events ON calendar_events;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_calendar_events ON calendar_events;
DROP TABLE IF EXISTS calendar_events;

DROP TYPE IF EXISTS calendar_rsvp_status;
DROP TYPE IF EXISTS calendar_event_status;
DROP TYPE IF EXISTS calendar_event_type;
