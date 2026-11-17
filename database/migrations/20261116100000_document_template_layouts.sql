-- migrate:up
-- Template Management (document-templates module).
--
-- 1. document_templates gets an editable layout and a review flow:
--      layout_json  which sections and fields a document shows, with their labels and order
--                   (versioned by its own "schema_version"); NULL for the older fixed-HTML templates.
--      status       DRAFT (being edited, test documents only) -> APPROVED (used for real documents)
--                   -> RETIRED (replaced by a newer approved version). Existing rows stay APPROVED.
--      version      1, 2, 3 ... per document type.
--    At most one DRAFT per document type.
--
-- 2. document_template_assets holds images a template uses (the company letterhead). It lives in the
--    database, not on the server's disk, so it survives a redeploy.

ALTER TABLE document_templates
    ADD COLUMN IF NOT EXISTS layout_json jsonb,
    ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS approved_by integer REFERENCES employees (emp_id) ON UPDATE NO ACTION,
    ADD COLUMN IF NOT EXISTS approved_at timestamptz;

DO $$ BEGIN
    ALTER TABLE document_templates
        ADD CONSTRAINT ck_document_templates_status CHECK (status IN ('DRAFT', 'APPROVED', 'RETIRED'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE document_templates
        ADD CONSTRAINT ck_document_templates_version CHECK (version >= 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_document_templates_one_draft
    ON document_templates (document_type) WHERE status = 'DRAFT';

CREATE TABLE IF NOT EXISTS document_template_assets (
    asset_id     serial PRIMARY KEY,
    purpose      varchar(40)  NOT NULL,
    file_name    varchar(200),
    content_type varchar(50)  NOT NULL,
    byte_size    integer      NOT NULL CHECK (byte_size > 0),
    data         bytea        NOT NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    created_by   integer REFERENCES employees (emp_id) ON UPDATE NO ACTION
);

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON document_template_assets TO pulse_app;
        GRANT USAGE, SELECT ON SEQUENCE document_template_assets_asset_id_seq TO pulse_app;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_readonly') THEN
        GRANT SELECT ON document_template_assets TO pulse_readonly;
    END IF;
END $$;

-- migrate:down
DROP TABLE IF EXISTS document_template_assets;
DROP INDEX IF EXISTS ux_document_templates_one_draft;
ALTER TABLE document_templates DROP CONSTRAINT IF EXISTS ck_document_templates_version;
ALTER TABLE document_templates DROP CONSTRAINT IF EXISTS ck_document_templates_status;
ALTER TABLE document_templates
    DROP COLUMN IF EXISTS approved_at,
    DROP COLUMN IF EXISTS approved_by,
    DROP COLUMN IF EXISTS version,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS layout_json;
