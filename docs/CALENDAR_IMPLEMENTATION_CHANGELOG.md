# Google Calendar & Meeting Scheduling System - Implementation & Change Tracking Log

> **Branch**: `feature/krishna-Task-Management`  
> **Status**: Completed & Verified  
> **Date**: October 19, 2026  
> **Architecture**: Clean Hexagonal Architecture (Domain, Application, Infrastructure, Presentation)  

---

## 1. Overview of Changes

This implementation adds full **Google Calendar** functionality to Vernoxy Pulse for employees and administrators:
1. **Meeting Scheduling & Tracking**: Create and manage meetings with virtual meeting links (Google Meet, Zoom), venue/room locations, agendas, attendee invitations, and RSVP responses (Accepted, Declined, Tentative).
2. **Task Time-Blocking**: Direct integration between Tasks and Calendar. Users can drag/click active assigned tasks to schedule dedicated work blocks directly on the calendar.
3. **Google Calendar-Style Weekly Time Grid**:
   - Visual time slots from **8:00 AM to 10:00 PM** with subtle 30-minute intervals.
   - Live **horizontal red current-time marker line** with a pulsing dot on the current day's column.
   - Color-coded event blocks (Blue for Meetings, Purple for Task Time-Blocks, Emerald Green for Completed items).
   - "Join with Google Meet" quick launch button directly from the event detail card.
4. **Month View Switcher**: Instant switching between Week and Month grids.
5. **Dedicated Navigation**: Separated from Attendance. A dedicated **Calendar** item in the main Sidebar (`/calendar`) and streamlined Attendance page tabs (`/attendance`).

---

## 2. Database Changes & Migrations

### Migration File: `database/migrations/20261019100033_calendar_meetings.sql`

#### PostgreSQL Enums Created:
- `calendar_event_type`: `'meeting'`, `'task_block'`, `'appointment'`, `'reminder'`
- `calendar_event_status`: `'scheduled'`, `'in_progress'`, `'completed'`, `'cancelled'`
- `calendar_rsvp_status`: `'pending'`, `'accepted'`, `'declined'`, `'tentative'`

#### Tables Created:
1. **`calendar_events`**:
   - `event_id`: Integer Identity Primary Key
   - `event_type`: `calendar_event_type` NOT NULL DEFAULT `'meeting'`
   - `title`: `varchar(200)` NOT NULL
   - `description`: `text` NULL
   - `start_time`: `timestamptz` NOT NULL (indexed)
   - `end_time`: `timestamptz` NOT NULL (indexed)
   - `is_all_day`: `boolean` NOT NULL DEFAULT `false`
   - `location`: `varchar(255)` NULL
   - `meeting_link`: `varchar(500)` NULL
   - `status`: `calendar_event_status` NOT NULL DEFAULT `'scheduled'`
   - `task_id`: `integer` NULL REFERENCES `tasks(task_id)` ON DELETE SET NULL
   - `organizer_id`: `integer` NOT NULL REFERENCES `employees(emp_id)` ON DELETE RESTRICT
   - `row_version`: `integer` NOT NULL DEFAULT 1
   - `created_at`: `timestamptz` NOT NULL DEFAULT `clock_timestamp()`
   - `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`: Standard audit columns
   - Soft-delete rule: Partial index on active rows `WHERE deleted_at IS NULL`
   - Security triggers attached: `fn_prevent_hard_delete`, `fn_prevent_truncate`, `fn_handle_update_audit`
   - Permissions granted to `pulse_app`

2. **`calendar_event_attendees`**:
   - `attendee_id`: Integer Identity Primary Key
   - `event_id`: `integer` NOT NULL REFERENCES `calendar_events(event_id)` ON DELETE CASCADE
   - `employee_id`: `integer` NOT NULL REFERENCES `employees(emp_id)` ON DELETE CASCADE
   - `response_status`: `calendar_rsvp_status` NOT NULL DEFAULT `'pending'`
   - `is_optional`: `boolean` NOT NULL DEFAULT `false`
   - `responded_at`: `timestamptz` NULL
   - Unique constraint: `(event_id, employee_id)`
   - Security triggers attached: `fn_prevent_hard_delete`, `fn_prevent_truncate`
   - Permissions granted to `pulse_app`

