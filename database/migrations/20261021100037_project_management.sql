-- migrate:up

-- 1. Create Enums for Project Management
CREATE TYPE project_type AS ENUM (
    'client',
    'internal',
    'product',
    'maintenance'
);

CREATE TYPE project_category AS ENUM (
    'ecom_website',
    'portfolio_website',
    'seo',
    'social_media',
    'crm',
    'erp',
    'brochure',
    'other'
);

CREATE TYPE project_status AS ENUM (
    'new',
    'planning',
    'in_progress',
    'pending',
    'review',
    'delivered',
    'on_hold',
    'cancelled'
);

CREATE TYPE sprint_status AS ENUM (
    'planned',
    'active',
    'completed'
);

CREATE TYPE bug_priority AS ENUM (
    'high',
    'medium',
    'low'
);

CREATE TYPE bug_status AS ENUM (
    'new',
    'open',
    'ready_for_dev',
    'dev_in_progress',
    'ready_for_qa',
    'qa_in_progress',
    'done',
    'not_a_bug'
);

CREATE TYPE bug_type AS ENUM (
    'frontend',
    'backend',
    'ui',
    'database',
    'other'
);

-- 2. Project Counter for sequential project numbering (VM-CL001, VM-IN001, etc.)
CREATE TABLE project_counters (
    project_type project_type NOT NULL,
    last_number integer NOT NULL DEFAULT 0,
    CONSTRAINT pk_project_counters PRIMARY KEY (project_type),
    CONSTRAINT ck_project_counters_last_number_ge_zero CHECK (last_number >= 0)
);

CREATE TRIGGER trg_prevent_hard_delete_project_counters
    BEFORE DELETE ON project_counters
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_project_counters
    BEFORE TRUNCATE ON project_counters
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

-- Pre-seed counters for all project types
INSERT INTO project_counters (project_type, last_number) VALUES
    ('client', 0),
    ('internal', 0),
    ('product', 0),
    ('maintenance', 0);

