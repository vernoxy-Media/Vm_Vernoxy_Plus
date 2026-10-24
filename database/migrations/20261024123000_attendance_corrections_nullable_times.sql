-- migrate:up

-- 1. Allow requested_check_in_at and requested_check_out_at to be nullable for single-punch requests (e.g. Missing Check-in or Missing Check-out)
ALTER TABLE attendance_corrections 
    ALTER COLUMN requested_check_in_at DROP NOT NULL,
    ALTER COLUMN requested_check_out_at DROP NOT NULL;

-- 2. Update check constraint to allow nulls
ALTER TABLE attendance_corrections DROP CONSTRAINT IF EXISTS ck_attendance_corrections_out_ge_in;
ALTER TABLE attendance_corrections ADD CONSTRAINT ck_attendance_corrections_out_ge_in 
    CHECK (requested_check_in_at IS NULL OR requested_check_out_at IS NULL OR requested_check_out_at >= requested_check_in_at);

-- 3. Update break duration constraint to allow nulls
ALTER TABLE attendance_corrections DROP CONSTRAINT IF EXISTS ck_attendance_corrections_break_le_session;
ALTER TABLE attendance_corrections ADD CONSTRAINT ck_attendance_corrections_break_le_session 
    CHECK (requested_check_in_at IS NULL OR requested_check_out_at IS NULL OR (requested_break_minutes::numeric <= floor(extract(epoch FROM (requested_check_out_at - requested_check_in_at)) / 60)));

-- migrate:down

ALTER TABLE attendance_corrections DROP CONSTRAINT IF EXISTS ck_attendance_corrections_break_le_session;
ALTER TABLE attendance_corrections DROP CONSTRAINT IF EXISTS ck_attendance_corrections_out_ge_in;

ALTER TABLE attendance_corrections ADD CONSTRAINT ck_attendance_corrections_out_ge_in 
    CHECK (requested_check_out_at >= requested_check_in_at);
ALTER TABLE attendance_corrections ADD CONSTRAINT ck_attendance_corrections_break_le_session 
    CHECK (requested_break_minutes::numeric <= floor(extract(epoch FROM (requested_check_out_at - requested_check_in_at)) / 60));

ALTER TABLE attendance_corrections 
    ALTER COLUMN requested_check_in_at SET NOT NULL,
    ALTER COLUMN requested_check_out_at SET NOT NULL;