---

## 3. Backend Implementation (`apps/api`)

### New Directory: `apps/api/src/modules/calendar`

| Layer | File Path | Description |
|---|---|---|
| **Domain Entities** | `domain/entities/calendar-event.entity.ts` | Defines `CalendarEventEntity`, `CalendarAttendeeEntity`, `UnscheduledTaskEntity`, and type unions. |
| **Domain Errors** | `domain/errors/calendar.errors.ts` | Defines `CalendarEventNotFoundError`, `CalendarPermissionDeniedError`, `InvalidEventTimeError`. |
| **Domain Ports** | `domain/ports/calendar.repository.port.ts` | Repository port interface (`CalendarRepositoryPort`) and input types. |
| **Application** | `application/use-cases/get-calendar-events.use-case.ts` | Fetches events in a given date range for an employee. |
| **Application** | `application/use-cases/create-calendar-event.use-case.ts` | Creates an event, links tasks/attendees, validates timing. |
| **Application** | `application/use-cases/update-calendar-event.use-case.ts` | Updates event details with organizer/admin permission checks. |
| **Application** | `application/use-cases/delete-calendar-event.use-case.ts` | Soft-deletes calendar events. |
| **Application** | `application/use-cases/respond-rsvp.use-case.ts` | Updates attendee RSVP status (`accepted`, `declined`, `tentative`). |
| **Application** | `application/use-cases/get-unscheduled-tasks.use-case.ts` | Fetches active assigned tasks that are ready for calendar time-blocking. |
| **Infrastructure** | `infrastructure/repositories/prisma-calendar.repository.ts` | Prisma-backed repository implementation mapping DB queries to domain entities. |
| **Presentation** | `presentation/dto/create-calendar-event.dto.ts` | Swagger & Class-Validator DTO for event creation. |
| **Presentation** | `presentation/dto/update-calendar-event.dto.ts` | DTO for updating events. |
| **Presentation** | `presentation/dto/rsvp.dto.ts` | DTO for RSVP response. |
| **Presentation** | `presentation/dto/calendar-event.dto.ts` | Response DTOs and query parameter DTOs. |
| **Presentation** | `presentation/calendar-error.mapper.ts` | Maps domain errors to NestJS HTTP exceptions. |
| **Presentation** | `presentation/controllers/calendar.controller.ts` | REST endpoints for events, RSVPs, and unscheduled tasks. |
| **Module & Wiring**| `calendar.module.ts` | NestJS module registering use cases and repository provider. |
| **Public API** | `public-api.ts` | Barrel exports adhering strictly to dependency cruiser rules. |

### Modified Files in `apps/api`:
1. `apps/api/prisma/schema.prisma`: Introspected `calendar_events` and `calendar_event_attendees` models.
2. `apps/api/src/app.module.ts`: Imported and registered `CalendarModule`.

---

## 4. Frontend Implementation (`apps/web`)

### New Directory: `apps/web/src/features/calendar`

| Component / File | File Path | Description |
|---|---|---|
| **Types** | `types.ts` | TypeScript interfaces for `CalendarEvent`, `CalendarAttendee`, `UnscheduledTask`, and payloads. |
| **API Client** | `api/calendar.api.ts` | `customFetch` calls to backend endpoints with error handling. |
| **Weekly Grid** | `components/WeeklyTimeGrid.tsx` | Interactive 8 AM – 10 PM Google Calendar week grid with real-time red indicator line and event blocks. |
| **Month Grid** | `components/MonthGrid.tsx` | Month overview grid showing daily events and chips. |
| **Task Tray** | `components/UnscheduledTasksTray.tsx` | Collapsible sidebar of unscheduled tasks with "Schedule" action buttons. |
| **Event Modal** | `components/EventModal.tsx` | Modal for creating meetings or time-blocking tasks with Meet link generator. |
| **Detail Modal** | `components/EventDetailModal.tsx` | Event view popup with "Join with Google Meet", RSVP buttons, attendee status list, and delete option. |
| **Calendar Page**| `pages/CalendarPage.tsx` | Top-level calendar view with week/month toggling, date navigation, and TanStack query caching. |

