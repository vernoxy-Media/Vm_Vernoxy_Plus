-- =============================================================================
-- Vernoxy Pulse Insert-Only Baseline Seeds
-- =============================================================================

-- (Roles and Departments are removed from baseline seeds; seeded/created via bootstrap:admin and Organization Management)

-- 1. Customer Types
INSERT INTO customer_types (name, is_default)
VALUES
    ('Info Only', true),
    ('Lead', false),
    ('Prospect', false),
    ('Client', false),
    ('Partner', false)
ON CONFLICT (lower(name)) WHERE deleted_at IS NULL
DO NOTHING;

-- 4. Pipeline Stages
INSERT INTO pipeline_stages (name, sort_order, win_probability, is_won, is_lost)
VALUES
    ('New', 10, 10, false, false),
    ('Contacted', 20, 20, false, false),
    ('Qualified', 30, 40, false, false),
    ('Proposal Sent', 40, 60, false, false),
    ('Negotiation', 50, 80, false, false),
    ('Won', 60, 100, true, false),
    ('Lost', 70, 0, false, true)
ON CONFLICT (lower(name)) WHERE deleted_at IS NULL
DO NOTHING;

-- 5. Master Lookup: lead_source
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('lead_source', 'website', 'Website', 10),
    ('lead_source', 'referral', 'Referral', 20),
    ('lead_source', 'cold_call', 'Cold Call', 30),
    ('lead_source', 'email_campaign', 'Email Campaign', 40),
    ('lead_source', 'whatsapp', 'WhatsApp', 50),
    ('lead_source', 'linkedin', 'LinkedIn', 60),
    ('lead_source', 'exhibition', 'Exhibition / Trade Fair', 70),
    ('lead_source', 'existing_client', 'Existing Client', 80),
    ('lead_source', 'partner', 'Partner', 90),
    ('lead_source', 'indiamart_justdial', 'IndiaMART / Justdial', 100),
    ('lead_source', 'walk_in', 'Walk In', 110),
    ('lead_source', 'other', 'Other', 120)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- 6. Master Lookup: lost_reason
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('lost_reason', 'price_high', 'Price Too High', 10),
    ('lost_reason', 'chose_competitor', 'Chose Competitor', 20),
    ('lost_reason', 'no_budget', 'No Budget', 30),
    ('lost_reason', 'no_response', 'No Response / Ghosted', 40),
    ('lost_reason', 'requirement_changed', 'Requirement Changed', 50),
    ('lost_reason', 'bad_timing', 'Bad Timing / Deferred', 60),
    ('lost_reason', 'not_a_fit', 'Not a Good Fit', 70),
    ('lost_reason', 'duplicate', 'Duplicate Lead', 80),
    ('lost_reason', 'other', 'Other', 90)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- 7. Master Lookup: person_department (Customer contact departments)
INSERT INTO master_lookup (lookup_type, code, label, sort_order)
VALUES
    ('person_department', 'purchase', 'Purchase', 10),
    ('person_department', 'accounts', 'Accounts', 20),
    ('person_department', 'sales', 'Sales', 30),
    ('person_department', 'hr', 'Human Resources', 40),
    ('person_department', 'operations', 'Operations', 50),
    ('person_department', 'it', 'Information Technology', 60),
    ('person_department', 'management', 'Management', 70),
    ('person_department', 'production', 'Production', 80),
    ('person_department', 'other', 'Other', 90)
ON CONFLICT (lookup_type, code) WHERE deleted_at IS NULL
DO NOTHING;

-- 8. Industries (Top-level)
-- Unclassified sorts first
INSERT INTO industries (name, parent_id, is_default)
VALUES
    ('Unclassified', NULL, true),
    ('Manufacturing', NULL, false),
    ('Textile and Apparel', NULL, false),
    ('Diamond and Jewellery', NULL, false),
    ('Chemicals and Pharma', NULL, false),
    ('Engineering and Machinery', NULL, false),
    ('Retail and E-commerce', NULL, false),
    ('Education', NULL, false),
    ('Healthcare', NULL, false),
    ('Real Estate and Construction', NULL, false),
    ('Logistics and Transport', NULL, false),
    ('Banking and Finance', NULL, false),
    ('IT and Software', NULL, false),
    ('Hospitality and Travel', NULL, false),
    ('Agriculture and Food Processing', NULL, false),
    ('Government and PSU', NULL, false),
    ('Other', NULL, false)
ON CONFLICT (lower(name)) WHERE parent_id IS NULL AND deleted_at IS NULL
DO NOTHING;

-- 9. Sub-industries of 'Textile and Apparel'
DO $$
DECLARE
    v_textile_id integer;
BEGIN
    SELECT industry_id INTO v_textile_id
    FROM industries
    WHERE lower(name) = 'textile and apparel' AND parent_id IS NULL AND deleted_at IS NULL;

    IF v_textile_id IS NOT NULL THEN
        INSERT INTO industries (name, parent_id)
        VALUES
            ('Weaving', v_textile_id),
            ('Embroidery', v_textile_id),
            ('Dyeing and Printing', v_textile_id),
            ('Garments', v_textile_id),
            ('Trading', v_textile_id)
        ON CONFLICT (parent_id, lower(name)) WHERE parent_id IS NOT NULL AND deleted_at IS NULL
        DO NOTHING;
    END IF;
END $$;
