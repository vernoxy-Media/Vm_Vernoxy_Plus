-- migrate:up
-- Desktop notifications that arrive even when the app is not open in a browser tab (Web Push).
-- Each browser a person allows notifications in is one row: the address of that browser's push service and its keys.
CREATE TABLE IF NOT EXISTS push_subscriptions (
    subscription_id integer GENERATED ALWAYS AS IDENTITY,
    emp_id integer NOT NULL,
    endpoint text NOT NULL,
    p256dh varchar(200) NOT NULL,
    auth varchar(100) NOT NULL,
    user_agent varchar(300),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_push_subscriptions PRIMARY KEY (subscription_id),
    CONSTRAINT fk_push_subscriptions_emp FOREIGN KEY (emp_id) REFERENCES employees (emp_id) ON DELETE CASCADE
);

-- One browser is one row, even if the same person signs in again or another person uses it
CREATE UNIQUE INDEX IF NOT EXISTS ux_push_subscriptions_endpoint ON push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS ix_push_subscriptions_emp ON push_subscriptions (emp_id);

-- migrate:down
DROP TABLE IF EXISTS push_subscriptions;