-- 3. Projects Table
CREATE TABLE projects (
    project_id integer GENERATED ALWAYS AS IDENTITY,
    project_no varchar(30) NOT NULL,
    project_name varchar(150) NOT NULL,
    project_type project_type NOT NULL,
    category project_category NOT NULL,
    other_category varchar(100) NULL,
    project_status project_status NOT NULL DEFAULT 'new',
    start_date date NOT NULL,
    deadline date NOT NULL,
    actual_end_date date NULL,
    project_manager_id integer NOT NULL,
    status_change_reason text NULL,
    client_name varchar(150) NULL,
    lead_received_date date NULL,
    project_approved_date date NULL,
    tech_frontend text NULL,
    tech_backend text NULL,
    tech_cloud text NULL,
    row_version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_projects PRIMARY KEY (project_id),
    CONSTRAINT fk_projects_project_manager_id FOREIGN KEY (project_manager_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_projects_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_projects_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_projects_name_non_blank CHECK (length(btrim(project_name)) >= 1),
    CONSTRAINT ck_projects_deadline_gte_start CHECK (deadline >= start_date),
    CONSTRAINT ck_projects_status_reason CHECK (
        (project_status NOT IN ('on_hold', 'cancelled')) OR 
        (status_change_reason IS NOT NULL AND length(btrim(status_change_reason)) > 0)
    ),
    CONSTRAINT ck_projects_other_category CHECK (
        category <> 'other' OR 
        (other_category IS NOT NULL AND length(btrim(other_category)) > 0)
    ),
    CONSTRAINT ck_projects_actual_end_date CHECK (
        project_status = 'delivered' OR actual_end_date IS NULL
    )
);

CREATE UNIQUE INDEX ux_projects_project_no
    ON projects (project_no)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_projects_status ON projects (project_status) WHERE deleted_at IS NULL;
CREATE INDEX ix_projects_manager ON projects (project_manager_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_prevent_hard_delete_projects
    BEFORE DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_projects
    BEFORE TRUNCATE ON projects
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

-- 4. Project Members (Assigned Employees)
CREATE TABLE project_members (
    member_id integer GENERATED ALWAYS AS IDENTITY,
    project_id integer NOT NULL,
    employee_id integer NOT NULL,
    role_in_project varchar(50) NOT NULL DEFAULT 'member',
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_project_members PRIMARY KEY (member_id),
    CONSTRAINT fk_project_members_project_id FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_project_members_employee_id FOREIGN KEY (employee_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_members_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_members_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id)
);

CREATE UNIQUE INDEX ux_project_members_active
    ON project_members (project_id, employee_id)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_project_members_employee ON project_members (employee_id) WHERE deleted_at IS NULL;

-- 5. Project Deployment Details (1:1 with Project, optional, Admin/PM only)
CREATE TABLE project_deployments (
    deployment_id integer GENERATED ALWAYS AS IDENTITY,
    project_id integer NOT NULL,
    vercel_account varchar(100) NULL,
    vercel_link varchar(500) NULL,
    domain_link varchar(500) NULL,
    storage_account varchar(100) NULL,
    deployment_date date NULL,
    go_live_date date NULL,
    deployment_done_by integer NULL,
    admin_login_link varchar(500) NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_project_deployments PRIMARY KEY (deployment_id),
    CONSTRAINT ux_project_deployments_project UNIQUE (project_id),
    CONSTRAINT fk_project_deployments_project_id FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_project_deployments_deployment_done_by FOREIGN KEY (deployment_done_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_deployments_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_deployments_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_deployments_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id)
);

-- 6. Project Credentials (Multiple Admin ID/Password pairs, Admin/PM only)
CREATE TABLE project_credentials (
    credential_id integer GENERATED ALWAYS AS IDENTITY,
    project_id integer NOT NULL,
    admin_label varchar(100) NULL,
    admin_id varchar(150) NOT NULL,
    admin_password_encrypted varchar(500) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_project_credentials PRIMARY KEY (credential_id),
    CONSTRAINT fk_project_credentials_project_id FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_project_credentials_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_credentials_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_credentials_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_project_credentials_admin_id_non_blank CHECK (length(btrim(admin_id)) >= 1)
);

CREATE INDEX ix_project_credentials_project ON project_credentials (project_id) WHERE deleted_at IS NULL;

-- 7. Project Sprints
CREATE TABLE project_sprints (
    sprint_id integer GENERATED ALWAYS AS IDENTITY,
    project_id integer NOT NULL,
    sprint_name varchar(100) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    sprint_goal text NULL,
    status sprint_status NOT NULL DEFAULT 'planned',
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_project_sprints PRIMARY KEY (sprint_id),
    CONSTRAINT fk_project_sprints_project_id FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_project_sprints_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_sprints_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_sprints_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_project_sprints_name_non_blank CHECK (length(btrim(sprint_name)) >= 1),
    CONSTRAINT ck_project_sprints_dates CHECK (end_date >= start_date)
);

CREATE INDEX ix_project_sprints_project ON project_sprints (project_id) WHERE deleted_at IS NULL;

-- 8. Alter tasks table to connect project_id & add sprint_id
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS sprint_id integer NULL;

ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_project_id FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE SET NULL;

ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_sprint_id FOREIGN KEY (sprint_id) REFERENCES project_sprints(sprint_id) ON DELETE SET NULL;

CREATE INDEX ix_tasks_project_id_stage ON tasks (project_id, stage) WHERE deleted_at IS NULL;
CREATE INDEX ix_tasks_sprint_id ON tasks (sprint_id) WHERE deleted_at IS NULL;

-- 9. Project Discussions (Project Chat for all members)
CREATE TABLE project_discussions (
    message_id bigint GENERATED ALWAYS AS IDENTITY,
    project_id integer NOT NULL,
    sender_emp_id integer NOT NULL,
    message text NOT NULL,
    attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NULL,
    deleted_at timestamptz NULL,
    CONSTRAINT pk_project_discussions PRIMARY KEY (message_id),
    CONSTRAINT fk_project_discussions_project_id FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_project_discussions_sender_emp_id FOREIGN KEY (sender_emp_id) REFERENCES employees(emp_id),
    CONSTRAINT ck_project_discussions_message_non_blank CHECK (length(btrim(message)) >= 1)
);

CREATE INDEX ix_project_discussions_project ON project_discussions (project_id, created_at) WHERE deleted_at IS NULL;

-- 10. Project Activity Logs (Read-only audit trail)
CREATE TABLE project_activity_logs (
    log_id bigint GENERATED ALWAYS AS IDENTITY,
    project_id integer NOT NULL,
    actor_emp_id integer NOT NULL,
    action_type varchar(50) NOT NULL,
    description text NOT NULL,
    metadata jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_project_activity_logs PRIMARY KEY (log_id),
    CONSTRAINT fk_project_activity_logs_project_id FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_project_activity_logs_actor_emp_id FOREIGN KEY (actor_emp_id) REFERENCES employees(emp_id)
);

CREATE INDEX ix_project_activity_logs_project ON project_activity_logs (project_id, created_at DESC);

-- 11. Bug Counters & Project Bugs
CREATE TABLE bug_counters (
    counter_year integer NOT NULL,
    last_number integer NOT NULL DEFAULT 0,
    CONSTRAINT pk_bug_counters PRIMARY KEY (counter_year),
    CONSTRAINT ck_bug_counters_last_number_ge_zero CHECK (last_number >= 0)
);

CREATE TRIGGER trg_prevent_hard_delete_bug_counters
    BEFORE DELETE ON bug_counters
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_bug_counters
    BEFORE TRUNCATE ON bug_counters
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TABLE project_bugs (
    bug_id integer GENERATED ALWAYS AS IDENTITY,
    bug_code varchar(30) NOT NULL,
    project_id integer NOT NULL,
    task_id integer NULL,
    title varchar(200) NOT NULL,
    description text NOT NULL,
    steps_to_reproduce text NOT NULL,
    expected_result text NOT NULL,
    actual_result text NOT NULL,
    assigned_to integer NOT NULL,
    reported_by integer NOT NULL,
    priority bug_priority NOT NULL DEFAULT 'low',
    status bug_status NOT NULL DEFAULT 'new',
    bug_type bug_type NOT NULL,
    other_bug_type varchar(100) NULL,
    attachment_url varchar(500) NULL,
    dev_started_at timestamptz NULL,
    dev_ended_at timestamptz NULL,
    qa_started_at timestamptz NULL,
    qa_ended_at timestamptz NULL,
    total_time_minutes integer NOT NULL DEFAULT 0,
    row_version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_project_bugs PRIMARY KEY (bug_id),
    CONSTRAINT fk_project_bugs_project_id FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    CONSTRAINT fk_project_bugs_task_id FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE SET NULL,
    CONSTRAINT fk_project_bugs_assigned_to FOREIGN KEY (assigned_to) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_bugs_reported_by FOREIGN KEY (reported_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_bugs_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_bugs_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_project_bugs_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_project_bugs_title_non_blank CHECK (length(btrim(title)) >= 1)
);

CREATE UNIQUE INDEX ux_project_bugs_bug_code
    ON project_bugs (bug_code)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_project_bugs_project ON project_bugs (project_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_project_bugs_assigned_to ON project_bugs (assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX ix_project_bugs_status ON project_bugs (status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_prevent_hard_delete_project_bugs
    BEFORE DELETE ON project_bugs
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_project_bugs
    BEFORE TRUNCATE ON project_bugs
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

-- 12. Bug Comments & Bug History
CREATE TABLE bug_comments (
    comment_id integer GENERATED ALWAYS AS IDENTITY,
    bug_id integer NOT NULL,
    emp_id integer NOT NULL,
    comment text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz NULL,
    CONSTRAINT pk_bug_comments PRIMARY KEY (comment_id),
    CONSTRAINT fk_bug_comments_bug_id FOREIGN KEY (bug_id) REFERENCES project_bugs(bug_id) ON DELETE CASCADE,
    CONSTRAINT fk_bug_comments_emp_id FOREIGN KEY (emp_id) REFERENCES employees(emp_id),
    CONSTRAINT ck_bug_comments_non_blank CHECK (length(btrim(comment)) >= 1)
);

CREATE INDEX ix_bug_comments_bug_id ON bug_comments (bug_id, created_at) WHERE deleted_at IS NULL;

CREATE TABLE bug_history (
    history_id bigint GENERATED ALWAYS AS IDENTITY,
    bug_id integer NOT NULL,
    actor_emp_id integer NOT NULL,
    from_status bug_status NULL,
    to_status bug_status NOT NULL,
    note text NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_bug_history PRIMARY KEY (history_id),
    CONSTRAINT fk_bug_history_bug_id FOREIGN KEY (bug_id) REFERENCES project_bugs(bug_id) ON DELETE CASCADE,
    CONSTRAINT fk_bug_history_actor_emp_id FOREIGN KEY (actor_emp_id) REFERENCES employees(emp_id)
);

CREATE INDEX ix_bug_history_bug_id ON bug_history (bug_id, created_at DESC);


-- migrate:down

DROP TABLE IF EXISTS bug_history CASCADE;
DROP TABLE IF EXISTS bug_comments CASCADE;
DROP TABLE IF EXISTS project_bugs CASCADE;
DROP TABLE IF EXISTS bug_counters CASCADE;
DROP TABLE IF EXISTS project_activity_logs CASCADE;
DROP TABLE IF EXISTS project_discussions CASCADE;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_sprint_id;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_project_id;
DROP INDEX IF EXISTS ix_tasks_sprint_id;
DROP INDEX IF EXISTS ix_tasks_project_id_stage;
ALTER TABLE tasks DROP COLUMN IF EXISTS sprint_id;

DROP TABLE IF EXISTS project_sprints CASCADE;
DROP TABLE IF EXISTS project_credentials CASCADE;
DROP TABLE IF EXISTS project_deployments CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS project_counters CASCADE;

DROP TYPE IF EXISTS bug_type;
DROP TYPE IF EXISTS bug_status;
DROP TYPE IF EXISTS bug_priority;
DROP TYPE IF EXISTS sprint_status;
DROP TYPE IF EXISTS project_status;
DROP TYPE IF EXISTS project_category;
DROP TYPE IF EXISTS project_type;
