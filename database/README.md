# Vernoxy Pulse — Database Architecture & Migrations

This repository contains the PostgreSQL database schema, migrations, baseline seeds, and test suites for **Vernoxy Pulse** (Sales CRM + HRMS), targeted for **Neon Serverless PostgreSQL (16/17)**.

---

## 1. Core Principles & Hard Rules

1. **Plain SQL Migrations Only**:
   - Tables, indexes, triggers, constraints, enums, extensions, and grants are created **ONLY** by SQL files in `database/migrations` executed via `dbmate`.
   - **NEVER** use `prisma migrate`, `prisma db push`, TypeORM synchronize, or any ORM schema sync.
2. **Prisma by Introspection**:
   - `apps/api/prisma/schema.prisma` is **GENERATED** by introspection via `prisma db pull` (followed by `prisma generate`).
   - Never hand-edit `prisma/schema.prisma`.
3. **No Hard Deletes (Rule A)**:
   - Across all 12 tables, hard `DELETE` and `TRUNCATE` operations are strictly blocked by triggers (`fn_prevent_hard_delete` and `fn_prevent_truncate`).
   - Soft delete is implemented by setting `deleted_at` and `deleted_by`.
   - All tables enforce: `CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)`.
   - Row updates maintain immutable audit tracking (`created_at` and `created_by` cannot be modified).
4. **Secrets Hygiene**:
   - Never commit `.env` or connection strings. Use `.env.example` as a template.
   - Scripts and logs redact database credentials.

---

## 2. Neon PostgreSQL Architecture

### Connection Strings

Neon provides two distinct connection endpoints:
- **`DATABASE_URL` (Pooled Connection)**:
  - Host contains `-pooler` (e.g., `ep-xyz-pooler.us-east-2.aws.neon.tech`).
  - Utilizes PgBouncer in transaction mode.
  - Used by the running NestJS API application and Prisma Client at runtime.
  - Must append: `?sslmode=require&pgbouncer=true`.
- **`DIRECT_URL` (Direct Connection)**:
  - Non-pooled direct PostgreSQL endpoint (e.g., `ep-xyz.us-east-2.aws.neon.tech`).
  - Used by `dbmate` for migrations and Prisma CLI for introspection (`prisma db pull`).
  - Must append: `?sslmode=require`.

> [!WARNING]
> Migrations must **ALWAYS** run against `DIRECT_URL`. Running migrations against a PgBouncer pooled connection breaks schema migrations and transactional DDL.

### Role Management on Neon

In Neon, login roles and users are provisioned in the Neon console.
Our migrations configure two group roles:
- `pulse_app`: Has `SELECT`, `INSERT`, `UPDATE` on all 12 tables and `USAGE, SELECT` on all sequences. Never receives `DELETE` or `TRUNCATE`.
- `pulse_readonly`: Has `SELECT` only on all 12 tables.

To grant application privileges to a Neon console user:
```sql
GRANT pulse_app TO "<neon_login_user>";
```

---

## 3. Migration Run Order

Migrations are ordered chronologically and executed in sequence:

1. `20261009100001_extensions_enums_roles.sql`:
   - `pg_trgm` extension
   - Enums: `employee_status`, `channel_type`, `lead_status`
   - NOLOGIN group roles `pulse_app` and `pulse_readonly`
   - Database timezone set to UTC
2. `20261009100002_org_tables.sql`:
   - `departments`, `roles`, `employees`
3. `20261009100003_master_tables.sql`:
   - `industries`, `customer_types`, `master_lookup`, `pipeline_stages`
4. `20261009100004_crm_tables.sql`:
   - `companies`, `company_channels`, `persons`, `company_persons`
5. `20261009100005_leads_table.sql`:
   - `leads`
6. `20261009100006_audit_foreign_keys_and_soft_delete.sql`:
   - Circular audit FKs (`created_by`, `updated_by`, `deleted_by` -> `employees.emp_id`)
   - Hard-delete prevention triggers & audit immutability triggers
