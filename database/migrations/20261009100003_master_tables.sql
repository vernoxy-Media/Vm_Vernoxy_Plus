-- migrate:up
-- 1. industries
CREATE TABLE industries (
    industry_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(255) NOT NULL,
    parent_id integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_industries PRIMARY KEY (industry_id),
    CONSTRAINT fk_industries_parent_id FOREIGN KEY (parent_id) REFERENCES industries(industry_id),
    CONSTRAINT ck_industries_name_non_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT ck_industries_parent_diff CHECK (parent_id IS NULL OR parent_id <> industry_id),
    CONSTRAINT ck_industries_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- 2. customer_types
CREATE TABLE customer_types (
    customer_type_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_customer_types PRIMARY KEY (customer_type_id),
    CONSTRAINT ck_customer_types_name_non_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT ck_customer_types_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- 3. master_lookup
CREATE TABLE master_lookup (
    lookup_id integer GENERATED ALWAYS AS IDENTITY,
    lookup_type varchar(50) NOT NULL,
    code varchar(50) NOT NULL,
    label varchar(150) NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_master_lookup PRIMARY KEY (lookup_id),
    CONSTRAINT ck_master_lookup_type_format CHECK (lookup_type ~ '^[a-z0-9_]+$'),
    CONSTRAINT ck_master_lookup_code_format CHECK (code ~ '^[a-z0-9_]+$'),
    CONSTRAINT ck_master_lookup_label_non_blank CHECK (length(btrim(label)) > 0),
    CONSTRAINT ck_master_lookup_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- 4. pipeline_stages
CREATE TABLE pipeline_stages (
    pipeline_stage_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    sort_order integer NOT NULL,
    win_probability smallint NOT NULL,
    is_won boolean NOT NULL DEFAULT false,
    is_lost boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_pipeline_stages PRIMARY KEY (pipeline_stage_id),
    CONSTRAINT ck_pipeline_stages_name_non_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT ck_pipeline_stages_win_prob_range CHECK (win_probability >= 0 AND win_probability <= 100),
    CONSTRAINT ck_pipeline_stages_not_both_won_lost CHECK (NOT (is_won AND is_lost)),
    CONSTRAINT ck_pipeline_stages_won_implies_100 CHECK ((NOT is_won) OR (win_probability = 100)),
    CONSTRAINT ck_pipeline_stages_lost_implies_0 CHECK ((NOT is_lost) OR (win_probability = 0)),
    CONSTRAINT ck_pipeline_stages_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- migrate:down
DROP TABLE IF EXISTS pipeline_stages CASCADE;
DROP TABLE IF EXISTS master_lookup CASCADE;
DROP TABLE IF EXISTS customer_types CASCADE;
DROP TABLE IF EXISTS industries CASCADE;
