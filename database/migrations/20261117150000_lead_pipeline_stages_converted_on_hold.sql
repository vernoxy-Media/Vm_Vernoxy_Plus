-- migrate:up
-- "Mark as Won and Convert to Client" (and "Put on hold") failed with a server error on databases whose pipeline stages
-- were set up before the lead module: the lead trigger looks a stage up by the lead's status name and raised
-- 'No pipeline stage named "Converted"'. Add the two stages the lead module needs when they are missing.
-- Safe to repeat: a stage that already exists (any spelling of the name) is left alone.
INSERT INTO pipeline_stages (name, sort_order, win_probability, is_won, is_lost, is_active)
SELECT v.name, v.sort_order, v.win_probability, v.is_won, v.is_lost, true
FROM (VALUES
    ('Converted', 40, 100, true,  false),
    ('On Hold',   60,  10, false, false)
) AS v(name, sort_order, win_probability, is_won, is_lost)
WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_stages p
    WHERE lower(p.name) = lower(v.name) AND p.deleted_at IS NULL
);

-- migrate:down
-- The stages may already be in use by leads, so they are not removed.
SELECT 1;
