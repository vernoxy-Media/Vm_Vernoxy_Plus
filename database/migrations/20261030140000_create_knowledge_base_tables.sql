-- Migration: 20261030140000_create_knowledge_base_tables.sql
-- Description: Creates normalized Knowledge Base tables and seeds standard categories from BFD v1.1

-- 1. kb_categories
CREATE TABLE IF NOT EXISTS kb_categories (
  category_id SERIAL PRIMARY KEY,
  space VARCHAR(20) NOT NULL CHECK (space IN ('INTERNAL', 'CLIENT')),
  name VARCHAR(100) NOT NULL,
  description VARCHAR(300),
  icon VARCHAR(50),
  default_owner_id INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL,
  default_approver_id INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL,
  default_review_cycle_months INTEGER CHECK (default_review_cycle_months IN (3, 6, 12, 24)),
  default_ack_required BOOLEAN NOT NULL DEFAULT FALSE,
  default_audience_scope VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (default_audience_scope IN ('ALL', 'CUSTOM')),
  default_audience_departments INTEGER[] DEFAULT '{}',
  default_audience_roles INTEGER[] DEFAULT '{}',
  default_audience_employees INTEGER[] DEFAULT '{}',
  default_audience_companies INTEGER[] DEFAULT '{}',
  default_audience_projects INTEGER[] DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_by INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ,
  updated_by INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_kb_categories_space_name ON kb_categories (space, LOWER(name));

-- 2. kb_articles
CREATE TABLE IF NOT EXISTS kb_articles (
  article_id SERIAL PRIMARY KEY,
  article_code VARCHAR(20) NOT NULL UNIQUE,
  space VARCHAR(20) NOT NULL CHECK (space IN ('INTERNAL', 'CLIENT')),
  category_id INTEGER NOT NULL REFERENCES kb_categories(category_id) ON DELETE RESTRICT,
  current_published_version_id INTEGER,
  owner_emp_id INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE RESTRICT,
  content_type VARCHAR(20) NOT NULL DEFAULT 'WRITTEN' CHECK (content_type IN ('WRITTEN', 'FILE', 'VIDEO')),
  review_cycle_months INTEGER CHECK (review_cycle_months IN (3, 6, 12, 24)),
  next_review_date DATE,
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL,
  review_notes TEXT,
  ack_required BOOLEAN NOT NULL DEFAULT FALSE,
  ack_due_days INTEGER NOT NULL DEFAULT 7 CHECK (ack_due_days IN (3, 7, 15, 30)),
  audience_scope VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (audience_scope IN ('ALL', 'CUSTOM')),
  audience_departments INTEGER[] DEFAULT '{}',
  audience_roles INTEGER[] DEFAULT '{}',
  audience_employees INTEGER[] DEFAULT '{}',
  audience_companies INTEGER[] DEFAULT '{}',
  audience_projects INTEGER[] DEFAULT '{}',
  is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  archived_by INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL,
  archive_reason TEXT,
  replacement_article_id INTEGER REFERENCES kb_articles(article_id) ON DELETE SET NULL,
  views_count INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  requests_deflected_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_by INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ,
  updated_by INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_kb_articles_space_cat ON kb_articles (space, category_id);
CREATE INDEX IF NOT EXISTS ix_kb_articles_owner ON kb_articles (owner_emp_id);
CREATE INDEX IF NOT EXISTS ix_kb_articles_review ON kb_articles (next_review_date);

-- 3. kb_article_versions
CREATE TABLE IF NOT EXISTS kb_article_versions (
  version_id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES kb_articles(article_id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'RETIRED')),
  change_type VARCHAR(10) CHECK (change_type IN ('MAJOR', 'MINOR')),
  change_summary TEXT,
  title VARCHAR(120) NOT NULL,
  summary VARCHAR(300) NOT NULL,
  content TEXT,
  video_url VARCHAR(500),
  effective_from DATE,
  tags TEXT[] DEFAULT '{}',
  related_article_ids INTEGER[] DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  submitted_by INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decided_by INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL,
  decision_comment TEXT,
  is_self_approved BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  published_by INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_by INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ,
  updated_by INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_kb_article_versions_article_num ON kb_article_versions (article_id, version_number);
CREATE UNIQUE INDEX IF NOT EXISTS ux_kb_active_draft ON kb_article_versions (article_id) WHERE status IN ('DRAFT', 'IN_REVIEW');

-- Link current_published_version_id FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_kb_articles_published_version'
  ) THEN
    ALTER TABLE kb_articles 
      ADD CONSTRAINT fk_kb_articles_published_version 
      FOREIGN KEY (current_published_version_id) 
      REFERENCES kb_article_versions(version_id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4. kb_acknowledgements
CREATE TABLE IF NOT EXISTS kb_acknowledgements (
  ack_id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES kb_articles(article_id) ON DELETE CASCADE,
  version_id INTEGER NOT NULL REFERENCES kb_article_versions(version_id) ON DELETE CASCADE,
  emp_id INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'OVERDUE')),
  due_date DATE NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  reminders_sent_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_kb_ack_version_emp ON kb_acknowledgements (version_id, emp_id);
CREATE INDEX IF NOT EXISTS ix_kb_ack_emp_status ON kb_acknowledgements (emp_id, status);

-- 5. kb_feedback
CREATE TABLE IF NOT EXISTS kb_feedback (
  feedback_id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES kb_articles(article_id) ON DELETE CASCADE,
  version_id INTEGER NOT NULL REFERENCES kb_article_versions(version_id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  comment TEXT,
  emp_id INTEGER REFERENCES employees(emp_id) ON DELETE SET NULL,
  company_id INTEGER REFERENCES companies(company_id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(project_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS ix_kb_feedback_article ON kb_feedback (article_id, version_id);

-- Initialize entity_counter for KB_ARTICLE if not present
INSERT INTO entity_counters (entity_type, counter_key, last_number)
VALUES ('KB_ARTICLE', 'default', 0)
ON CONFLICT (entity_type, counter_key) DO NOTHING;

-- Seed standard categories from BFD Section 4
INSERT INTO kb_categories (space, name, description, icon, default_review_cycle_months, default_ack_required, default_audience_scope, display_order)
VALUES
  -- Internal Knowledge
  ('INTERNAL', 'HR Policies', 'Code of conduct, attendance, work from home, travel, grievance, POSH', 'Users', 12, TRUE, 'ALL', 1),
  ('INTERNAL', 'Leave Policies', 'Leave types, yearly days, carry forward, how to apply, holiday calendar', 'CalendarDays', 12, TRUE, 'ALL', 2),
  ('INTERNAL', 'IT Policies', 'Laptop and email use, software installation, password rules, asset return', 'Laptop', 12, TRUE, 'ALL', 3),
  ('INTERNAL', 'Security & Compliance', 'Information security, data protection, client data handling, incident reporting', 'ShieldCheck', 6, TRUE, 'ALL', 4),
  ('INTERNAL', 'SOPs & Processes', 'Step-by-step ways of working: onboarding, release deployment, client handover', 'FileText', 12, FALSE, 'CUSTOM', 5),
  ('INTERNAL', 'Coding Standards', 'Language style guides, code review checklist, Git branching, API standards', 'Code', 12, FALSE, 'CUSTOM', 6),
  ('INTERNAL', 'General', 'Company information that fits nowhere else', 'HelpCircle', NULL, FALSE, 'ALL', 7),

  -- Client Knowledge
  ('CLIENT', 'Product Documentation', 'What a delivered product does, its modules and settings', 'BookOpen', 12, FALSE, 'CUSTOM', 1),
  ('CLIENT', 'FAQs', 'Short questions and answers, such as how to reset a password', 'HelpCircle', 12, FALSE, 'ALL', 2),
  ('CLIENT', 'Tutorials', 'How-to guides and videos for one task', 'Video', 12, FALSE, 'CUSTOM', 3),
  ('CLIENT', 'User Manuals', 'The full manual of a delivered product, often as a PDF', 'BookMarked', 12, FALSE, 'CUSTOM', 4)
ON CONFLICT (space, LOWER(name)) DO NOTHING;

