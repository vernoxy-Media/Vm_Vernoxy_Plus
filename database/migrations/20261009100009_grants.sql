-- migrate:up

-- 1. Grant SELECT, INSERT, UPDATE on all 12 tables to pulse_app (NO DELETE, NO TRUNCATE)
GRANT SELECT, INSERT, UPDATE ON
    departments,
    roles,
    employees,
    industries,
    customer_types,
    master_lookup,
    pipeline_stages,
    companies,
    company_channels,
    persons,
    company_persons,
    leads
TO pulse_app;

-- Grant USAGE, SELECT on all sequences to pulse_app
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;

-- 2. Grant SELECT only on all 12 tables to pulse_readonly
GRANT SELECT ON
    departments,
    roles,
    employees,
    industries,
    customer_types,
    master_lookup,
    pipeline_stages,
    companies,
    company_channels,
    persons,
    company_persons,
    leads
TO pulse_readonly;

-- migrate:down
REVOKE SELECT ON
    departments,
    roles,
    employees,
    industries,
    customer_types,
    master_lookup,
    pipeline_stages,
    companies,
    company_channels,
    persons,
    company_persons,
    leads
FROM pulse_readonly;

REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public FROM pulse_app;

REVOKE SELECT, INSERT, UPDATE ON
    departments,
    roles,
    employees,
    industries,
    customer_types,
    master_lookup,
    pipeline_stages,
    companies,
    company_channels,
    persons,
    company_persons,
    leads
FROM pulse_app;
