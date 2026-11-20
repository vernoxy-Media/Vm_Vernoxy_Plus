-- migrate:up
-- "Mark as Won and Convert to Client" failed with a server error when the CLIENT counter was behind the Client IDs
-- that already exist (for example after a restore): the next code it handed out was one that was already taken.
-- 1) bring the counter up to the highest Client ID in use, 2) make the trigger skip any code that is taken.
INSERT INTO entity_counters (entity_type, counter_key, last_number)
SELECT 'CLIENT', 'GLOBAL',
       GREATEST(
           COALESCE((SELECT MAX(substring(client_code FROM 5)::integer) FROM clients WHERE client_code ~ '^CLI-[0-9]{1,9}$'), 0),
           COALESCE((SELECT MAX(substring(client_code FROM 5)::integer) FROM companies WHERE client_code ~ '^CLI-[0-9]{1,9}$'), 0)
       )
ON CONFLICT (entity_type, counter_key)
DO UPDATE SET last_number = GREATEST(entity_counters.last_number, EXCLUDED.last_number);

CREATE OR REPLACE FUNCTION fn_clients_assign_code()
RETURNS trigger AS $$
DECLARE
    v_next integer;
    v_code text;
BEGIN
    IF NEW.client_code IS NULL OR btrim(NEW.client_code) = '' THEN
        LOOP
            INSERT INTO entity_counters (entity_type, counter_key, last_number)
            VALUES ('CLIENT', 'GLOBAL', 1)
            ON CONFLICT (entity_type, counter_key)
            DO UPDATE SET last_number = entity_counters.last_number + 1
            RETURNING last_number INTO v_next;
            v_code := 'CLI-' || lpad(v_next::text, 4, '0');
            -- never hand out a code that a client or a company already has
            EXIT WHEN NOT EXISTS (SELECT 1 FROM clients WHERE client_code = v_code)
                  AND NOT EXISTS (SELECT 1 FROM companies WHERE client_code = v_code);
        END LOOP;
        NEW.client_code := v_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- migrate:down
-- The earlier version of the function is restored by the clients migration; nothing to undo here.
SELECT 1;
