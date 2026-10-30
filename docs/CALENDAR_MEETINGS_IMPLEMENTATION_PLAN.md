# Google Calendar & Meeting Scheduling System
## Architecture & Implementation Plan

This document outlines the end-to-end design, database schema, API contracts, and frontend architecture for the **Google Calendar & Meeting Scheduling System** in Vernoxy Pulse.

---

## 1. Executive Summary

The system enables employees and administrators to:
1. **Schedule & Track Meetings**: Create one-time or recurring meetings, invite colleagues, set Google Meet/Zoom links, track RSVPs (Accepted, Declined, Tentative), and view attendance/meeting schedules.
2. **Time-Block Tasks (Task Scheduling)**: Drag tasks from an "Unscheduled Tasks" tray directly onto a weekly calendar time grid (e.g. Wednesday 10:00 AM – 11:30 AM), linking tasks to specific time slots.
3. **Google Calendar-Style Weekly Time Grid**:
   - Visual time slots from **8:00 AM to 10:00 PM** (configurable).
   - Live **horizontal red current-time indicator line** across the current day column.
   - Distinct color-coded blocks (Meetings = Blue, Tasks = Purple/Stage-colored, Completed = Emerald Green).
   - Click-to-create and drag-to-reschedule capabilities.

---

## 2. Database Schema & Migration Changes

### Required Migration: `20261019100033_calendar_meetings.sql`

```sql
-- migrate:up

-- 1. Enums
CREATE TYPE calendar_event_type AS ENUM ('meeting', 'task_block', 'appointment', 'reminder');
CREATE TYPE calendar_event_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE calendar_rsvp_status AS ENUM ('pending', 'accepted', 'declined', 'tentative');

-- 2. Calendar Events Table
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
    meeting_link varchar(500) NULL, -- e.g. https://meet.google.com/xyz or Zoom URL
    
    -- Status & Relationships
    status calendar_event_status NOT NULL DEFAULT 'scheduled',
    task_id integer NULL, -- Optional FK to tasks(task_id) for task time-blocking
    organizer_id integer NOT NULL, -- FK to employees(emp_id): creator / host
    
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

-- Safety triggers
CREATE TRIGGER trg_prevent_hard_delete_calendar_events
    BEFORE DELETE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_calendar_events
    BEFORE TRUNCATE ON calendar_events
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_calendar_events
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- 3. Calendar Event Attendees (Meeting Invites & RSVPs)
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

-- migrate:down
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
```

---

## 3. Backend Module (`apps/api/src/modules/calendar`)

### Module Structure
```
apps/api/src/modules/calendar/
├── calendar.module.ts
├── domain/
│   ├── entities/
│   │   ├── calendar-event.entity.ts
│   │   └── calendar-attendee.entity.ts
│   └── ports/
│       └── calendar.repository.port.ts
├── application/
│   ├── use-cases/
│   │   ├── get-calendar-events.use-case.ts
│   │   ├── create-calendar-event.use-case.ts
│   │   ├── update-calendar-event.use-case.ts
│   │   ├── delete-calendar-event.use-case.ts
│   │   ├── respond-rsvp.use-case.ts
│   │   └── get-unscheduled-tasks.use-case.ts
│   └── dto/
│       └── calendar-query.dto.ts
├── infrastructure/
│   └── repositories/
│       └── prisma-calendar.repository.ts
└── presentation/
    ├── controllers/
    │   └── calendar.controller.ts
    ├── dto/
    │   ├── create-calendar-event.dto.ts
    │   ├── update-calendar-event.dto.ts
    │   ├── rsvp.dto.ts
    │   └── calendar-event-response.dto.ts
    └── calendar-error.mapper.ts
```

### Key API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/calendar/events?start=...&end=...` | Fetches all events where user is organizer or attendee |
| `POST` | `/api/v1/calendar/events` | Creates a new meeting or task time-block with attendees |
| `GET` | `/api/v1/calendar/events/:id` | Returns single event details with full attendee RSVP list |
| `PATCH` | `/api/v1/calendar/events/:id` | Updates time slots (rescheduling via drag) or details |
| `DELETE` | `/api/v1/calendar/events/:id` | Soft-deletes or cancels a meeting/task block |
| `POST` | `/api/v1/calendar/events/:id/rsvp` | Attendee RSVP response (`accepted`, `declined`, `tentative`) |
| `GET` | `/api/v1/calendar/unscheduled-tasks` | Retrieves open tasks assigned to employee ready for scheduling |

---

## 4. Frontend Architecture (`apps/web/src/features/calendar`)

### UI Components
```
apps/web/src/features/calendar/
├── pages/
│   └── CalendarPage.tsx             # Main view combining navigation, grid, and side-drawer
├── components/
│   ├── CalendarHeader.tsx           # Today button, < > nav, view selector (Week/Day/Month)
│   ├── WeeklyTimeGrid.tsx           # 7-day columns + hourly time rows (8 AM – 10 PM)
│   ├── CurrentTimeIndicator.tsx     # Live red horizontal bar with pulsating dot
│   ├── CalendarEventCard.tsx        # Event block with title, time, link, avatars, status
│   ├── UnscheduledTasksTray.tsx     # Draggable task cards to drag onto the time grid
│   ├── EventDetailModal.tsx         # View event, click "Join with Google Meet", RSVP buttons
│   └── CreateEventDrawer.tsx        # Slide-over form (matching user's screenshot)
├── hooks/
│   ├── use-calendar-events.ts       # React Query hooks for fetching and optimistic caching
│   └── use-current-time-marker.ts   # Updates time indicator every 60s
└── utils/
    ├── event-layout.ts              # Calculates overlapping column layout (Google Calendar algorithm)
    └── date-helpers.ts              # Week start/end, timezone, and duration calculations
```

### Visual Experience (Matches Google Calendar Screenshot)
1. **Week Grid**:
   - Column per day (Sunday through Saturday or Monday start).
   - Time row markers from **8 AM to 10 PM** with subtle divider lines.
   - Active day header highlighted with a blue circle badge (e.g. `Mon 19`).
2. **Current Time Red Line**:
   - Updates every minute.
   - Spans horizontally across the current day column with a small red circle indicator on the left axis.
3. **Task & Meeting Styling**:
   - **Meetings**: Solid blue background (`bg-blue-600/90 hover:bg-blue-700 text-white`) with video icon & attendee avatars.
   - **Task Blocks**: Purple / Indigo background (`bg-indigo-600/90 text-white`) with task code badge.
   - **Completed**: Emerald green (`bg-emerald-600/90 text-white`) with checkmark icon.
4. **Interactive Drag & Drop**:
   - Click any empty slot to open quick-creation modal.
   - Drag an existing event block vertically to change its time.
   - Drag an unscheduled task from the left tray to place it into an open slot.

---

## 5. Rollout Checklist

- [ ] **Step 1: Database Migration**: Run dbmate up for `20261019100033_calendar_meetings.sql`.
- [ ] **Step 2: Prisma Sync**: Run `pnpm db:pull` and `pnpm db:generate`.
- [ ] **Step 3: Backend Implementation**: Create `CalendarModule` in NestJS with clean architecture.
- [ ] **Step 4: Frontend Implementation**: Build Google Calendar weekly grid and scheduling drawer.
- [ ] **Step 5: Testing & Verification**: Unit tests, SQL tests, architecture cruise, and dev verification.
