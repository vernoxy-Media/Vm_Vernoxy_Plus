-- migrate:up
-- =============================================================================
-- Performance Management BFD 1.0 completion
--  * Project ratings get a Draft state (BFD 6B: "Save draft; finish by the 10th").
--  * Cycle names follow the BFD format ("Monthly – Oct 2026", "Quarterly – Oct to
--    Dec 2026", "Yearly – 2026"); the name is filled by the system.
--  * New forms start as Draft (BFD Screen 3 shows Draft / Published).
-- =============================================================================

ALTER TABLE perf_project_ratings
    ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'SUBMITTED';

ALTER TABLE perf_project_ratings
    DROP CONSTRAINT IF EXISTS ck_perf_proj_ratings_status;
ALTER TABLE perf_project_ratings
    ADD CONSTRAINT ck_perf_proj_ratings_status CHECK (status IN ('DRAFT', 'SUBMITTED'));

ALTER TABLE perf_project_ratings ALTER COLUMN submitted_at DROP NOT NULL;
ALTER TABLE perf_project_ratings ALTER COLUMN submitted_at DROP DEFAULT;

ALTER TABLE perf_forms ALTER COLUMN is_published SET DEFAULT false;

UPDATE perf_cycles
SET cycle_name = CASE cycle_type
    WHEN 'YEARLY' THEN 'Yearly – ' || year
    WHEN 'QUARTERLY' THEN 'Quarterly – ' ||
        (ARRAY['Jan to Mar', 'Apr to Jun', 'Jul to Sep', 'Oct to Dec'])[quarter] || ' ' || year
    ELSE 'Monthly – ' ||
        (ARRAY['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[month] || ' ' || year
  END,
  updated_at = clock_timestamp();

-- migrate:down
ALTER TABLE perf_forms ALTER COLUMN is_published SET DEFAULT false;
UPDATE perf_project_ratings SET submitted_at = COALESCE(submitted_at, updated_at, created_at);
ALTER TABLE perf_project_ratings ALTER COLUMN submitted_at SET DEFAULT clock_timestamp();
ALTER TABLE perf_project_ratings ALTER COLUMN submitted_at SET NOT NULL;
ALTER TABLE perf_project_ratings DROP CONSTRAINT IF EXISTS ck_perf_proj_ratings_status;
ALTER TABLE perf_project_ratings DROP COLUMN IF EXISTS status;