### Modified Files in `apps/web`:
1. `apps/web/src/App.tsx`:
   - Added `/calendar` route mounting `<CalendarPage />` inside `<ProtectedRoute>` and `<AppLayout fluid>`.
2. `apps/web/src/components/Sidebar.tsx`:
   - Updated `Calendar` navigation item to point directly to `/calendar`.
3. `apps/web/src/features/attendance/components/AttendanceNavTabs.tsx`:
   - Removed the redundant calendar tab so Attendance is focused on timesheet and dashboard.

---

## 5. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/calendar/events?start=...&end=...` | Get events within the specified time window for current user. |
| `POST` | `/api/v1/calendar/events` | Create a new meeting or task time-block. |
| `PATCH` | `/api/v1/calendar/events/:id` | Update meeting details, timing, or attendees. |
| `DELETE` | `/api/v1/calendar/events/:id` | Soft-delete a calendar event (organizer or admin). |
| `POST` | `/api/v1/calendar/events/:id/rsvp` | Submit RSVP status (`accepted`, `declined`, `tentative`). |
| `GET` | `/api/v1/calendar/unscheduled-tasks` | Get assigned tasks available for time-blocking. |

---

## 6. Verification & Quality Checks Passed

- **Database Migration**: Applied cleanly via `pnpm db:migrate`.
- **Prisma Client Generation**: Updated via `pnpm db:generate`.
- **API Unit & E2E Tests**: Ran test suites (`pnpm --filter @vernoxy-pulse/api test`) — **123 of 123 tests passed**.
- **Architecture Check**: Ran `pnpm arch:check` — **0 violations found** (369 modules cruised).
- **TypeScript Compilation**:
  - API: `pnpm exec tsc -p apps/api/tsconfig.json --noEmit` — **0 errors**.
  - Web: `pnpm --filter @vernoxy-pulse/web exec tsc --noEmit` — **0 errors**.

---

## 7. Bugfixes & Refinements

### Timezone Offset Day Shift Fix (`date-utils.ts`)
- **Issue**: Clicking on a column (e.g. 20 Oct) caused the Schedule modal to show 19 Oct because `dayDate.toISOString().slice(0, 10)` converted local midnight (`00:00:00` in UTC+5:30) to UTC (`18:30:00Z` of previous day), producing `2026-10-19`.
- **Fix**: Added `date-utils.ts` with `formatLocalDate(d)` and `getLocalToday()`, which extract year, month, and day in the user's local timezone. Updated `WeeklyTimeGrid.tsx`, `MonthGrid.tsx`, `CalendarPage.tsx`, and `EventModal.tsx` to use local date formatting.

---

## 8. Calendar Day Statuses, Holidays, and Weekoffs Color Coding

Implemented full day classification on both Week and Month calendar views:
- **Holidays &rarr; Red**: Marked in Red (`bg-rose-500 text-white` day number pill, `border-t-4 border-t-rose-500` column header, soft red background tint, and holiday name tag).
- **Completed Days &rarr; Green**: Past working days marked as complete in Green (`bg-emerald-600 text-white` day number pill, "✓ Complete" badge chip, soft emerald tint).
- **Today &rarr; Blue**: Marked in Blue (`bg-blue-600 text-white` day number pill, `border-t-4 border-t-blue-600` header, "Today" badge chip, soft blue column tint, and live horizontal blue indicator line with pulsing dot at current time).
- **Upcoming Working Days &rarr; Grey**: Future working days marked in Grey (`bg-slate-200 text-slate-700` day number pill, "Upcoming" badge chip, crisp white column).
- **Week Offs &rarr; Muted Slate**: Non-working days (e.g. Saturday/Sunday) marked with "Week Off" badge chip and soft slate background tint.
- **Calendar Status Legend**: Added `CalendarStatusLegend.tsx` component bar above the grid for clear visual reference.

---

## 9. Real Employee Attendance-Driven Statuses (Leave & Absent in Orange)

