-- migrate:up
-- 1. leads table
CREATE TABLE leads (
    lead_id integer GENERATED ALWAYS AS IDENTITY,
    company_id integer NOT NULL,
    person_id integer,
    title varchar(200) NOT NULL,
    pipeline_stage_id integer NOT NULL,
    status lead_status NOT NULL DEFAULT 'open',
    owner_id integer NOT NULL,
    source_id integer,
    expected_value decimal(14,2),
    actual_value decimal(14,2),
    currency_code varchar(3) NOT NULL DEFAULT 'INR',
    expected_close_date date,
    lost_reason_id integer,
    closed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_leads PRIMARY KEY (lead_id),
    CONSTRAINT fk_leads_company_id FOREIGN KEY (company_id) REFERENCES companies(company_id),
    CONSTRAINT fk_leads_person_id FOREIGN KEY (person_id) REFERENCES persons(person_id),
    CONSTRAINT fk_leads_pipeline_stage_id FOREIGN KEY (pipeline_stage_id) REFERENCES pipeline_stages(pipeline_stage_id),
    CONSTRAINT fk_leads_owner_id FOREIGN KEY (owner_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_leads_source_id FOREIGN KEY (source_id) REFERENCES master_lookup(lookup_id),
    CONSTRAINT fk_leads_lost_reason_id FOREIGN KEY (lost_reason_id) REFERENCES master_lookup(lookup_id),
    CONSTRAINT ck_leads_title_non_blank CHECK (length(btrim(title)) > 0),
    CONSTRAINT ck_leads_expected_value_positive CHECK (expected_value IS NULL OR expected_value >= 0),
    CONSTRAINT ck_leads_actual_value_positive CHECK (actual_value IS NULL OR actual_value >= 0),
    CONSTRAINT ck_leads_currency_code_format CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_leads_status_consistency CHECK (
        CASE
            WHEN status = 'won' THEN
                actual_value IS NOT NULL AND closed_at IS NOT NULL AND lost_reason_id IS NULL
            WHEN status = 'lost' THEN
                lost_reason_id IS NOT NULL AND closed_at IS NOT NULL AND actual_value IS NULL
            WHEN status IN ('open', 'on_hold') THEN
                closed_at IS NULL AND lost_reason_id IS NULL AND actual_value IS NULL
            ELSE false
        END
    ),
    CONSTRAINT ck_leads_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- migrate:down
DROP TABLE IF EXISTS leads CASCADE;
