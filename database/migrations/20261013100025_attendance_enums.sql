-- migrate:up

-- 1. Attendance day status
CREATE TYPE attendance_day_status AS ENUM ('present', 'half_day', 'short', 'incomplete');

-- 2. Attendance source
CREATE TYPE attendance_source AS ENUM ('web', 'correction', 'admin');

-- 3. Attendance correction status
CREATE TYPE correction_status AS ENUM ('pending', 'approved', 'rejected');

-- migrate:down

DROP TYPE IF EXISTS correction_status;
DROP TYPE IF EXISTS attendance_source;
DROP TYPE IF EXISTS attendance_day_status;
