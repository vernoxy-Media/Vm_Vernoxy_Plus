-- migrate:up
-- Each employee can pick the colour theme of the app. Empty (NULL) means the default theme.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ui_theme varchar(30);

-- migrate:down
ALTER TABLE employees DROP COLUMN IF EXISTS ui_theme;