Connected the Calendar directly to the employee's personal attendance records via `useAttendanceDashboard`:
- **Leave &rarr; Orange**: When an employee is approved for leave (`record.status === 'leave'`), the day is marked in Orange with the leave type name (e.g. `Casual Leave` or `On Leave`).
- **Absent &rarr; Orange**: When an employee was absent on a past working day (`record.status === 'absent'` or past working day without attendance/punch-in), the day is marked in Orange with an `Absent` badge.
- **Present / Complete &rarr; Green**: When the employee actually marked attendance and was present (`record.status === 'present'` / `half_day` / `short`), the day is marked in Green with a `✓ Done` badge.
- **Holidays &rarr; Red**: Company holidays marked in Red with the holiday title.
- **Today &rarr; Blue**: Current active day marked in Blue with `Today` badge and real-time blue indicator line.
- **Upcoming Working Days &rarr; Grey**: Future working days marked in Grey with `Upcoming` badge.
- **Week Offs &rarr; Muted Slate**: Company non-working days (e.g. Saturday/Sunday) marked with `Week Off` badge.

---

## 10. Attendance Settings Working Days Card Holiday Awareness

- **Issue**: In the Attendance Settings page (`/admin/attendance-settings`), the "Working & Work Off Days" component displayed the current week's dates (e.g. `Tue Oct 20`) alongside standard recurring weekday toggles. When an official holiday was added on that date (e.g. `Dussera` on Oct 20), the card previously ignored the holiday list and showed `Working` based solely on the recurring weekday schedule.
- **Fix**:
  - Updated [AttendanceWorkingDaysCard.tsx](file:///d:/Desktop/vernoxy_pulse/apps/web/src/pages/admin/settings/attendance/AttendanceWorkingDaysCard.tsx) to accept `holidays={data.holidays}`.
  - Linked `getWeekDateInfo(dow)` to cross-reference each weekday against the company's official holiday registry.
  - When an official holiday falls on a day during the current week (e.g. Oct 20), the day card is highlighted in **Red/Rose** with a `Holiday: Dussera` badge, and an alert badge in the header shows `{n} Holiday this week`.
  - Updated [AttendanceSettingsPage.tsx](file:///d:/Desktop/vernoxy_pulse/apps/web/src/pages/admin/AttendanceSettingsPage.tsx) and [SettingsAttendanceSection.tsx](file:///d:/Desktop/vernoxy_pulse/apps/web/src/pages/admin/settings/SettingsAttendanceSection.tsx) to pass `holidays={data.holidays}`.

---

## 11. Attendance Dashboard Complete UI Overhaul

Redesigned the entire Attendance dashboard (`/attendance`) to adhere to modern design aesthetics, glassmorphism, harmonious color palettes, clean typography, and balanced layout:

1. **Timesheet Card & Timer (`TimesheetCard.tsx`, `TickingWorkedTimer.tsx`, `ProgressRing.tsx`)**:
   - Upgraded `ProgressRing` with SVG linear gradients (`#2563eb` &rarr; `#4f46e5` for working, amber/orange for break, emerald for done) and smooth animations.
   - Replaced plain text timer with prominent tabular numerals, glowing live shift indicators, and modern pill status badges with pulsing ping dots.
   - Redesigned "Punch In Status" into a sleek status pill featuring clock icons and active shift chips.
   - Transformed footer break/target metrics into two elevated mini-stat cards with icons (`Coffee`, `Target`).

2. **Action Buttons (`TimesheetActionButtons.tsx`)**:
   - Replaced flat buttons with rich, ergonomic gradient buttons with subtle drop shadows and active press states:
     - Punch In: Emerald gradient (`from-emerald-600 via-emerald-500 to-teal-600`) with subtle green shadow.
     - Punch Out: Rose gradient (`from-rose-600 via-rose-500 to-red-600`) with subtle red shadow.
     - Take Break: Amber gradient (`from-amber-500 via-amber-500 to-orange-500`) with subtle amber shadow.
     - Resume Work: Blue gradient (`from-blue-600 via-indigo-600 to-blue-700`) with subtle blue shadow.

3. **Today's Activity Card (`TodayActivityCard.tsx`)**:
   - Modernized the timeline from hollow circles into an activity stream with custom icon nodes (`LogIn` in emerald, `Coffee` in amber, `Play` in blue, `LogOut` in rose).
   - Added smooth gradient vertical connector line and event cards with monospace timestamps.
   - Enhanced the active break notice with high-visibility amber pulse card.
   - Replaced static footer with live status indicators and real-time event counts.

4. **Work Statistics Card (`StatisticsCard.tsx`, `ProgressStatRow.tsx`)**:
   - Added distinct icons and tailored color gradients for each metric (Today: Emerald/Teal, This Week: Blue/Indigo, This Month: Indigo/Violet, Remaining: Amber/Orange, Overtime: Rose/Pink).
   - Added percentage completion pill badges (e.g. `53%`).
   - Cleaned up metric rows with font-mono values and rounded progress tracks.

5. **Attendance Records Table (`AttendanceListCard.tsx`, `AttendanceTableRow.tsx`, `AttendanceMobileCard.tsx`)**:
   - Fixed `S.No` clipping and alignment: 2-digit numbers are neatly padded (`#01`, `#02`, `#17`) and centered.
   - Fixed Date column wrapping: date and day of week are cleanly aligned on one line without awkward multi-line breaks.
   - Fixed `Action` column header truncation: allocated proper min-widths across all columns so `Action` is never cut off to `ACT`.
   - Replaced raw text "Working..." with an active pulse badge (`Working` with green ping dot).
   - Upgraded Day Status badges (`DayStatusBadge.tsx`) with soft tinted backgrounds, subtle matching borders, and icons.
   - Replaced plain table totals row with an elevated summary banner featuring production and break stat chips.

6. **Month Overview Card (`MonthDetailsCard.tsx`, `MonthDistributionBar.tsx`)**:
   - Resolved the vertical height imbalance where the card stretched excessively long compared to the table.
   - Added an integrated **Attendance Rate circular progress gauge** with "On Track" / "Needs Focus" status pills.
   - Reorganized the 6 metrics into a compact, symmetrical **2-column grid of mini stat tiles** with tinted icons and tooltips.
   - Upgraded the Workdays Distribution bar with rounded pill segments and clear legend indicators.

7. **Navigation Tabs (`AttendanceNavTabs.tsx`)**:
   - Redesigned the navigation bar into a modern segmented pill control with subtle elevation.

8. **Gridlines & Border Definition**:
   - Added explicit vertical cell dividers (`border-r border-slate-200`) and horizontal row borders (`border-b border-slate-200`) to the Attendance table.
   - Enhanced container borders across all cards and inner stat tiles (`border border-slate-200` / `border border-slate-300`, `shadow-sm`) to ensure clear visual separation and distinct grid layout.

---

## 12. Layout Width & Sidebar Gap Adjustment

- **Issue**: The Settings page (`/admin/settings/:sectionId`) and Profile page displayed an excessive 350px empty void between the left sidebar and the page content on wide monitors. This occurred because `AppLayout` previously defaulted to `fluid={false}` (capping content at `max-w-page-form` / 960px) and centered it with `mx-auto`.
- **Fix**:
  - Updated [AppLayout.tsx](file:///d:/Desktop/vernoxy_pulse/apps/web/src/components/AppLayout.tsx) to default `fluid = true`, removed the artificial `mx-auto` centering push, and allowed content to cleanly align with the top navigation header (`px-4 sm:px-6 lg:px-8` from the sidebar).
  - Updated [AdminLayout.tsx](file:///d:/Desktop/vernoxy_pulse/apps/web/src/components/AdminLayout.tsx) to default `fluid = true`.
  - Updated [SettingsPage.tsx](file:///d:/Desktop/vernoxy_pulse/apps/web/src/pages/admin/settings/SettingsPage.tsx) and [HomePage.tsx](file:///d:/Desktop/vernoxy_pulse/apps/web/src/pages/HomePage.tsx) to explicitly pass `fluid={true}`.
  - All dashboards and pages across the application now expand comfortably across the available screen width with consistent 32px spacing next to the sidebar.


