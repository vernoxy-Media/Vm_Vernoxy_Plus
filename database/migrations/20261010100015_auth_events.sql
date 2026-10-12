-- migrate:up

-- 1. Create separate schema for child partitions
CREATE SCHEMA IF NOT EXISTS auth_partitions;

-- 2. Create partitioned parent table
CREATE TABLE auth_events (
    event_id bigint GENERATED ALWAYS AS IDENTITY,
    created_at timestamptz NOT NULL DEFAULT now(),
    emp_id integer NULL,
    actor_emp_id integer NULL,
    event_type auth_event_type NOT NULL,
    session_id uuid NULL,
    identifier_hash char(64) NULL,
    ip_address varchar(45) NULL,
    user_agent varchar(300) NULL,
    details jsonb NULL,

    CONSTRAINT pk_auth_events PRIMARY KEY (event_id, created_at),
    CONSTRAINT fk_auth_events_emp_id FOREIGN KEY (emp_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_auth_events_actor_emp_id FOREIGN KEY (actor_emp_id) REFERENCES employees(emp_id),
    CONSTRAINT ck_auth_events_identifier_hash CHECK (identifier_hash IS NULL OR identifier_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_auth_events_ip_address CHECK (ip_address IS NULL OR ip_address ~ '^[0-9a-fA-F:.]{3,45}$')
) PARTITION BY RANGE (created_at);

-- 3. Append-only enforcement triggers
CREATE OR REPLACE FUNCTION fn_prevent_auth_events_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'auth_events is append-only: updates and deletes are strictly prohibited';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_auth_events_update
    BEFORE UPDATE ON auth_events
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_auth_events_mutation();

CREATE TRIGGER trg_prevent_auth_events_delete
    BEFORE DELETE ON auth_events
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_auth_events_mutation();

CREATE TRIGGER trg_prevent_truncate_auth_events
    BEFORE TRUNCATE ON auth_events
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

-- 4. Default partition (so unexpected dates never fail insertion)
CREATE TABLE auth_partitions.auth_events_default PARTITION OF auth_events DEFAULT;

-- 5. Partition creation and management function
CREATE OR REPLACE FUNCTION fn_ensure_auth_event_partitions(p_months_ahead int)
RETURNS void AS $$
DECLARE
    v_target_date date;
    v_start timestamptz;
    v_end timestamptz;
    v_partition_name text;
    v_conflict_count bigint;
    i int;
BEGIN
    -- From previous month (-1) to p_months_ahead
    FOR i IN -1..p_months_ahead LOOP
        v_target_date := (date_trunc('month', clock_timestamp()) + (i || ' month')::interval)::date;
        v_start := v_target_date::timestamptz;
        v_end := (v_target_date + interval '1 month')::timestamptz;
        v_partition_name := 'auth_events_' || to_char(v_target_date, 'YYYY_MM');

        -- Detect if default partition already has rows that would overlap the new partition
        IF EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'auth_partitions' AND c.relname = 'auth_events_default'
        ) THEN
            EXECUTE format(
                'SELECT count(*) FROM auth_partitions.auth_events_default WHERE created_at >= %L AND created_at < %L',
                v_start, v_end
            ) INTO v_conflict_count;

            IF v_conflict_count > 0 THEN
                RAISE EXCEPTION 'Cannot create partition auth_partitions.%: auth_partitions.auth_events_default contains % rows overlapping [%, %)',
                    v_partition_name, v_conflict_count, v_start, v_end;
            END IF;
        END IF;

        -- Create partition if it does not exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'auth_partitions' AND c.relname = v_partition_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE auth_partitions.%I PARTITION OF auth_events FOR VALUES FROM (%L) TO (%L)',
                v_partition_name, v_start, v_end
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Initial pre-provisioning for previous month through 12 months ahead
SELECT fn_ensure_auth_event_partitions(12);

-- 6. Indexes on partitioned table
CREATE INDEX ix_auth_events_emp_created
    ON auth_events (emp_id, created_at DESC)
    WHERE emp_id IS NOT NULL;

CREATE INDEX ix_auth_events_ip_created
    ON auth_events (ip_address, created_at DESC)
    WHERE ip_address IS NOT NULL;

CREATE INDEX ix_auth_events_type_created
    ON auth_events (event_type, created_at DESC);

-- 7. Explicit Grants
GRANT USAGE ON SCHEMA auth_partitions TO pulse_app;
GRANT SELECT, INSERT ON auth_events TO pulse_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;

-- migrate:down
REVOKE SELECT, INSERT ON auth_events FROM pulse_app;
REVOKE USAGE ON SCHEMA auth_partitions FROM pulse_app;

DROP TRIGGER IF EXISTS trg_prevent_truncate_auth_events ON auth_events;
DROP TRIGGER IF EXISTS trg_prevent_auth_events_delete ON auth_events;
DROP TRIGGER IF EXISTS trg_prevent_auth_events_update ON auth_events;

DROP TABLE IF EXISTS auth_events CASCADE;
DROP SCHEMA IF EXISTS auth_partitions CASCADE;

DROP FUNCTION IF EXISTS fn_ensure_auth_event_partitions(int);
DROP FUNCTION IF EXISTS fn_prevent_auth_events_mutation();