7. `20261009100007_integrity_triggers.sql`:
   - Hierarchy cycle prevention (`fn_prevent_hierarchy_cycle` for employees, companies, company_persons)
   - Max 2 levels for industries & sub-industry child prevention
   - Company industry/sub-industry hierarchy validation
   - Cross-company `reports_to` prevention
   - Lead status, stage consistency, and lookup type validations
8. `20261009100008_indexes.sql`:
   - Partial unique indexes (`WHERE deleted_at IS NULL`) with `lower()` for text
   - Trigram GIN indexes on `companies(lower(name))` and `persons(lower(name))`
   - Keyset pagination indexes, foreign key partial indexes, covering forecast indexes
9. `20261009100009_grants.sql`:
   - Grants for `pulse_app` and `pulse_readonly`
10. `20261009100010_company_persons_department_master_lookup.sql`:
   - Moves `company_persons.department_id` FK from `departments(dep_id)` to `master_lookup(lookup_id)`
   - Trigger `trg_company_persons_department_lookup` enforcing `master_lookup.lookup_type = 'person_department'` (skipped during soft deletion)
   - Partial index `ix_company_persons_department_id` (`WHERE deleted_at IS NULL`)
   - Full down migration restoring FK to `departments(dep_id)`
11. `20261010100011_auth_enums.sql`:
   - Enums: `otp_purpose` (`login_2fa`, `password_reset`), `session_revoke_reason` (`logout`, `logout_all`, `password_changed`, `password_reset`, `token_reuse_detected`, `deactivated`, `admin_revoked`), `auth_event_type` (15 event types).
12. `20261010100012_employee_credentials.sql`:
   - `employee_credentials` table with argon2id regex format check (`^\$argon2id\$`), audit triggers, partial unique index `(emp_id) WHERE deleted_at IS NULL`.
13. `20261010100013_auth_sessions.sql`:
   - `auth_sessions` table with SHA-256 hex hash checks (`^[0-9a-f]{64}$`), revocation consistency check `(revoked_at IS NULL) = (revoked_reason IS NULL)`, reuse detection index, and active sessions index.
14. `20261010100014_otp_codes.sql`:
   - `otp_codes` table with email regex check, partial unique index `(emp_id, purpose) WHERE consumed_at IS NULL AND voided_at IS NULL AND deleted_at IS NULL` ensuring at most ONE open challenge code per employee and purpose.
15. `20261010100015_auth_events.sql`:
   - `auth_events` range-partitioned table (`PRIMARY KEY (event_id, created_at)`), append-only enforcement triggers (`BEFORE UPDATE`/`BEFORE DELETE`/`BEFORE TRUNCATE` raise exception), separate `auth_partitions` schema, default partition, and pre-provisioning function `fn_ensure_auth_event_partitions(p_months_ahead int)`.
16. `20261010100016_auth_safety_triggers.sql`:
   - Defense-in-depth safety trigger `trg_employee_deactivation_safety` on `employees`: whenever an employee is updated to `status = 'Inactive'` or `deleted_at IS NOT NULL`, automatically revokes all open sessions (`revoked_reason = 'deactivated'`) and voids all open OTP codes (`voided_at = now()`).

---

## 4. Workflow for New Migrations & Grants Matrix

To introduce schema modifications:

1. Generate a new migration file:
   ```bash
   pnpm db:new <migration_name>
   ```
2. Edit the newly created file in `database/migrations/`:
   - Provide standard `-- migrate:up` and `-- migrate:down` blocks.
   - Follow naming conventions (`pk_`, `fk_`, `ck_`, `ux_`, `ix_`, `trg_`, `fn_`).
3. Apply migration:
   ```bash
   pnpm db:migrate
   ```
4. Verify rollback capability (in local dev):
   ```bash
   pnpm db:rollback
   pnpm db:migrate
   ```
5. Synchronize Prisma schema & client via introspection:
   ```bash
   pnpm db:pull
   pnpm db:generate
   ```
6. Run database test suite:
   ```bash
   pnpm db:test
   ```

> [!IMPORTANT]
> **Rollback & Down Migration Policy**: Down migrations are for local development and feature branches only. **Never run `db:rollback` on production environments**; always fix forward with a new migration.

