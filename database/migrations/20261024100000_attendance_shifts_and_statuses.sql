-- migrate:up

-- 1. Create attendance_statuses table
CREATE TABLE attendance_statuses (
    status_id integer GENERATED ALWAYS AS IDENTITY,
    code varchar(30) NOT NULL UNIQUE,
    label varchar(100) NOT NULL,
    short_code varchar(10) NOT NULL,
    color varchar(30) NOT NULL DEFAULT 'emerald',
    is_active boolean NOT NULL DEFAULT true,
    is_system boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NULL,
    deleted_at timestamptz NULL,
    CONSTRAINT pk_attendance_statuses PRIMARY KEY (status_id)
);

-- Seed default statuses from US01 spec
INSERT INTO attendance_statuses (code, label, short_code, color, is_active, is_system, sort_order) VALUES
('present', 'Present', 'P', 'emerald', true, true, 10),
('half_day', 'Half Day', 'HD', 'amber', true, true, 20),
('absent', 'Absent', 'A', 'rose', true, true, 30),
('leave', 'On Leave', 'L', 'blue', true, true, 40),
('weekly_off', 'Weekly Off', 'WO', 'purple', true, true, 50),
('holiday', 'Holiday', 'H', 'teal', true, true, 60),
('missing_punch', 'Missing Punch', 'MP', 'orange', true, true, 70),
('incomplete', 'In Progress', 'IP', 'slate', true, true, 80);

-- 2. Create attendance_shifts table
CREATE TABLE attendance_shifts (
    shift_id integer GENERATED ALWAYS AS IDENTITY,
    shift_code varchar(30) NOT NULL UNIQUE,
    shift_name varchar(100) NOT NULL,
    shift_type varchar(30) NOT NULL DEFAULT 'fixed',
    start_time time NOT NULL,
    end_time time NOT NULL,
    full_day_hours numeric(4,2) NOT NULL DEFAULT 8.00,
    half_day_hours numeric(4,2) NOT NULL DEFAULT 4.00,
    break_duration_minutes integer NOT NULL DEFAULT 60,
    break_type varchar(20) NOT NULL DEFAULT 'unpaid',
    late_arrival_grace_minutes integer NOT NULL DEFAULT 15,
    early_exit_grace_minutes integer NOT NULL DEFAULT 15,
    weekly_off_days integer[] NOT NULL DEFAULT '{0}',
    is_default boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NULL,
    deleted_at timestamptz NULL,
    CONSTRAINT pk_attendance_shifts PRIMARY KEY (shift_id)
);

-- Seed default General Shift (SHF-001)
INSERT INTO attendance_shifts (
    shift_code, shift_name, shift_type, start_time, end_time,
    full_day_hours, half_day_hours, break_duration_minutes, break_type,
    late_arrival_grace_minutes, early_exit_grace_minutes, weekly_off_days,
    is_default, is_active
) VALUES (
    'SHF-001', 'General Shift', 'fixed', '09:30:00', '18:30:00',
    8.00, 4.00, 60, 'unpaid',
    15, 15, '{0}',
    true, true
);

-- 3. Modify attendance_days to link to shift and allow dynamic status
ALTER TABLE attendance_days ADD COLUMN IF NOT EXISTS shift_id integer NULL REFERENCES attendance_shifts(shift_id);
ALTER TABLE attendance_days ALTER COLUMN day_status TYPE VARCHAR(50) USING day_status::text;

-- migrate:down
ALTER TABLE attendance_days DROP COLUMN IF EXISTS shift_id;
DROP TABLE IF EXISTS attendance_shifts;
DROP TABLE IF EXISTS attendance_statuses;
