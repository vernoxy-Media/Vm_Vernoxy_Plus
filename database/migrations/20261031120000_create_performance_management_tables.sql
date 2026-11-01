-- migrate:up
-- =============================================================================
-- Migration: Performance Management Schema
-- Description: Strictly implements all entities, fields, validations, and rules
--              defined in the Performance Management BFD 1.0 document.
--              Consolidated into 4 normalized tables with JSONB flexibility:
--              1. perf_cycles
--              2. perf_forms
--              3. perf_reviews
--              4. perf_project_ratings
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PERFORMANCE CYCLES (Cycle Master - BFD Section 2, 3, 7, 13)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perf_cycles (
    cycle_id            integer GENERATED ALWAYS AS IDENTITY,
    cycle_name          varchar(100) NOT NULL,
    cycle_type          varchar(20) NOT NULL,
    year                integer NOT NULL,
    quarter             smallint,
    month               smallint,
    start_date          date NOT NULL,
    end_date            date NOT NULL,
    review_start_date   date NOT NULL,
    review_end_date     date NOT NULL,
    status              varchar(20) NOT NULL DEFAULT 'UPCOMING',
    created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by          integer,
    updated_at          timestamptz,
    updated_by          integer,

    CONSTRAINT pk_perf_cycles PRIMARY KEY (cycle_id),
    CONSTRAINT fk_perf_cycles_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT fk_perf_cycles_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT ck_perf_cycles_type CHECK (cycle_type IN ('YEARLY', 'QUARTERLY', 'MONTHLY')),
    CONSTRAINT ck_perf_cycles_quarter CHECK (quarter IS NULL OR (quarter >= 1 AND quarter <= 4)),
    CONSTRAINT ck_perf_cycles_month CHECK (month IS NULL OR (month >= 1 AND month <= 12)),
    CONSTRAINT ck_perf_cycles_status CHECK (status IN ('UPCOMING', 'REVIEW_OPEN', 'CLOSED')),
    CONSTRAINT ck_perf_cycles_dates CHECK (end_date >= start_date AND review_end_date >= review_start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_perf_cycles_period
    ON perf_cycles (cycle_type, year, COALESCE(quarter, 0), COALESCE(month, 0));

CREATE INDEX IF NOT EXISTS ix_perf_cycles_status
    ON perf_cycles (status, review_start_date, review_end_date);


-- -----------------------------------------------------------------------------
-- 2. REVIEW FORMS (Question Master - BFD Section 2, 4, 8, 13)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perf_forms (
    form_id             integer GENERATED ALWAYS AS IDENTITY,
    cycle_id            integer NOT NULL,
    form_name           varchar(150) NOT NULL,
    description         text,
    department_ids      integer[] NOT NULL DEFAULT '{}',
    questions           jsonb NOT NULL DEFAULT '[]',
    is_published        boolean NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by          integer,
    updated_at          timestamptz,
    updated_by          integer,

    CONSTRAINT pk_perf_forms PRIMARY KEY (form_id),
    CONSTRAINT fk_perf_forms_cycle FOREIGN KEY (cycle_id) REFERENCES perf_cycles(cycle_id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_forms_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT fk_perf_forms_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_perf_forms_cycle
    ON perf_forms (cycle_id, is_published);


-- -----------------------------------------------------------------------------
-- 3. EMPLOYEE REVIEWS (Self, Manager, Admin & Final - BFD Section 2, 5, 6, 9, 10, 11, 13)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perf_reviews (
    review_id               integer GENERATED ALWAYS AS IDENTITY,
    cycle_id                integer NOT NULL,
    form_id                 integer NOT NULL,
    emp_id                  integer NOT NULL,
    manager_emp_id          integer,
    admin_emp_id            integer,

    -- Self Review (Employee)
    self_status             varchar(20) NOT NULL DEFAULT 'PENDING',
    self_submitted_at       timestamptz,
    self_ratings            jsonb NOT NULL DEFAULT '{}',
    self_answers            jsonb NOT NULL DEFAULT '{}',
    self_comment            text,
    self_avg_rating         numeric(3, 1),

    -- Team Review (Reporting Manager)
    manager_status          varchar(20) NOT NULL DEFAULT 'PENDING',
    manager_submitted_at    timestamptz,
    manager_ratings         jsonb NOT NULL DEFAULT '{}',
    manager_answers         jsonb NOT NULL DEFAULT '{}',
    manager_comment         text,
    manager_avg_rating      numeric(3, 1),

    -- Admin Review (Admin / HR)
    admin_status            varchar(20) NOT NULL DEFAULT 'PENDING',
    admin_submitted_at      timestamptz,
    admin_ratings           jsonb NOT NULL DEFAULT '{}',
    admin_answers           jsonb NOT NULL DEFAULT '{}',
    admin_comment           text,
    admin_avg_rating        numeric(3, 1),

    -- Final Rating & Reopen Governance
    final_rating            numeric(3, 1),
    is_locked               boolean NOT NULL DEFAULT false,
    reopened_reason         text,
    reopened_at             timestamptz,
    reopened_by             integer,

    created_at              timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at              timestamptz,

    CONSTRAINT pk_perf_reviews PRIMARY KEY (review_id),
    CONSTRAINT fk_perf_reviews_cycle FOREIGN KEY (cycle_id) REFERENCES perf_cycles(cycle_id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_reviews_form FOREIGN KEY (form_id) REFERENCES perf_forms(form_id) ON DELETE RESTRICT,
    CONSTRAINT fk_perf_reviews_emp FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE RESTRICT,
    CONSTRAINT fk_perf_reviews_manager FOREIGN KEY (manager_emp_id) REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT fk_perf_reviews_admin FOREIGN KEY (admin_emp_id) REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT fk_perf_reviews_reopened_by FOREIGN KEY (reopened_by) REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT ck_perf_reviews_self_status CHECK (self_status IN ('PENDING', 'SUBMITTED', 'REOPENED')),
    CONSTRAINT ck_perf_reviews_manager_status CHECK (manager_status IN ('PENDING', 'SUBMITTED', 'REOPENED')),
    CONSTRAINT ck_perf_reviews_admin_status CHECK (admin_status IN ('PENDING', 'SUBMITTED', 'REOPENED')),
    CONSTRAINT uq_perf_reviews_cycle_employee UNIQUE (cycle_id, emp_id)
);

CREATE INDEX IF NOT EXISTS ix_perf_reviews_cycle_status
    ON perf_reviews (cycle_id, self_status, manager_status, admin_status);

CREATE INDEX IF NOT EXISTS ix_perf_reviews_emp
    ON perf_reviews (emp_id, cycle_id);

CREATE INDEX IF NOT EXISTS ix_perf_reviews_manager
    ON perf_reviews (manager_emp_id, cycle_id);


-- -----------------------------------------------------------------------------
-- 4. PROJECT RATINGS (Project Manager Review - BFD Section 6B, 11, 13)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perf_project_ratings (
    project_rating_id   integer GENERATED ALWAYS AS IDENTITY,
    cycle_id            integer NOT NULL,
    project_id          integer NOT NULL,
    emp_id              integer NOT NULL,
    project_manager_id  integer NOT NULL,
    rating              smallint NOT NULL,
    comment             text,
    submitted_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at          timestamptz,

    CONSTRAINT pk_perf_project_ratings PRIMARY KEY (project_rating_id),
    CONSTRAINT fk_perf_proj_ratings_cycle FOREIGN KEY (cycle_id) REFERENCES perf_cycles(cycle_id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_proj_ratings_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_proj_ratings_emp FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE RESTRICT,
    CONSTRAINT fk_perf_proj_ratings_pm FOREIGN KEY (project_manager_id) REFERENCES employees(emp_id) ON DELETE RESTRICT,
    CONSTRAINT ck_perf_proj_ratings_value CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT uq_perf_proj_ratings_member UNIQUE (cycle_id, project_id, emp_id)
);

CREATE INDEX IF NOT EXISTS ix_perf_proj_ratings_cycle_proj
    ON perf_project_ratings (cycle_id, project_id);

CREATE INDEX IF NOT EXISTS ix_perf_proj_ratings_pm
    ON perf_project_ratings (project_manager_id, cycle_id);

CREATE INDEX IF NOT EXISTS ix_perf_proj_ratings_emp
    ON perf_project_ratings (emp_id, cycle_id);


-- -----------------------------------------------------------------------------
-- 5. INITIALIZE COUNTER
-- -----------------------------------------------------------------------------
INSERT INTO entity_counters (entity_type, counter_key, last_number)
VALUES ('PERF_CYCLE', 'default', 0)
ON CONFLICT (entity_type, counter_key) DO NOTHING;


-- migrate:down
DROP TABLE IF EXISTS perf_project_ratings CASCADE;
DROP TABLE IF EXISTS perf_reviews CASCADE;
DROP TABLE IF EXISTS perf_forms CASCADE;
DROP TABLE IF EXISTS perf_cycles CASCADE;
DELETE FROM entity_counters WHERE entity_type = 'PERF_CYCLE';

