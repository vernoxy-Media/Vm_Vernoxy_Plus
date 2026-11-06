-- migrate:up
-- These three columns exist in schema.prisma and in the development database, but no earlier migration created them,
-- so a database built only from the migrations (like the QA one) failed to sign anyone in.
-- IF NOT EXISTS makes this a no-op wherever they already exist.
ALTER TABLE employees  ADD COLUMN IF NOT EXISTS probation_period varchar(100);
ALTER TABLE employees  ADD COLUMN IF NOT EXISTS notice_period    varchar(100);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS review_on_date   date;

-- migrate:down
ALTER TABLE candidates DROP COLUMN IF EXISTS review_on_date;
ALTER TABLE employees  DROP COLUMN IF EXISTS notice_period;
ALTER TABLE employees  DROP COLUMN IF EXISTS probation_period;