### Explicit Grants Matrix

Every migration creating a table must include explicit grants and matching revokes:

| Table Category | Tables | `pulse_app` Privileges | `pulse_readonly` Privileges |
|---|---|---|---|
| **Domain Tables (12)** | `companies`, `company_channels`, `company_persons`, `customer_types`, `departments`, `employees`, `industries`, `leads`, `master_lookup`, `persons`, `pipeline_stages`, `roles` | `SELECT`, `INSERT`, `UPDATE` | `SELECT` |
| **Soft-Delete Auth Tables (3)** | `employee_credentials`, `auth_sessions`, `otp_codes` | `SELECT`, `INSERT`, `UPDATE` | **NONE** (No access) |
| **Append-Only Auth Table (1)** | `auth_events` (and child partitions) | `SELECT`, `INSERT` | **NONE** (No access) |
| **Sequences** | All sequences in `public` | `USAGE`, `SELECT` | **NONE** |

> [!WARNING]
> `pulse_readonly` has **ZERO** access to authentication tables. Security credentials, token hashes, and IP audit trails are strictly shielded from read-only reporting users. Neither role is ever granted `DELETE` or `TRUNCATE`.

---

## 5. Authentication Architecture & Partitioning Policy

### System / Bootstrap Auditing Convention
- Rows created directly by system processes (such as during login, token refresh, OTP issuance, or the initial bootstrap script) store **`created_by = NULL`**.
- Manual rows created by authenticated administrators store `created_by = <admin_emp_id>`.

### Append-Only & Range Partitioning Policy for `auth_events`
- **Zero Modifications**: `auth_events` is strictly append-only. Triggers block any `UPDATE`, `DELETE`, or `TRUNCATE` operations.
- **Partition Isolation**: Child partitions are placed in a dedicated schema (`auth_partitions.auth_events_YYYY_MM`). Because Prisma introspects the `public` schema, child partitions never pollute application models.
- **Default Partition Fallback**: `auth_partitions.auth_events_default` exists to catch any events outside the partitioned monthly windows without causing transaction aborts.
- **Partition Maintenance**: A monthly cron job must call `SELECT fn_ensure_auth_event_partitions(12);` with a safe lead time (maintains partitions for 12 months ahead). If unexpected rows exist in the default partition that would overlap a newly created range, the function detects them and raises a descriptive exception.
- **Data Lifecycle**: Old event partitions are never hard deleted; they are detached via `ALTER TABLE auth_events DETACH PARTITION auth_partitions.auth_events_YYYY_MM;` and archived to cold object storage.

---

## 6. First Admin Bootstrap Script

Bootstrap the initial system administrator using:
```bash
pnpm bootstrap:admin
```
Or with environment variable overrides:
```bash
BOOTSTRAP_ADMIN_NAME="System Admin" \
BOOTSTRAP_ADMIN_EMAIL="admin@vernoxy.pulse" \
BOOTSTRAP_ADMIN_MOBILE="+919988776655" \
pnpm bootstrap:admin
```

### Behavior
- Connects using `DIRECT_URL`.
- Prompts for administrator name, email, and mobile (or reads from env).
- Password is read via a **hidden interactive prompt** (terminal echo suppressed, minimum 12 characters; `BOOTSTRAP_ADMIN_PASSWORD` is permitted for CI only).
- Fails clearly if the seeded `Admin` role or `Admin` department is missing.
- **Idempotent**: If an active employee with the `Admin` role already exists, logs an informational notice and exits 0 without modifying the database.
- Otherwise, executes in **ONE atomic transaction**:
  1. Inserts active employee (`joining_date = CURRENT_DATE`, `created_by = NULL`).
  2. Inserts `employee_credentials` row using Argon2id (`memoryCost: 65536`, `timeCost: 3`, `parallelism: 1`).
  3. Inserts `auth_events` row with `event_type = 'credentials_created'` and `details = {"source": "bootstrap"}`.
- Never logs or outputs plaintext passwords or hashes.

---

