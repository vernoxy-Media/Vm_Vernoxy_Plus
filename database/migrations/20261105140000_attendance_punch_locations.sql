-- migrate:up
-- Where an employee clocked in / out from (captured by the browser at the time of the punch).
CREATE TABLE IF NOT EXISTS attendance_punch_locations (
    emp_id      integer          NOT NULL REFERENCES employees (emp_id),
    work_date   date             NOT NULL,
    kind        varchar(3)       NOT NULL CHECK (kind IN ('in', 'out')),
    latitude    double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude   double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    accuracy_m  integer,
    captured_at timestamptz      NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (emp_id, work_date, kind)
);

-- migrate:down
DROP TABLE IF EXISTS attendance_punch_locations;
