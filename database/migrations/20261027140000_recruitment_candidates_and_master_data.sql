-- migrate:up
-- =============================================================================
-- Migration: Recruitment Candidates and Master Data
-- Description: Creates candidate_counters and candidates tables with indexes,
--              and seeds recruitment master lookups (source, portals, notice periods,
--              stages, rejection reasons).
-- =============================================================================

CREATE TABLE IF NOT EXISTS candidate_counters (
    counter_name VARCHAR(50) PRIMARY KEY,
    last_number INT NOT NULL DEFAULT 0
);

INSERT INTO candidate_counters (counter_name, last_number)
VALUES ('candidate_code', 0)
ON CONFLICT (counter_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS candidates (
    candidate_id SERIAL PRIMARY KEY,
    candidate_code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    gender_id INT REFERENCES master_lookup(lookup_id) ON DELETE SET NULL,
    current_location VARCHAR(255),
    resume_url TEXT,
    resume_filename VARCHAR(255),
    resume_size INT,
    resume_mime VARCHAR(100),
    role_id INT NOT NULL REFERENCES roles(role_id),
    dep_id INT NOT NULL REFERENCES departments(dep_id),
    experience_type VARCHAR(32) NOT NULL DEFAULT 'experienced', -- 'fresher' | 'experienced'
    exp_years INT DEFAULT 0,
    exp_months INT DEFAULT 0,
    current_company VARCHAR(255),
    current_designation VARCHAR(255),
    current_ctc NUMERIC(14, 2),
    expected_ctc NUMERIC(14, 2),
    notice_period VARCHAR(64),
    serving_notice_lwd DATE,
    key_skills JSONB DEFAULT '[]'::jsonb,
    source VARCHAR(64) NOT NULL,
    source_portal VARCHAR(64),
    referred_by_emp_id INT REFERENCES employees(emp_id) ON DELETE SET NULL,
    consultancy_name VARCHAR(255),
    college_name VARCHAR(255),
    source_details TEXT,
    notes TEXT,
    stage VARCHAR(32) NOT NULL DEFAULT 'new',
    rejection_reason VARCHAR(64),
    rejection_notes TEXT,
    converted_to_emp_id INT REFERENCES employees(emp_id) ON DELETE SET NULL,
    created_by INT REFERENCES employees(emp_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_candidates_code ON candidates(candidate_code);
CREATE INDEX IF NOT EXISTS ix_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS ix_candidates_phone ON candidates(phone);
CREATE INDEX IF NOT EXISTS ix_candidates_stage ON candidates(stage);
CREATE INDEX IF NOT EXISTS ix_candidates_role_id ON candidates(role_id);
CREATE INDEX IF NOT EXISTS ix_candidates_dep_id ON candidates(dep_id);
CREATE INDEX IF NOT EXISTS ix_candidates_source ON candidates(source);
CREATE INDEX IF NOT EXISTS ix_candidates_created_at ON candidates(created_at DESC);

-- Seed Candidate Sources
INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active)
VALUES
    ('candidate_source', 'job_portal', 'Job Portal', 10, true),
    ('candidate_source', 'linkedin', 'LinkedIn', 20, true),
    ('candidate_source', 'company_website', 'Company Website', 30, true),
    ('candidate_source', 'employee_referral', 'Employee Referral', 40, true),
    ('candidate_source', 'consultancy', 'Consultancy', 50, true),
    ('candidate_source', 'campus', 'Campus', 60, true),
    ('candidate_source', 'walk_in', 'Walk-in', 70, true),
    ('candidate_source', 'social_media', 'Social Media', 80, true),
    ('candidate_source', 'other', 'Other', 90, true)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- Seed Job Portals
INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active)
VALUES
    ('job_portal', 'naukri', 'Naukri.com', 10, true),
    ('job_portal', 'indeed', 'Indeed', 20, true),
    ('job_portal', 'foundit', 'Foundit (Monster)', 30, true),
    ('job_portal', 'linkedin_jobs', 'LinkedIn Jobs', 40, true),
    ('job_portal', 'other', 'Other', 50, true)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- Seed Notice Periods
INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active)
VALUES
    ('notice_period', 'immediate', 'Immediate (0 days)', 10, true),
    ('notice_period', '15_days', '15 days', 20, true),
    ('notice_period', '30_days', '30 days', 30, true),
    ('notice_period', '60_days', '60 days', 40, true),
    ('notice_period', '90_days', '90 days', 50, true),
    ('notice_period', 'serving_notice', 'Serving notice', 60, true)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- Seed Candidate Stages
INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active)
VALUES
    ('candidate_stage', 'new', 'New', 10, true),
    ('candidate_stage', 'screening', 'Screening', 20, true),
    ('candidate_stage', 'interviewing', 'Interviewing', 30, true),
    ('candidate_stage', 'on_hold', 'On Hold', 40, true),
    ('candidate_stage', 'selected', 'Selected', 50, true),
    ('candidate_stage', 'onboarding', 'Onboarding', 60, true),
    ('candidate_stage', 'rejected', 'Rejected', 70, true),
    ('candidate_stage', 'joined', 'Joined', 80, true),
    ('candidate_stage', 'did_not_join', 'Did not join', 90, true)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- Seed Rejection Reasons
INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active)
VALUES
    ('rejection_reason', 'skills_mismatch', 'Skills not matching', 10, true),
    ('rejection_reason', 'salary_mismatch', 'Salary mismatch', 20, true),
    ('rejection_reason', 'candidate_withdrew', 'Candidate withdrew', 30, true),
    ('rejection_reason', 'no_show', 'No-show', 40, true),
    ('rejection_reason', 'position_closed', 'Position closed', 50, true),
    ('rejection_reason', 'other', 'Other', 60, true)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- migrate:down
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS candidate_counters CASCADE;
DELETE FROM master_lookup WHERE lookup_type IN ('candidate_source', 'job_portal', 'notice_period', 'candidate_stage', 'rejection_reason');