## 7. Baseline Seeds (Insert-Only Bootstrapping)

Baseline seed data is maintained in `database/seeds/01_baseline_seeds.sql` (strictly insert-only using `ON CONFLICT DO NOTHING`) and run via `pnpm db:seed`:

### Contents
- **Canonical Roles (8)**: `Admin`, `Sales`, `Project Management`, `BA`, `QA`, `Developer`, `Graphic Designer`, `Intern`. There is no HR role. HR work is done by users with the Admin role.
- **Canonical Internal Departments (7)**: `Management`, `Sales and Marketing`, `Technology`, `Product and Analysis`, `Creative`, `Operations`, `Admin`.
- **Customer Types (5)**: `Info Only`, `Lead`, `Prospect`, `Client`, `Partner`.
- **Pipeline Stages (7)**: `New` (10%), `Contacted` (20%), `Qualified` (40%), `Proposal Sent` (60%), `Negotiation` (80%), `Won` (100%, `is_won=true`), `Lost` (0%, `is_lost=true`).
- **Master Lookup (30)**:
  - `lead_source` (12): `website`, `referral`, `cold_call`, `email_campaign`, `whatsapp`, `linkedin`, `exhibition`, `existing_client`, `partner`, `indiamart_justdial`, `walk_in`, `other`.
  - `lost_reason` (9): `price_high`, `chose_competitor`, `no_budget`, `no_response`, `requirement_changed`, `bad_timing`, `not_a_fit`, `duplicate`, `other`.
  - `person_department` (9): `purchase`, `accounts`, `sales`, `hr`, `operations`, `it`, `management`, `production`, `other`.
- **Industries (22)**:
  - 17 top-level: `Unclassified` (sorts first with `parent_id IS NULL`), `Manufacturing`, `Textile and Apparel`, `Diamond and Jewellery`, `Chemicals and Pharma`, `Engineering and Machinery`, `Retail and E-commerce`, `Education`, `Healthcare`, `Real Estate and Construction`, `Logistics and Transport`, `Banking and Finance`, `IT and Software`, `Hospitality and Travel`, `Agriculture and Food Processing`, `Government and PSU`, `Other`.
  - 5 sub-industries under `Textile and Apparel`: `Weaving`, `Embroidery`, `Dyeing and Printing`, `Garments`, `Trading`.

### Insert-Only / Production Rule
> [!CAUTION]
> Seeds are strictly **insert-only** using `ON CONFLICT DO NOTHING` (no `DO UPDATE`, no `UPDATE`, and no soft deletes). They are intended for initial bootstrapping on developer machines and fresh environments. **Do NOT re-run seeds on production after users or administrators edit master data**, as re-running seeds could cause unintended conflicts or insert stale defaults.

---

## 8. Performance Baselines

### A. Auth Benchmark (1,000,000 Sessions & 5,000,000 Partitioned Events)
Executed on throwaway database on local PostgreSQL 18 after `VACUUM (ANALYZE)`:

| Query | Target Index / Mechanism | Cold Time | Warm Time | Warm Buffers | Plan Node |
|---|---|---|---|---|---|
| **Query 1: Session by refresh_token_hash** | `ux_auth_sessions_refresh_token_hash` | 0.799 ms | **0.098 ms** | 5 hit, 0 read | Index Scan |
| **Query 2: Session by previous_token_hash** | `ix_auth_sessions_previous_token_hash` | 0.535 ms | **0.058 ms** | 4 hit, 0 read | Index Scan |
| **Query 3: Active sessions for employee** | `ix_auth_sessions_active` | 20.658 ms | **0.658 ms** | 1006 hit, 0 read | Bitmap Heap Scan |
| **Query 4: Last 20 events in 30 days** | `ix_auth_events_emp_created` | 0.863 ms | **0.048 ms** | 99 hit, 0 read | Append / Partition Pruned (11/12 pruned) |
| **Query 5: Failed logins by IP in 1 hr** | `ix_auth_events_ip_created` | 0.547 ms | **0.042 ms** | 21 hit, 0 read | Append / Partition Pruned (11/12 pruned) |
| **Query 6: Open OTP lookup** | `ux_otp_codes_open` | 0.035 ms | **0.015 ms** | 2 hit, 0 read | Index Scan |

