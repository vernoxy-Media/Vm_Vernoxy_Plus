-- migrate:up
-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_status') THEN
        CREATE TYPE employee_status AS ENUM ('Active', 'Inactive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_type') THEN
        CREATE TYPE channel_type AS ENUM ('website', 'facebook', 'instagram', 'x', 'linkedin', 'email', 'phone', 'whatsapp');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('open', 'won', 'lost', 'on_hold');
    END IF;
END $$;

-- 3. Group Roles (NOLOGIN) guarded with IF NOT EXISTS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_app') THEN
        CREATE ROLE pulse_app NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_readonly') THEN
        CREATE ROLE pulse_readonly NOLOGIN;
    END IF;
END $$;

-- 4. Database timezone UTC
DO $$ BEGIN
    EXECUTE format('ALTER DATABASE %I SET timezone TO ''UTC''', current_database());
END $$;

-- migrate:down
DROP ROLE IF EXISTS pulse_readonly;
DROP ROLE IF EXISTS pulse_app;
DROP TYPE IF EXISTS lead_status;
DROP TYPE IF EXISTS channel_type;
DROP TYPE IF EXISTS employee_status;
DROP EXTENSION IF EXISTS pg_trgm;
