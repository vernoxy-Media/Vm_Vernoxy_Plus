
-- migrate:up
-- 1. companies
CREATE TABLE companies (
    company_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(255) NOT NULL,
    parent_company_id integer,
    customer_type_id integer NOT NULL,
    industry_id integer NOT NULL,
    sub_industry_id integer,
    address text,
    city varchar(100),
    state varchar(100),
    country varchar(100),
    owner_id integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_companies PRIMARY KEY (company_id),
    CONSTRAINT fk_companies_parent_company_id FOREIGN KEY (parent_company_id) REFERENCES companies(company_id),
    CONSTRAINT fk_companies_customer_type_id FOREIGN KEY (customer_type_id) REFERENCES customer_types(customer_type_id),
    CONSTRAINT fk_companies_industry_id FOREIGN KEY (industry_id) REFERENCES industries(industry_id),
    CONSTRAINT fk_companies_sub_industry_id FOREIGN KEY (sub_industry_id) REFERENCES industries(industry_id),
    CONSTRAINT fk_companies_owner_id FOREIGN KEY (owner_id) REFERENCES employees(emp_id),
    CONSTRAINT ck_companies_name_non_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT ck_companies_parent_diff CHECK (parent_company_id IS NULL OR parent_company_id <> company_id),
    CONSTRAINT ck_companies_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- 2. company_channels
CREATE TABLE company_channels (
    channel_id integer GENERATED ALWAYS AS IDENTITY,
    company_id integer NOT NULL,
    channel_type channel_type NOT NULL,
    value varchar(300) NOT NULL,
    label varchar(100),
    is_primary boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_company_channels PRIMARY KEY (channel_id),
    CONSTRAINT fk_company_channels_company_id FOREIGN KEY (company_id) REFERENCES companies(company_id),
    CONSTRAINT ck_company_channels_value_non_blank CHECK (length(btrim(value)) > 0),
    CONSTRAINT ck_company_channels_value_format CHECK (
        CASE
            WHEN channel_type = 'email' THEN value ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
            WHEN channel_type IN ('phone', 'whatsapp') THEN value ~ '^\+?[0-9]{7,15}$'
            ELSE value ~* '^https?://'
        END
    ),
    CONSTRAINT ck_company_channels_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- 3. persons
CREATE TABLE persons (
    person_id integer GENERATED ALWAYS AS IDENTITY,
    name varchar(150) NOT NULL,
    email varchar(255),
    mobile varchar(20),
    linkedin_url varchar(300),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_persons PRIMARY KEY (person_id),
    CONSTRAINT ck_persons_name_non_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT ck_persons_contact_required CHECK (email IS NOT NULL OR mobile IS NOT NULL),
    CONSTRAINT ck_persons_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT ck_persons_mobile_format CHECK (mobile IS NULL OR mobile ~ '^\+?[0-9]{7,15}$'),
    CONSTRAINT ck_persons_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- 4. company_persons
CREATE TABLE company_persons (
    company_person_id integer GENERATED ALWAYS AS IDENTITY,
    company_id integer NOT NULL,
    person_id integer NOT NULL,
    designation varchar(100),
    department_id integer,
    is_primary boolean NOT NULL DEFAULT false,
    reports_to_id integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz,
    updated_by integer,
    deleted_at timestamptz,
    deleted_by integer,
    CONSTRAINT pk_company_persons PRIMARY KEY (company_person_id),
    CONSTRAINT fk_company_persons_company_id FOREIGN KEY (company_id) REFERENCES companies(company_id),
    CONSTRAINT fk_company_persons_person_id FOREIGN KEY (person_id) REFERENCES persons(person_id),
    CONSTRAINT fk_company_persons_department_id FOREIGN KEY (department_id) REFERENCES departments(dep_id),
    CONSTRAINT fk_company_persons_reports_to_id FOREIGN KEY (reports_to_id) REFERENCES company_persons(company_person_id),
    CONSTRAINT ck_company_persons_reports_to_diff CHECK (reports_to_id IS NULL OR reports_to_id <> company_person_id),
    CONSTRAINT ck_company_persons_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

-- migrate:down
DROP TABLE IF EXISTS company_persons CASCADE;
DROP TABLE IF EXISTS persons CASCADE;
DROP TABLE IF EXISTS company_channels CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