### B. CRM & Leads Benchmark (6,000,000 Rows)
- `companies`: 1,000,000 rows.
- `persons`: 3,000,000 rows.
- `leads`: 2,000,000 rows.

| Query | Access Pattern & Node Type | Cold Execution | Warm Execution | Buffers (Warm) | Heap Fetches |
|---|---|---|---|---|---|
| **Rare Company Search** (`LIKE '%zq7%'`) | `Bitmap Index Scan on ix_companies_name_trgm` | 0.820 ms | **0.033 ms** | 10 hit, 0 read | N/A |
| **Common Company Search** (`LIKE '%corp%'`, LIMIT 50) | `Bitmap Index Scan on ix_companies_name_trgm` | 68.445 ms | **41.336 ms** | 875 hit, 0 read | N/A |
| **Keyset Pagination** (Page of 50 companies) | `Index Scan using ix_companies_keyset` | 0.194 ms | **0.056 ms** | 31 hit, 0 read | N/A |
| **Leads by Owner + Status** (Top 50 open leads) | `Index Scan using ix_leads_owner_status_close_date` | 0.723 ms | **0.054 ms** | 106 hit, 0 read | N/A |
| **Open Forecast** (Next 12 months grouped by month) | `Parallel Index Only Scan using ix_leads_open_forecast` | 553.688 ms | **153.541 ms** | 32,833 hit, 0 read | **0** |
| **Won Revenue** (Last 12 months grouped by month) | `Parallel Index Only Scan using ix_leads_won_revenue` | 192.395 ms | **136.326 ms** | 9,428 hit, 0 read | **0** |

---

## 9. Commands Reference

| Command | Action |
|---|---|
| `pnpm db:migrate` | Runs pending migrations via dbmate (`dbmate up`) |
| `pnpm db:rollback` | Reverts the last applied migration (`dbmate down`, dev/test only) |
| `pnpm db:status` | Shows migration status across all 16 migrations |
| `pnpm db:seed` | Idempotently populates baseline lookup & seed data |
| `pnpm db:test` | Runs full functional SQL test suite (16 groups, 99 assertions, rolled back) |
| `pnpm db:verify-fresh` | Verifies clean database initialization, 16 public tables, isolated `dbmate` schema, and seed idempotency |
| `pnpm bootstrap:admin` | Bootstraps first system administrator and credentials |
| `pnpm db:pull` | Re-introspects schema into `apps/api/prisma/schema.prisma` (discovers 16 models) |
| `pnpm db:generate` | Generates `@prisma/client` code |
| `pnpm arch:check` | Verifies clean-architecture dependency boundary rules via dependency-cruiser |
| `pnpm build` | Compiles API via Turborepo |
| `pnpm test` | Runs unit tests (PasswordPolicy, Argon2PasswordHasher) & E2E integration tests |
| `pnpm openapi:export` | Exports OpenAPI 3.1 specification to `contracts/openapi/openapi.json` |

---

## 10. Deviations / Open Issues

1. **Non-unique Person Contact Indexes (`ix_persons_email`, `ix_persons_mobile`)**:
   - In accordance with the DBML specification, `persons.email` and `persons.mobile` are indexed using partial non-unique B-tree indexes (`ix_persons_email` on `lower(email)` and `ix_persons_mobile` on `mobile` `WHERE deleted_at IS NULL`) created in migration `20261009100008_indexes.sql`.
   - They are intentionally **not** unique constraints (`ux_*`) so that multiple external contacts across different partner companies may share generic emails (e.g. `info@partner.com`) or switch organizations without blocking record creation.

2. **Absence of `pan` Column on `companies`**:
   - The `companies` table created in migration `20261009100004_crm_tables.sql` does not include a `pan` column or a `ux_companies_pan` index.
   - If statutory PAN tracking or organization-wide tax deduplication is required for companies, it will be added in a future CRM migration after approval.
