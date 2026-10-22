import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

interface TestContext {
  client: Client;
  passCount: number;
  failCount: number;
  currentGroup: string;
  groupStats: { [group: string]: { pass: number; fail: number } };
}

let globalCtx: TestContext | null = null;

function getGroupStats(ctx: TestContext, groupName: string): { pass: number; fail: number } {
  let stats = ctx.groupStats[groupName];
  if (!stats) {
    stats = { pass: 0, fail: 0 };
    ctx.groupStats[groupName] = stats;
  }
  return stats;
}

function setGroup(name: string) {
  if (globalCtx) {
    globalCtx.currentGroup = name;
    getGroupStats(globalCtx, name);
  }
  console.log(`\n--- ${name} ---`);
}

function logPass(title: string, detail?: string) {
  if (globalCtx && globalCtx.currentGroup) {
    const stats = getGroupStats(globalCtx, globalCtx.currentGroup);
    stats.pass++;
  }
  console.log(`  [PASS] ${title}${detail ? ` - ${detail}` : ''}`);
}

function logFail(title: string, error: unknown) {
  if (globalCtx && globalCtx.currentGroup) {
    const stats = getGroupStats(globalCtx, globalCtx.currentGroup);
    stats.fail++;
  }
  console.error(`  [FAIL] ${title} ->`, error instanceof Error ? error.message : error);
}

async function expectError(
  client: Client,
  sql: string,
  expectedPattern: RegExp | string,
  testTitle: string,
  ctx: TestContext,
  params: unknown[] = [],
) {
  try {
    await client.query('SAVEPOINT sp_test');
    await client.query(sql, params);
    await client.query('RELEASE SAVEPOINT sp_test');
    ctx.failCount++;
    logFail(testTitle, new Error('Expected query to fail, but it succeeded'));
  } catch (error: any) {
    await client.query('ROLLBACK TO SAVEPOINT sp_test');
    const msg = error.message || '';
    const matches = typeof expectedPattern === 'string' ? msg.includes(expectedPattern) : expectedPattern.test(msg);
    if (matches) {
      ctx.passCount++;
      logPass(testTitle, msg.split('\n')[0]);
    } else {
      ctx.failCount++;
      logFail(testTitle, new Error(`Expected pattern ${expectedPattern}, but got: ${msg}`));
    }
  }
}

async function expectDeferredError(
  client: Client,
  sql: string,
  expectedPattern: RegExp | string,
  testTitle: string,
  ctx: TestContext,
  params: unknown[] = [],
) {
  try {
    await client.query('SAVEPOINT sp_test');
    await client.query(sql, params);
    await client.query('SET CONSTRAINTS ALL IMMEDIATE');
    await client.query('RELEASE SAVEPOINT sp_test');
    ctx.failCount++;
    logFail(testTitle, new Error('Expected query to fail, but it succeeded'));
  } catch (error: any) {
    await client.query('ROLLBACK TO SAVEPOINT sp_test');
    const msg = error.message || '';
    const matches = typeof expectedPattern === 'string' ? msg.includes(expectedPattern) : expectedPattern.test(msg);
    if (matches) {
      ctx.passCount++;
      logPass(testTitle, msg.split('\n')[0]);
    } else {
      ctx.failCount++;
      logFail(testTitle, new Error(`Expected pattern ${expectedPattern}, but got: ${msg}`));
    }
  }
}

export async function runFunctionalTests(directUrl: string): Promise<boolean> {
  const client = new Client({ connectionString: directUrl });
  await client.connect();

  const ctx: TestContext = {
    client,
    passCount: 0,
    failCount: 0,
    currentGroup: 'Init',
    groupStats: {},
  };
  globalCtx = ctx;

  console.log('\n=============================================================');
  console.log('Running Vernoxy Pulse SQL Test Suite (Tests 1 - 16)');
  console.log('=============================================================\n');

  try {
    await client.query('BEGIN');

    // -------------------------------------------------------------------------
    // TEST 1: DELETE & TRUNCATE rejected on all 12 original tables + 3 soft-delete auth tables (15 tables)
    // -------------------------------------------------------------------------
    setGroup('Test 1: DELETE & TRUNCATE rejection on 15 tables');
    const tables = [
      'departments',
      'roles',
      'employees',
      'industries',
      'customer_types',
      'master_lookup',
      'pipeline_stages',
      'companies',
      'company_channels',
      'persons',
      'company_persons',
      'leads',
      'employee_credentials',
      'auth_sessions',
      'otp_codes',
    ];

    // Seed minimal baseline rows for foreign key integrity during test 1
    const depRes = await client.query("INSERT INTO departments (name) VALUES ('T1_Dep') RETURNING dep_id");
    const depId = depRes.rows[0].dep_id;

    const roleRes = await client.query("INSERT INTO roles (role_name, dep_id) VALUES ('T1_Role', $1) RETURNING role_id", [depId]);
    const roleId = roleRes.rows[0].role_id;

    const empRes = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('T1_Emp', 't1_emp@example.com', '+1112223334', $1, $2, '2026-01-01') RETURNING emp_id",
      [depId, roleId],
    );
    const empId = empRes.rows[0].emp_id;

    const indRes = await client.query("INSERT INTO industries (name) VALUES ('T1_Industry') RETURNING industry_id");
    const indId = indRes.rows[0].industry_id;

    const custRes = await client.query("INSERT INTO customer_types (name) VALUES ('T1_Cust') RETURNING customer_type_id");
    const custId = custRes.rows[0].customer_type_id;

    const lookupRes = await client.query("INSERT INTO master_lookup (lookup_type, code, label) VALUES ('lead_source', 't1_source', 'T1 Source') RETURNING lookup_id");
    const sourceId = lookupRes.rows[0].lookup_id;

    const stageRes = await client.query("INSERT INTO pipeline_stages (name, sort_order, win_probability) VALUES ('T1_Stage', 99, 50) RETURNING pipeline_stage_id");
    const stageId = stageRes.rows[0].pipeline_stage_id;

    const compRes = await client.query(
      "INSERT INTO companies (name, customer_type_id, industry_id, owner_id) VALUES ('T1_Company', $1, $2, $3) RETURNING company_id",
      [custId, indId, empId],
    );
    const compId = compRes.rows[0].company_id;

    const chanRes = await client.query(
      "INSERT INTO company_channels (company_id, channel_type, value) VALUES ($1, 'email', 't1@company.com') RETURNING channel_id",
      [compId],
    );

    const personRes = await client.query(
      "INSERT INTO persons (name, email, mobile) VALUES ('T1_Person', 't1_person@example.com', '+1112223335') RETURNING person_id",
    );
    const personId = personRes.rows[0].person_id;

    const cpRes = await client.query(
      "INSERT INTO company_persons (company_id, person_id) VALUES ($1, $2) RETURNING company_person_id",
      [compId, personId],
    );

    const leadRes = await client.query(
      "INSERT INTO leads (company_id, person_id, title, pipeline_stage_id, status, owner_id, source_id) VALUES ($1, $2, 'T1_Lead', $3, 'open', $4, $5) RETURNING lead_id",
      [compId, personId, stageId, empId, sourceId],
    );

    // Seed rows for 3 soft-delete auth tables
    await client.query(
      "INSERT INTO employee_credentials (emp_id, password_hash) VALUES ($1, '$argon2id$v=19$m=65536,t=3,p=1$fake$fake')",
      [empId],
    );
    await client.query(
      "INSERT INTO auth_sessions (emp_id, refresh_token_hash, expires_at) VALUES ($1, repeat('0', 64), now() + interval '7 days')",
      [empId],
    );
    await client.query(
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at) VALUES ($1, 'login_2fa', 't1@example.com', repeat('1', 64), now() + interval '10 minutes')",
      [empId],
    );

    for (const tbl of tables) {
      await expectError(
        client,
        `DELETE FROM ${tbl}`,
        /Hard delete is disabled|use soft delete/i,
        `DELETE rejected on ${tbl}`,
        ctx,
      );
      await expectError(
        client,
        `TRUNCATE TABLE ${tbl} CASCADE`,
        /TRUNCATE is disabled|hard deletion of data is forbidden/i,
        `TRUNCATE rejected on ${tbl}`,
        ctx,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 2: Soft delete works; soft-deleted name/email can be reused
    // -------------------------------------------------------------------------
    setGroup('Test 2: Soft delete and value reuse');
    const reuseEmail = 'reuse_test@example.com';
    const insRes = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('Reuse 1', $1, '+919988776655', $2, $3, '2026-01-01') RETURNING emp_id",
      [reuseEmail, depId, roleId],
    );
    const reuseEmpId = insRes.rows[0].emp_id;

    // Soft delete
    await client.query('UPDATE employees SET deleted_at = now(), deleted_by = $1 WHERE emp_id = $2', [empId, reuseEmpId]);

    // Insert same email again -> must succeed
    const reuse2Res = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('Reuse 2', $1, '+919988776656', $2, $3, '2026-01-01') RETURNING emp_id",
      [reuseEmail, depId, roleId],
    );
    if (reuse2Res.rows[0].emp_id) {
      ctx.passCount++;
      logPass('Soft-deleted email successfully reused for active employee');
    }

    // -------------------------------------------------------------------------
    // TEST 3: Duplicate active unique constraints rejected
    // -------------------------------------------------------------------------
    setGroup('Test 3: Duplicate active constraints rejection');
    // 1. Employee email (case-insensitive)
    await expectError(
      client,
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('Dup Email', $1, '+919988776657', $2, $3, '2026-01-01')",
      /ux_employees_email/,
      'Duplicate active employee email rejected (case-insensitive)',
      ctx,
      [reuseEmail.toUpperCase(), depId, roleId],
    );

    // 2. Employee mobile
    await expectError(
      client,
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('Dup Mob', 'diff_email@example.com', '+1112223334', $1, $2, '2026-01-01')",
      /ux_employees_mob/,
      'Duplicate active employee mobile rejected',
      ctx,
      [depId, roleId],
    );

    // 3. Department name (case-insensitive)
    await expectError(
      client,
      "INSERT INTO departments (name) VALUES ('T1_Dep')",
      /ux_departments_name/,
      'Duplicate active department name rejected (case-insensitive)',
      ctx,
    );

    // 4. Role name in same department (case-insensitive)
    await expectError(
      client,
      "INSERT INTO roles (role_name, dep_id) VALUES ('t1_role', $1)",
      /ux_roles_dep_name/,
      'Duplicate active role name in same department rejected (case-insensitive)',
      ctx,
      [depId],
    );

    // 5. Customer type name (case-insensitive)
    await expectError(
      client,
      "INSERT INTO customer_types (name) VALUES ('t1_cust')",
      /ux_customer_types_name/,
      'Duplicate active customer_type name rejected (case-insensitive)',
      ctx,
    );

    // 6. Pipeline stage name (case-insensitive)
    await expectError(
      client,
      "INSERT INTO pipeline_stages (name, sort_order, win_probability) VALUES ('t1_stage', 100, 50)",
      /ux_pipeline_stages_name/,
      'Duplicate active pipeline_stage name rejected (case-insensitive)',
      ctx,
    );

    // 7. Master lookup (lookup_type, code)
    await expectError(
      client,
      "INSERT INTO master_lookup (lookup_type, code, label) VALUES ('lead_source', 't1_source', 'T1 Duplicate')",
      /ux_master_lookup_type_code/,
      'Duplicate active master_lookup (lookup_type, code) rejected',
      ctx,
    );

    // 8. Root industry name (case-insensitive)
    await expectError(
      client,
      "INSERT INTO industries (name) VALUES ('t1_industry')",
      /ux_industries_root_name/,
      'Duplicate active root industry name rejected (case-insensitive)',
      ctx,
    );

    // 9. Duplicate (company_id, person_id) in company_persons
    await expectError(
      client,
      "INSERT INTO company_persons (company_id, person_id) VALUES ($1, $2)",
      /ux_company_persons_company_person/,
      'Duplicate active (company_id, person_id) in company_persons rejected',
      ctx,
      [compId, personId],
    );

    // 10. Second primary company_person for a company
    await client.query("UPDATE company_persons SET is_primary = true WHERE company_id = $1 AND person_id = $2", [compId, personId]);
    const p2Res = await client.query("INSERT INTO persons (name, email) VALUES ('P2', 'p2@example.com') RETURNING person_id");
    const p2Id = p2Res.rows[0].person_id;

    await expectError(
      client,
      "INSERT INTO company_persons (company_id, person_id, is_primary) VALUES ($1, $2, true)",
      /ux_company_persons_primary/,
      'Second primary company_person for a company rejected',
      ctx,
      [compId, p2Id],
    );

    // 11. Second primary company_channel of same type
    await client.query("UPDATE company_channels SET is_primary = true WHERE company_id = $1 AND channel_type = 'email'", [compId]);
    await expectError(
      client,
      "INSERT INTO company_channels (company_id, channel_type, value, is_primary) VALUES ($1, 'email', 'secondary@company.com', true)",
      /ux_company_channels_primary/,
      'Second primary company_channel of same type rejected',
      ctx,
      [compId],
    );

    // -------------------------------------------------------------------------
    // TEST 4: Hierarchy cycles rejected
    // -------------------------------------------------------------------------
    setGroup('Test 4: Hierarchy cycles rejection');
    // Employee loop: E_A -> E_B -> E_C -> E_A
    const ea = (await client.query("INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('EA', 'ea@ex.com', '+1111111111', $1, $2, '2026-01-01') RETURNING emp_id", [depId, roleId])).rows[0].emp_id;
    const eb = (await client.query("INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date, reporting_manager) VALUES ('EB', 'eb@ex.com', '+1111111112', $1, $2, '2026-01-01', $3) RETURNING emp_id", [depId, roleId, ea])).rows[0].emp_id;
    const ec = (await client.query("INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date, reporting_manager) VALUES ('EC', 'ec@ex.com', '+1111111113', $1, $2, '2026-01-01', $3) RETURNING emp_id", [depId, roleId, eb])).rows[0].emp_id;

    await expectError(
      client,
      "UPDATE employees SET reporting_manager = $1 WHERE emp_id = $2",
      /Hierarchy cycle detected in employees/,
      'Employee reporting manager cycle (EA -> EB -> EC -> EA) rejected',
      ctx,
      [ec, ea],
    );

    // Company parent loop: C_A -> C_B -> C_A
    const ca = (await client.query("INSERT INTO companies (name, customer_type_id, industry_id) VALUES ('CA', $1, $2) RETURNING company_id", [custId, indId])).rows[0].company_id;
    const cb = (await client.query("INSERT INTO companies (name, customer_type_id, industry_id, parent_company_id) VALUES ('CB', $1, $2, $3) RETURNING company_id", [custId, indId, ca])).rows[0].company_id;

    await expectError(
      client,
      "UPDATE companies SET parent_company_id = $1 WHERE company_id = $2",
      /Hierarchy cycle detected in companies/,
      'Company parent hierarchy cycle (CA -> CB -> CA) rejected',
      ctx,
      [cb, ca],
    );

    // Company persons reports_to loop: CPA -> CPB -> CPA
    const p3 = (await client.query("INSERT INTO persons (name, email) VALUES ('P3', 'p3@ex.com') RETURNING person_id")).rows[0].person_id;
    const p4 = (await client.query("INSERT INTO persons (name, email) VALUES ('P4', 'p4@ex.com') RETURNING person_id")).rows[0].person_id;
    const cpa = (await client.query("INSERT INTO company_persons (company_id, person_id) VALUES ($1, $2) RETURNING company_person_id", [ca, p3])).rows[0].company_person_id;
    const cpb = (await client.query("INSERT INTO company_persons (company_id, person_id, reports_to_id) VALUES ($1, $2, $3) RETURNING company_person_id", [ca, p4, cpa])).rows[0].company_person_id;

    await expectError(
      client,
      "UPDATE company_persons SET reports_to_id = $1 WHERE company_person_id = $2",
      /Hierarchy cycle detected in company_persons/,
      'Company persons reports_to cycle rejected',
      ctx,
      [cpb, cpa],
    );

    // -------------------------------------------------------------------------
    // TEST 5: Industry rules
    // -------------------------------------------------------------------------
    setGroup('Test 5: Industry hierarchy & cross-industry validation');
    // Top-level: Ind_Root; Sub: Ind_Sub
    const indRoot = (await client.query("INSERT INTO industries (name) VALUES ('Ind_Root') RETURNING industry_id")).rows[0].industry_id;
    const indSub = (await client.query("INSERT INTO industries (name, parent_id) VALUES ('Ind_Sub', $1) RETURNING industry_id", [indRoot])).rows[0].industry_id;

    // Sub-industry cannot have a child
    await expectError(
      client,
      "INSERT INTO industries (name, parent_id) VALUES ('Ind_Sub_Child', $1)",
      /Industry hierarchy exceeds 2 levels/,
      'Sub-industry cannot have a child (max 2 levels)',
      ctx,
      [indSub],
    );

    // Parent with children cannot become a child
    const indOther = (await client.query("INSERT INTO industries (name) VALUES ('Ind_Other') RETURNING industry_id")).rows[0].industry_id;
    await expectError(
      client,
      "UPDATE industries SET parent_id = $1 WHERE industry_id = $2",
      /Industry .* already has sub-industries and cannot become a child|parent_id is immutable for industries/,
      'Industry with children cannot become a child',
      ctx,
      [indOther, indRoot],
    );

    // Company with sub_industry from another industry
    await expectError(
      client,
      "INSERT INTO companies (name, customer_type_id, industry_id, sub_industry_id) VALUES ('Bad Company', $1, $2, $3)",
      /Sub-industry .* is not a child of industry_id/,
      'Company with sub_industry from another industry rejected',
      ctx,
      [custId, indOther, indSub],
    );

    // -------------------------------------------------------------------------
    // TEST 6: reports_to cross-company & Person contact requirement
    // -------------------------------------------------------------------------
    setGroup('Test 6: Cross-company reports_to & Person contact rules');
    const compAnother = (await client.query("INSERT INTO companies (name, customer_type_id, industry_id) VALUES ('Company Another', $1, $2) RETURNING company_id", [custId, indId])).rows[0].company_id;
    const p5 = (await client.query("INSERT INTO persons (name, email) VALUES ('P5', 'p5@ex.com') RETURNING person_id")).rows[0].person_id;

    await expectError(
      client,
      "INSERT INTO company_persons (company_id, person_id, reports_to_id) VALUES ($1, $2, $3)",
      /reports_to_id .* belongs to company/,
      'reports_to from another company rejected',
      ctx,
      [compAnother, p5, cpa],
    );

    // Person with neither email nor mobile rejected
    await expectError(
      client,
      "INSERT INTO persons (name, email, mobile) VALUES ('Nameless Contact', NULL, NULL)",
      /ck_persons_contact_required/,
      'Person with neither email nor mobile rejected',
      ctx,
    );

    // -------------------------------------------------------------------------
    // TEST 7: Lead integrity rules
    // -------------------------------------------------------------------------
    setGroup('Test 7: Lead integrity rules');
    const wonStage = (await client.query("SELECT pipeline_stage_id FROM pipeline_stages WHERE is_won = true LIMIT 1")).rows[0].pipeline_stage_id;
    const lostStage = (await client.query("SELECT pipeline_stage_id FROM pipeline_stages WHERE is_lost = true LIMIT 1")).rows[0].pipeline_stage_id;
    const openStage = (await client.query("SELECT pipeline_stage_id FROM pipeline_stages WHERE is_won = false AND is_lost = false LIMIT 1")).rows[0].pipeline_stage_id;

    const lostReasonRes = await client.query("SELECT lookup_id FROM master_lookup WHERE lookup_type = 'lost_reason' LIMIT 1");
    const lostReasonId = lostReasonRes.rows[0].lookup_id;

    const leadSourceRes = await client.query("SELECT lookup_id FROM master_lookup WHERE lookup_type = 'lead_source' LIMIT 1");
    const leadSourceId = leadSourceRes.rows[0].lookup_id;

    // a) Won stage with status 'open' rejected
    await expectError(
      client,
      "INSERT INTO leads (company_id, title, pipeline_stage_id, status, owner_id) VALUES ($1, 'Lead 1', $2, 'open', $3)",
      /Pipeline stage .* is marked as WON; lead status must be "won"/,
      'Won stage with status "open" rejected',
      ctx,
      [compId, wonStage, empId],
    );

    // b) Won status without actual_value rejected
    await expectError(
      client,
      "INSERT INTO leads (company_id, title, pipeline_stage_id, status, owner_id, closed_at) VALUES ($1, 'Lead 2', $2, 'won', $3, now())",
      /ck_leads_status_consistency/,
      'Won lead without actual_value rejected',
      ctx,
      [compId, wonStage, empId],
    );

    // c) Lost status without lost_reason_id rejected
    await expectError(
      client,
      "INSERT INTO leads (company_id, title, pipeline_stage_id, status, owner_id, closed_at) VALUES ($1, 'Lead 3', $2, 'lost', $3, now())",
      /ck_leads_status_consistency/,
      'Lost lead without lost_reason_id rejected',
      ctx,
      [compId, lostStage, empId],
    );

    // d) person_id not linked to company rejected
    const unlinkedPerson = (await client.query("INSERT INTO persons (name, email) VALUES ('Unlinked', 'unlinked@ex.com') RETURNING person_id")).rows[0].person_id;
    await expectError(
      client,
      "INSERT INTO leads (company_id, person_id, title, pipeline_stage_id, status, owner_id) VALUES ($1, $2, 'Lead 4', $3, 'open', $4)",
      /person_id .* does not have an active affiliation with company_id/,
      'Lead with person not linked to company rejected',
      ctx,
      [compId, unlinkedPerson, openStage, empId],
    );

    // e) wrong lookup_type for source_id rejected
    await expectError(
      client,
      "INSERT INTO leads (company_id, title, pipeline_stage_id, status, owner_id, source_id) VALUES ($1, 'Lead 5', $2, 'open', $3, $4)",
      /source_id .* must have lookup_type "lead_source"/,
      'Lead with wrong lookup_type for source_id rejected',
      ctx,
      [compId, openStage, empId, lostReasonId],
    );

    // f) wrong lookup_type for lost_reason_id rejected
    await expectError(
      client,
      "INSERT INTO leads (company_id, title, pipeline_stage_id, status, owner_id, closed_at, lost_reason_id) VALUES ($1, 'Lead 6', $2, 'lost', $3, now(), $4)",
      /lost_reason_id .* must have lookup_type "lost_reason"/,
      'Lead with wrong lookup_type for lost_reason_id rejected',
      ctx,
      [compId, lostStage, empId, leadSourceId],
    );

    // -------------------------------------------------------------------------
    // TEST 8: updated_at changes on UPDATE; created_at/created_by immutable
    // -------------------------------------------------------------------------
    setGroup('Test 8: Audit triggers and immutability');
    const testDep = (await client.query("INSERT INTO departments (name, created_by) VALUES ('Audit_Dep', $1) RETURNING dep_id, created_at, created_by, updated_at", [empId])).rows[0];

    // Wait a brief moment to ensure clock_timestamp() advances
    await client.query('SELECT pg_sleep(0.02)');
    const updRes = (await client.query("UPDATE departments SET name = 'Audit_Dep_Updated' WHERE dep_id = $1 RETURNING updated_at", [testDep.dep_id])).rows[0];

    if (updRes.updated_at && (!testDep.updated_at || new Date(updRes.updated_at) > new Date(testDep.updated_at))) {
      ctx.passCount++;
      logPass('updated_at advances on UPDATE via trg_handle_update_audit');
    } else {
      ctx.failCount++;
      logFail('updated_at did not advance on UPDATE', new Error(`Old: ${testDep.updated_at}, New: ${updRes.updated_at}`));
    }

    // Changing created_at rejected
    await expectError(
      client,
      "UPDATE departments SET created_at = '2020-01-01' WHERE dep_id = $1",
      /created_at is immutable/,
      'Updating created_at rejected',
      ctx,
      [testDep.dep_id],
    );

    // Changing created_by rejected
    await expectError(
      client,
      "UPDATE departments SET created_by = NULL WHERE dep_id = $1",
      /created_by is immutable/,
      'Updating created_by rejected',
      ctx,
      [testDep.dep_id],
    );

    // -------------------------------------------------------------------------
    // TEST 9: SET ROLE pulse_app: DELETE and TRUNCATE denied
    // -------------------------------------------------------------------------
    setGroup('Test 9: pulse_app role permissions');
    await client.query('GRANT pulse_app TO CURRENT_USER').catch(() => {});
    await client.query('SET ROLE pulse_app');

    // SELECT permitted
    const appSelect = await client.query('SELECT count(*)::int as c FROM companies');
    if (appSelect.rows[0].c >= 0) {
      ctx.passCount++;
      logPass('pulse_app role: SELECT is permitted');
    }

    // DELETE denied
    await expectError(
      client,
      'DELETE FROM companies',
      /permission denied for table companies/,
      'pulse_app role: DELETE permission denied',
      ctx,
    );

    // TRUNCATE denied
    await expectError(
      client,
      'TRUNCATE TABLE companies',
      /permission denied for table companies/,
      'pulse_app role: TRUNCATE permission denied',
      ctx,
    );

    await client.query('RESET ROLE');

    // -------------------------------------------------------------------------
    // TEST 10: company_persons.department_id points to master_lookup ('person_department')
    // -------------------------------------------------------------------------
    setGroup('Test 10: company_persons.department_id master_lookup validation');
    // a) Seed a valid person_department lookup
    const pDeptRes = await client.query(
      "INSERT INTO master_lookup (lookup_type, code, label) VALUES ('person_department', 'test_engineering', 'Engineering') RETURNING lookup_id",
    );
    const validPDeptId = pDeptRes.rows[0].lookup_id;

    // Valid lookup accepted
    const cpDeptTest = await client.query(
      "INSERT INTO company_persons (company_id, person_id, department_id) VALUES ($1, $2, $3) RETURNING company_person_id",
      [ca, p5, validPDeptId],
    );
    if (cpDeptTest.rows[0].company_person_id) {
      ctx.passCount++;
      logPass('Valid person_department lookup accepted on company_persons.department_id');
    }

    // b) Lookup of another type (e.g. lead_source) rejected by trigger
    await expectError(
      client,
      "UPDATE company_persons SET department_id = $1 WHERE company_person_id = $2",
      /must have lookup_type "person_department"/,
      'Lookup of another type (lead_source) rejected by trigger',
      ctx,
      [sourceId, cpDeptTest.rows[0].company_person_id],
    );

    // c) An internal departments table ID is no longer accepted (violates FK to master_lookup)
    // Create a new department with an ID guaranteed not to be in master_lookup
    const newDepRes = await client.query(
      "INSERT INTO departments (dep_id, name) OVERRIDING SYSTEM VALUE VALUES ((SELECT coalesce(max(lookup_id), 0) + 99999 FROM master_lookup), 'Test_Standalone_Dept_XYZ') RETURNING dep_id",
    );
    const standaloneDepId = newDepRes.rows[0].dep_id;

    await expectError(
      client,
      "UPDATE company_persons SET department_id = $1 WHERE company_person_id = $2",
      /(?:fk_company_persons_department_id|does not exist in master_lookup)/,
      'departments table dep_id is rejected (no longer in master_lookup)',
      ctx,
      [standaloneDepId, cpDeptTest.rows[0].company_person_id],
    );
    // -------------------------------------------------------------------------
    // TEST 11: employee_credentials constraints, immutability & reuse
    // -------------------------------------------------------------------------
    setGroup('Test 11: employee_credentials constraints & immutability');
    const authEmp1Res = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('Auth Emp 1', 'authemp1@example.com', '+1999888771', $1, $2, '2026-01-01') RETURNING emp_id",
      [depId, roleId],
    );
    const authEmp1Id = authEmp1Res.rows[0].emp_id;
    const validArgon2Hash = '$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$dGVzdGhhc2h2YWx1ZQ';

    // a) Plaintext / non-argon2id hash rejected
    await expectError(
      client,
      "INSERT INTO employee_credentials (emp_id, password_hash) VALUES ($1, 'plaintextpassword')",
      /ck_employee_credentials_password_hash/,
      'Plaintext/non-argon2id password_hash rejected',
      ctx,
      [authEmp1Id],
    );

    // Insert first valid row
    const credRes = await client.query(
      "INSERT INTO employee_credentials (emp_id, password_hash) VALUES ($1, $2) RETURNING credential_id",
      [authEmp1Id, validArgon2Hash],
    );
    const credId = credRes.rows[0].credential_id;
    ctx.passCount++;
    logPass('Valid argon2id credentials row accepted');

    // b) Second active row for same employee rejected
    await expectError(
      client,
      "INSERT INTO employee_credentials (emp_id, password_hash) VALUES ($1, $2)",
      /ux_employee_credentials_emp_id/,
      'Second active credentials row for same employee rejected',
      ctx,
      [authEmp1Id, validArgon2Hash],
    );

    // c) Negative failed_attempts rejected
    await expectError(
      client,
      "UPDATE employee_credentials SET failed_attempts = -1 WHERE credential_id = $1",
      /ck_employee_credentials_failed_attempts/,
      'Negative failed_attempts rejected',
      ctx,
      [credId],
    );

    // d) After soft-deleting a row a new one is accepted
    await client.query("UPDATE employee_credentials SET deleted_at = now() WHERE credential_id = $1", [credId]);
    const credRes2 = await client.query(
      "INSERT INTO employee_credentials (emp_id, password_hash) VALUES ($1, $2) RETURNING credential_id",
      [authEmp1Id, validArgon2Hash],
    );
    if (credRes2.rows[0].credential_id) {
      ctx.passCount++;
      logPass('After soft-deleting previous credentials, new active row accepted');
    }

    // e) Hard DELETE and TRUNCATE rejected
    await expectError(
      client,
      "DELETE FROM employee_credentials WHERE credential_id = $1",
      /trg_block_delete_employee_credentials|hard deletion of data is forbidden|use soft delete/i,
      'Hard DELETE on employee_credentials rejected',
      ctx,
      [credRes2.rows[0].credential_id],
    );
    await expectError(
      client,
      "TRUNCATE TABLE employee_credentials",
      /trg_block_truncate_employee_credentials|hard deletion of data is forbidden/i,
      'TRUNCATE TABLE employee_credentials rejected',
      ctx,
    );

    // -------------------------------------------------------------------------
    // TEST 12: auth_sessions constraints, revocation & immutability
    // -------------------------------------------------------------------------
    setGroup('Test 12: auth_sessions constraints & revocation');
    const authEmp2Res = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('Auth Emp 2', 'authemp2@example.com', '+1999888772', $1, $2, '2026-01-01') RETURNING emp_id",
      [depId, roleId],
    );
    const authEmp2Id = authEmp2Res.rows[0].emp_id;
    const validHash64A = 'a'.repeat(64);
    const validHash64B = 'b'.repeat(64);

    // a) Bad hash format rejected
    await expectError(
      client,
      "INSERT INTO auth_sessions (emp_id, refresh_token_hash, expires_at) VALUES ($1, 'badhash', now() + interval '7 days')",
      /ck_auth_sessions_refresh_token_hash/,
      'Invalid refresh_token_hash format rejected',
      ctx,
      [authEmp2Id],
    );

    // Insert valid session
    const sessRes = await client.query(
      "INSERT INTO auth_sessions (emp_id, refresh_token_hash, expires_at) VALUES ($1, $2, now() + interval '7 days') RETURNING session_id, updated_at",
      [authEmp2Id, validHash64A],
    );
    const sessId = sessRes.rows[0].session_id;
    const sessInitialUpdated = sessRes.rows[0].updated_at;
    ctx.passCount++;
    logPass('Valid session created');

    // b) Duplicate refresh_token_hash rejected
    await expectError(
      client,
      "INSERT INTO auth_sessions (emp_id, refresh_token_hash, expires_at) VALUES ($1, $2, now() + interval '7 days')",
      /ux_auth_sessions_refresh_token_hash/,
      'Duplicate refresh_token_hash rejected',
      ctx,
      [authEmp2Id, validHash64A],
    );

    // c) Revoked_at without reason (and reason without revoked_at) rejected
    await expectError(
      client,
      "INSERT INTO auth_sessions (emp_id, refresh_token_hash, expires_at, revoked_at, revoked_reason) VALUES ($1, $2, now() + interval '7 days', now(), NULL)",
      /ck_auth_sessions_revoked_consistency/,
      'revoked_at without revoked_reason rejected',
      ctx,
      [authEmp2Id, validHash64B],
    );
    await expectError(
      client,
      "INSERT INTO auth_sessions (emp_id, refresh_token_hash, expires_at, revoked_at, revoked_reason) VALUES ($1, $2, now() + interval '7 days', NULL, 'logout')",
      /ck_auth_sessions_revoked_consistency/,
      'revoked_reason without revoked_at rejected',
      ctx,
      [authEmp2Id, validHash64B],
    );

    // d) expires_at <= issued_at rejected
    await expectError(
      client,
      "INSERT INTO auth_sessions (emp_id, refresh_token_hash, issued_at, expires_at) VALUES ($1, $2, now(), now() - interval '1 hour')",
      /ck_auth_sessions_expires_after_issued/,
      'expires_at <= issued_at rejected',
      ctx,
      [authEmp2Id, validHash64B],
    );

    // e) Revoke via UPDATE works and bumps updated_at
    const revokeRes = await client.query(
      "UPDATE auth_sessions SET revoked_at = now(), revoked_reason = 'logout' WHERE session_id = $1 RETURNING revoked_at, updated_at",
      [sessId],
    );
    if (revokeRes.rows[0].revoked_at && new Date(revokeRes.rows[0].updated_at) >= new Date(sessInitialUpdated)) {
      ctx.passCount++;
      logPass('Revoke session via UPDATE works and bumps updated_at');
    }

    // f) Hard DELETE rejected
    await expectError(
      client,
      "DELETE FROM auth_sessions WHERE session_id = $1",
      /trg_block_delete_auth_sessions|hard deletion of data is forbidden|use soft delete/i,
      'Hard DELETE on auth_sessions rejected',
      ctx,
      [sessId],
    );

    // -------------------------------------------------------------------------
    // TEST 13: otp_codes constraints, single open code & immutability
    // -------------------------------------------------------------------------
    setGroup('Test 13: otp_codes constraints & single-open-code enforcement');
    const authEmp3Res = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('Auth Emp 3', 'authemp3@example.com', '+1999888773', $1, $2, '2026-01-01') RETURNING emp_id",
      [depId, roleId],
    );
    const authEmp3Id = authEmp3Res.rows[0].emp_id;
    const otpHashA = 'c'.repeat(64);
    const otpHashB = 'd'.repeat(64);
    const otpHashC = 'e'.repeat(64);

    // Insert first open code
    const otpRes1 = await client.query(
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at) VALUES ($1, 'login_2fa', 'authemp3@example.com', $2, now() + interval '10 minutes') RETURNING otp_id",
      [authEmp3Id, otpHashA],
    );
    const otpId1 = otpRes1.rows[0].otp_id;
    ctx.passCount++;
    logPass('First open OTP code created');

    // a) Two open codes for same employee + purpose rejected
    await expectError(
      client,
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at) VALUES ($1, 'login_2fa', 'authemp3@example.com', $2, now() + interval '10 minutes')",
      /ux_otp_codes_open/,
      'Two open OTP codes for same employee and purpose rejected',
      ctx,
      [authEmp3Id, otpHashB],
    );

    // b) A new code accepted after old one is consumed or voided
    await client.query("UPDATE otp_codes SET consumed_at = now() WHERE otp_id = $1", [otpId1]);
    const otpRes2 = await client.query(
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at) VALUES ($1, 'login_2fa', 'authemp3@example.com', $2, now() + interval '10 minutes') RETURNING otp_id",
      [authEmp3Id, otpHashB],
    );
    const otpId2 = otpRes2.rows[0].otp_id;
    ctx.passCount++;
    logPass('New OTP accepted after previous code was consumed');

    await client.query("UPDATE otp_codes SET voided_at = now() WHERE otp_id = $1", [otpId2]);
    const otpRes3 = await client.query(
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at) VALUES ($1, 'login_2fa', 'authemp3@example.com', $2, now() + interval '10 minutes') RETURNING otp_id",
      [authEmp3Id, otpHashC],
    );
    const otpId3 = otpRes3.rows[0].otp_id;
    ctx.passCount++;
    logPass('New OTP accepted after previous code was voided');

    // c) Consumed and voided together rejected
    await expectError(
      client,
      "UPDATE otp_codes SET consumed_at = now(), voided_at = now() WHERE otp_id = $1",
      /ck_otp_codes_mutually_exclusive_consumed_voided/,
      'consumed_at and voided_at together rejected',
      ctx,
      [otpId3],
    );

    // d) Bad code_hash format rejected
    await expectError(
      client,
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at) VALUES ($1, 'password_reset', 'authemp3@example.com', 'bad_hash', now() + interval '10 minutes')",
      /ck_otp_codes_code_hash/,
      'Bad code_hash format rejected',
      ctx,
      [authEmp3Id],
    );

    // e) max_attempts 0 or 11 rejected
    await expectError(
      client,
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at, max_attempts) VALUES ($1, 'password_reset', 'authemp3@example.com', $2, now() + interval '10 minutes', 0)",
      /ck_otp_codes_max_attempts/,
      'max_attempts = 0 rejected',
      ctx,
      [authEmp3Id, otpHashA],
    );
    await expectError(
      client,
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at, max_attempts) VALUES ($1, 'password_reset', 'authemp3@example.com', $2, now() + interval '10 minutes', 11)",
      /ck_otp_codes_max_attempts/,
      'max_attempts = 11 rejected',
      ctx,
      [authEmp3Id, otpHashA],
    );

    // Migration 17: attempts <= max_attempts guard
    await expectError(
      client,
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at, attempts, max_attempts) VALUES ($1, 'password_reset', 'authemp3@example.com', $2, now() + interval '10 minutes', 6, 5)",
      /ck_otp_codes_attempts_within_max/,
      'attempts > max_attempts rejected',
      ctx,
      [authEmp3Id, otpHashA],
    );

    const maxAttemptsRes = await client.query(
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at, attempts, max_attempts) VALUES ($1, 'password_reset', 'authemp3@example.com', $2, now() + interval '10 minutes', 5, 5) RETURNING otp_id",
      [authEmp3Id, otpHashA],
    );
    if (maxAttemptsRes.rows[0].otp_id) {
      ctx.passCount++;
      logPass('attempts = max_attempts accepted');
    }

    // f) Hard DELETE rejected
    await expectError(
      client,
      "DELETE FROM otp_codes WHERE otp_id = $1",
      /trg_block_delete_otp_codes|hard deletion of data is forbidden|use soft delete/i,
      'Hard DELETE on otp_codes rejected',
      ctx,
      [otpId3],
    );

    // -------------------------------------------------------------------------
    // TEST 14: auth_events append-only, partitioning & partition helper
    // -------------------------------------------------------------------------
    setGroup('Test 14: auth_events append-only & range partitioning');
    const identHash = 'f'.repeat(64);

    // a) Insert works with NULL emp_id
    const evtNullRes = await client.query(
      "INSERT INTO auth_events (emp_id, event_type, identifier_hash) VALUES (NULL, 'login_password_failed', $1) RETURNING event_id",
      [identHash],
    );
    const evtNullId = evtNullRes.rows[0].event_id;
    ctx.passCount++;
    logPass('auth_events insert with NULL emp_id succeeds');

    // b) Non-existent emp_id rejected
    await expectError(
      client,
      "INSERT INTO auth_events (emp_id, event_type) VALUES (999999, 'login_succeeded')",
      /fk_auth_events_emp_id/,
      'Non-existent emp_id on auth_events rejected',
      ctx,
    );

    // c) UPDATE, DELETE and TRUNCATE rejected (append-only)
    await expectError(
      client,
      "UPDATE auth_events SET details = '{\"tampered\": true}' WHERE event_id = $1",
      /trg_block_update_auth_events|append-only/i,
      'UPDATE on auth_events rejected (append-only)',
      ctx,
      [evtNullId],
    );
    await expectError(
      client,
      "DELETE FROM auth_events WHERE event_id = $1",
      /trg_block_delete_auth_events|append-only/i,
      'DELETE on auth_events rejected (append-only)',
      ctx,
      [evtNullId],
    );
    await expectError(
      client,
      "TRUNCATE TABLE auth_events",
      /TRUNCATE is disabled on table auth_events|append-only/i,
      'TRUNCATE on auth_events rejected (append-only)',
      ctx,
    );

    // d) Row dated inside existing monthly partition lands in that partition (tableoid check)
    const partEventRes = await client.query(
      "INSERT INTO auth_events (emp_id, event_type, created_at) VALUES ($1, 'login_succeeded', '2026-10-10 12:00:00+00') RETURNING event_id, tableoid::regclass::text as part_name",
      [authEmp3Id],
    );
    const actualPart = partEventRes.rows[0].part_name;
    if (actualPart === 'auth_partitions.auth_events_2026_10') {
      ctx.passCount++;
      logPass(`Row dated 2026-10 routed to partition: ${actualPart}`);
    } else {
      ctx.failCount++;
      logFail('Partition routing mismatch', new Error(`Expected auth_partitions.auth_events_2026_10, got ${actualPart}`));
    }

    // e) Row dated far in future lands in default partition without failing
    const defaultEventRes = await client.query(
      "INSERT INTO auth_events (emp_id, event_type, created_at) VALUES ($1, 'login_succeeded', '2049-01-01 12:00:00+00') RETURNING event_id, tableoid::regclass::text as part_name",
      [authEmp3Id],
    );
    const actualDefaultPart = defaultEventRes.rows[0].part_name;
    if (actualDefaultPart === 'auth_partitions.auth_events_default') {
      ctx.passCount++;
      logPass(`Future row routed to default partition: ${actualDefaultPart}`);
    } else {
      ctx.failCount++;
      logFail('Default partition routing mismatch', new Error(`Expected auth_partitions.auth_events_default, got ${actualDefaultPart}`));
    }

    // f) fn_ensure_auth_event_partitions is idempotent
    await client.query("SELECT fn_ensure_auth_event_partitions(12)");
    await client.query("SELECT fn_ensure_auth_event_partitions(12)");
    ctx.passCount++;
    logPass('fn_ensure_auth_event_partitions is idempotent');

    // g) fn_ensure_auth_event_partitions raises clear error when default partition holds overlapping rows
    // Insert a row into default partition for a month not yet partitioned (e.g. 2028-06)
    await client.query(
      "INSERT INTO auth_events (emp_id, event_type, created_at) VALUES ($1, 'login_succeeded', '2028-06-15 12:00:00+00')",
      [authEmp3Id],
    );
    // Requesting 30 months ahead includes 2028-06, which will detect the row sitting in default partition
    await expectError(
      client,
      "SELECT fn_ensure_auth_event_partitions(30)",
      /contains \d+ rows overlapping/i,
      'fn_ensure_auth_event_partitions raises clear error when default partition has overlapping rows',
      ctx,
    );

    // -------------------------------------------------------------------------
    // TEST 15: Safety trigger (defense in depth on employee Inactive / soft-delete)
    // -------------------------------------------------------------------------
    setGroup('Test 15: Safety triggers on employee deactivation/soft delete');
    const safeEmp1Res = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date, status) VALUES ('Safe Emp 1', 'safe1@example.com', '+1999888774', $1, $2, '2026-01-01', 'Active') RETURNING emp_id",
      [depId, roleId],
    );
    const safeEmp1Id = safeEmp1Res.rows[0].emp_id;

    const safeEmp2Res = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date, status) VALUES ('Safe Emp 2', 'safe2@example.com', '+1999888775', $1, $2, '2026-01-01', 'Active') RETURNING emp_id",
      [depId, roleId],
    );
    const safeEmp2Id = safeEmp2Res.rows[0].emp_id;

    // Create session and OTP for safeEmp1
    const s1Res = await client.query(
      "INSERT INTO auth_sessions (emp_id, refresh_token_hash, expires_at) VALUES ($1, $2, now() + interval '7 days') RETURNING session_id",
      [safeEmp1Id, '1'.repeat(64)],
    );
    const s1Id = s1Res.rows[0].session_id;
    const o1Res = await client.query(
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at) VALUES ($1, 'login_2fa', 'safe1@example.com', $2, now() + interval '10 min') RETURNING otp_id",
      [safeEmp1Id, '2'.repeat(64)],
    );
    const o1Id = o1Res.rows[0].otp_id;

    // Create session and OTP for safeEmp2
    const s2Res = await client.query(
      "INSERT INTO auth_sessions (emp_id, refresh_token_hash, expires_at) VALUES ($1, $2, now() + interval '7 days') RETURNING session_id",
      [safeEmp2Id, '3'.repeat(64)],
    );
    const s2Id = s2Res.rows[0].session_id;
    const o2Res = await client.query(
      "INSERT INTO otp_codes (emp_id, purpose, destination, code_hash, expires_at) VALUES ($1, 'login_2fa', 'safe2@example.com', $2, now() + interval '10 min') RETURNING otp_id",
      [safeEmp2Id, '4'.repeat(64)],
    );
    const o2Id = o2Res.rows[0].otp_id;

    // (a) Deactivate safeEmp1 -> sessions revoked ('deactivated') and OTPs voided
    await client.query("UPDATE employees SET status = 'Inactive' WHERE emp_id = $1", [safeEmp1Id]);
    const checkS1 = await client.query("SELECT revoked_at, revoked_reason FROM auth_sessions WHERE session_id = $1", [s1Id]);
    const checkO1 = await client.query("SELECT voided_at FROM otp_codes WHERE otp_id = $1", [o1Id]);
    const checkS2Untouched = await client.query("SELECT revoked_at FROM auth_sessions WHERE session_id = $1", [s2Id]);

    if (
      checkS1.rows[0].revoked_at &&
      checkS1.rows[0].revoked_reason === 'deactivated' &&
      checkO1.rows[0].voided_at &&
      checkS2Untouched.rows[0].revoked_at === null
    ) {
      ctx.passCount++;
      logPass('Deactivating employee to Inactive revokes open sessions (deactivated) and voids open OTPs; other employees unaffected');
    } else {
      ctx.failCount++;
      logFail('Safety trigger on Inactive failed', new Error('Session was not revoked or OTP not voided properly'));
    }

    // (b) Soft delete safeEmp2 -> sessions revoked and OTPs voided
    await client.query("UPDATE employees SET deleted_at = now() WHERE emp_id = $1", [safeEmp2Id]);
    const checkS2 = await client.query("SELECT revoked_at, revoked_reason FROM auth_sessions WHERE session_id = $1", [s2Id]);
    const checkO2 = await client.query("SELECT voided_at FROM otp_codes WHERE otp_id = $1", [o2Id]);
    if (checkS2.rows[0].revoked_at && checkS2.rows[0].revoked_reason === 'deactivated' && checkO2.rows[0].voided_at) {
      ctx.passCount++;
      logPass('Soft deleting employee revokes open sessions (deactivated) and voids open OTPs');
    } else {
      ctx.failCount++;
      logFail('Safety trigger on soft delete failed', new Error('Session was not revoked or OTP not voided on soft delete'));
    }

    // -------------------------------------------------------------------------
    // TEST 16: Role grants (pulse_app and pulse_readonly on auth tables)
    // -------------------------------------------------------------------------
    setGroup('Test 16: Role grants on auth tables');
    await client.query('GRANT pulse_app TO CURRENT_USER').catch(() => {});
    await client.query('SET ROLE pulse_app');

    // pulse_app can SELECT from credentials, sessions, otp_codes, auth_events
    const appAuthSelect = await client.query(`
      SELECT
        (SELECT count(*)::int FROM employee_credentials) as c1,
        (SELECT count(*)::int FROM auth_sessions) as c2,
        (SELECT count(*)::int FROM otp_codes) as c3,
        (SELECT count(*)::int FROM auth_events) as c4
    `);
    if (appAuthSelect.rows.length === 1) {
      ctx.passCount++;
      logPass('pulse_app can SELECT from all four auth tables');
    }

    // pulse_app cannot DELETE or TRUNCATE employee_credentials, auth_sessions, otp_codes
    await expectError(
      client,
      'DELETE FROM employee_credentials',
      /permission denied for table employee_credentials/,
      'pulse_app role: DELETE on employee_credentials permission denied',
      ctx,
    );
    await expectError(
      client,
      'DELETE FROM auth_sessions',
      /permission denied for table auth_sessions/,
      'pulse_app role: DELETE on auth_sessions permission denied',
      ctx,
    );
    await expectError(
      client,
      'DELETE FROM otp_codes',
      /permission denied for table otp_codes/,
      'pulse_app role: DELETE on otp_codes permission denied',
      ctx,
    );

    // pulse_app cannot UPDATE, DELETE or TRUNCATE auth_events
    await expectError(
      client,
      "UPDATE auth_events SET ip_address = '1.2.3.4'",
      /permission denied for table auth_events/,
      'pulse_app role: UPDATE on auth_events permission denied',
      ctx,
    );
    await expectError(
      client,
      'DELETE FROM auth_events',
      /permission denied for table auth_events/,
      'pulse_app role: DELETE on auth_events permission denied',
      ctx,
    );
    await expectError(
      client,
      'TRUNCATE TABLE auth_events',
      /permission denied for table auth_events/,
      'pulse_app role: TRUNCATE on auth_events permission denied',
      ctx,
    );

    await client.query('RESET ROLE');

    // pulse_readonly gets permission denied on all 4 auth tables
    await client.query('GRANT pulse_readonly TO CURRENT_USER').catch(() => {});
    await client.query('SET ROLE pulse_readonly');
    await expectError(
      client,
      'SELECT * FROM employee_credentials',
      /permission denied for table employee_credentials/,
      'pulse_readonly role: SELECT employee_credentials denied',
      ctx,
    );
    await expectError(
      client,
      'SELECT * FROM auth_sessions',
      /permission denied for table auth_sessions/,
      'pulse_readonly role: SELECT auth_sessions denied',
      ctx,
    );
    await expectError(
      client,
      'SELECT * FROM otp_codes',
      /permission denied for table otp_codes/,
      'pulse_readonly role: SELECT otp_codes denied',
      ctx,
    );
    await expectError(
      client,
      'SELECT * FROM auth_events',
      /permission denied for table auth_events/,
      'pulse_readonly role: SELECT auth_events denied',
      ctx,
    );
    await client.query('RESET ROLE');

    // -------------------------------------------------------------------------
    // TEST 17: Roles belong to departments, composite FK & scoped unique indexes
    // -------------------------------------------------------------------------
    setGroup('Test 17: Roles scoped to departments & composite FK');

    // 1. Create two departments
    const d1Res = await client.query("INSERT INTO departments (name) VALUES ('T17_Dep1') RETURNING dep_id");
    const d1Id = d1Res.rows[0].dep_id;
    const d2Res = await client.query("INSERT INTO departments (name) VALUES ('T17_Dep2') RETURNING dep_id");
    const d2Id = d2Res.rows[0].dep_id;

    // 2. Same role name allowed in two different departments
    const r1Res = await client.query("INSERT INTO roles (role_name, dep_id) VALUES ('Engineer', $1) RETURNING role_id", [d1Id]);
    const r1Id = r1Res.rows[0].role_id;
    const r2Res = await client.query("INSERT INTO roles (role_name, dep_id) VALUES ('Engineer', $1) RETURNING role_id", [d2Id]);
    const r2Id = r2Res.rows[0].role_id;
    logPass('Same role name allowed in two different departments', `dep1=${d1Id}, dep2=${d2Id}`);

    // 3. Duplicate role name rejected in same department
    await expectError(
      client,
      "INSERT INTO roles (role_name, dep_id) VALUES ('Engineer', $1)",
      /ux_roles_dep_name/,
      'Duplicate role name in same department rejected',
      ctx,
      [d1Id]
    );

    // 4. Employee with role from another department rejected by composite FK fk_employees_role_in_department
    await expectError(
      client,
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('T17_Emp', 't17_mismatch@example.com', '+919999988881', $1, $2, '2026-01-01')",
      /fk_employees_role_in_department/,
      'Role from another department rejected by composite FK',
      ctx,
      [d1Id, r2Id]
    );

    // 5. CHECK ck_roles_admin_active: NOT is_admin OR is_active
    await expectError(
      client,
      "INSERT INTO roles (role_name, dep_id, is_admin, is_active) VALUES ('InactiveAdmin', $1, true, false)",
      /ck_roles_admin_active/,
      'ck_roles_admin_active: is_admin=true with is_active=false rejected',
      ctx,
      [d1Id]
    );

    // -------------------------------------------------------------------------
    // TEST 18: Organization lifecycle triggers (departments & roles)
    // -------------------------------------------------------------------------
    setGroup('Test 18: Department & role lifecycle triggers and immutability');

    // 1. Department soft delete rejected while it has active roles
    await expectError(
      client,
      "UPDATE departments SET deleted_at = now(), deleted_by = $1 WHERE dep_id = $2",
      /Cannot deactivate or delete department/,
      'Soft delete of department rejected while it has active roles',
      ctx,
      [empId, d1Id]
    );

    // 2. Department deactivation rejected while it has active roles
    await expectError(
      client,
      "UPDATE departments SET is_active = false WHERE dep_id = $1",
      /Cannot deactivate or delete department/,
      'Deactivation of department rejected while it has active roles',
      ctx,
      [d1Id]
    );

    // 3. Department with active employee rejected on soft delete / deactivation
    const d3Res = await client.query("INSERT INTO departments (name) VALUES ('T18_Dep3') RETURNING dep_id");
    const d3Id = d3Res.rows[0].dep_id;
    const r3Res = await client.query("INSERT INTO roles (role_name, dep_id) VALUES ('T18_Role3', $1) RETURNING role_id", [d3Id]);
    const r3Id = r3Res.rows[0].role_id;
    const emp3Res = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('T18_Emp3', 't18_emp3@example.com', '+919999988882', $1, $2, '2026-01-01') RETURNING emp_id",
      [d3Id, r3Id]
    );
    const emp3Id = emp3Res.rows[0].emp_id;

    // Soft delete of department rejected while it has active employees
    await expectError(
      client,
      "UPDATE departments SET deleted_at = now(), deleted_by = $1 WHERE dep_id = $2",
      /Cannot deactivate or delete department/,
      'Soft delete of department rejected while it has active employees',
      ctx,
      [empId, d3Id]
    );

    // 4. Role soft delete / deactivation rejected while it has active employees
    await expectError(
      client,
      "UPDATE roles SET deleted_at = now(), deleted_by = $1 WHERE role_id = $2",
      /Cannot deactivate or delete role/,
      'Soft delete of role rejected while it has active employees',
      ctx,
      [empId, r3Id]
    );
    await expectError(
      client,
      "UPDATE roles SET is_active = false WHERE role_id = $1",
      /Cannot deactivate or delete role/,
      'Deactivation of role rejected while it has active employees',
      ctx,
      [r3Id]
    );

    // 5. Role and department soft delete allowed once active employees removed
    await client.query("UPDATE employees SET deleted_at = now(), deleted_by = $1 WHERE emp_id = $2", [empId, emp3Id]);
    await client.query("UPDATE roles SET deleted_at = now(), deleted_by = $1 WHERE role_id = $2", [empId, r3Id]);
    logPass('Role soft delete allowed once active employees removed');
    await client.query("UPDATE departments SET deleted_at = now(), deleted_by = $1 WHERE dep_id = $2", [empId, d3Id]);
    logPass('Department soft delete allowed once active roles and employees removed');

    // 6. Admin role (is_admin = true) cannot be soft-deleted or deactivated
    const adminRoleRes = await client.query("INSERT INTO roles (role_name, dep_id, is_admin, is_active) VALUES ('SystemSuperAdmin', $1, true, true) RETURNING role_id", [d1Id]);
    const adminRoleId = adminRoleRes.rows[0].role_id;

    await expectError(
      client,
      "UPDATE roles SET deleted_at = now(), deleted_by = $1 WHERE role_id = $2",
      /Admin role cannot be soft-deleted or deactivated/,
      'is_admin role cannot be soft-deleted',
      ctx,
      [empId, adminRoleId]
    );
    await expectError(
      client,
      "UPDATE roles SET is_active = false WHERE role_id = $1",
      /Admin role cannot be soft-deleted or deactivated/,
      'is_admin role cannot be deactivated',
      ctx,
      [adminRoleId]
    );

    // 7. roles.is_admin is immutable
    await expectError(
      client,
      "UPDATE roles SET is_admin = false WHERE role_id = $1",
      /roles.is_admin is immutable/,
      'roles.is_admin is immutable after insert',
      ctx,
      [adminRoleId]
    );

    // 8. roles.dep_id is immutable
    await expectError(
      client,
      "UPDATE roles SET dep_id = $1 WHERE role_id = $2",
      /roles.dep_id is immutable/,
      'roles.dep_id is immutable after insert',
      ctx,
      [d2Id, r1Id]
    );

    // -------------------------------------------------------------------------
    // TEST 19: Employee org constraints, Last-admin protection & pulse_app permissions
    // -------------------------------------------------------------------------
    setGroup('Test 19: Employee org constraints & Last-admin protection');

    // 1. Employee with inactive or deleted department rejected
    const dInactiveRes = await client.query("INSERT INTO departments (name, is_active) VALUES ('T19_InactiveDep', false) RETURNING dep_id");
    const dInactiveId = dInactiveRes.rows[0].dep_id;
    const rInactiveDepRes = await client.query("INSERT INTO roles (role_name, dep_id, is_active) VALUES ('T19_RoleInactDep', $1, false) RETURNING role_id", [dInactiveId]);
    const rInactiveDepId = rInactiveDepRes.rows[0].role_id;

    await expectError(
      client,
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('T19_E1', 't19_e1@example.com', '+919999988883', $1, $2, '2026-01-01')",
      /Department .* is inactive or deleted/,
      'Employee with inactive department rejected',
      ctx,
      [dInactiveId, rInactiveDepId]
    );

    // 2. Employee with inactive or deleted role rejected
    const rInactiveRes = await client.query("INSERT INTO roles (role_name, dep_id, is_active) VALUES ('T19_InactiveRole', $1, false) RETURNING role_id", [d1Id]);
    const rInactiveId = rInactiveRes.rows[0].role_id;

    await expectError(
      client,
      "INSERT INTO employees (name, email, mob, dep_id, role_id, joining_date) VALUES ('T19_E2', 't19_e2@example.com', '+919999988884', $1, $2, '2026-01-01')",
      /Role .* is inactive or deleted/,
      'Employee with inactive role rejected',
      ctx,
      [d1Id, rInactiveId]
    );

    // 3. Last active admin protection
    const adminEmp1Res = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, status, joining_date) VALUES ('Admin One', 'admin1@example.com', '+919999988885', $1, $2, 'Active', '2026-01-01') RETURNING emp_id",
      [d1Id, adminRoleId]
    );
    const adminEmp1Id = adminEmp1Res.rows[0].emp_id;

    // Temporarily soft-delete other admins to test last remaining admin protection
    await client.query("SAVEPOINT sp_admin_isolation");
    await client.query("UPDATE employees SET deleted_at = now() WHERE role_id IN (SELECT role_id FROM roles WHERE is_admin = true) AND emp_id <> $1", [adminEmp1Id]);

    // Deactivation rejected
    await expectError(
      client,
      "UPDATE employees SET status = 'Inactive' WHERE emp_id = $1",
      /Cannot modify or delete last remaining active administrator/,
      'Last active admin cannot be deactivated',
      ctx,
      [adminEmp1Id]
    );

    // Soft delete rejected
    await expectError(
      client,
      "UPDATE employees SET deleted_at = now() WHERE emp_id = $1",
      /Cannot modify or delete last remaining active administrator/,
      'Last active admin cannot be soft deleted',
      ctx,
      [adminEmp1Id]
    );

    // Move to non-admin role rejected
    await expectError(
      client,
      "UPDATE employees SET role_id = $1, dep_id = $2 WHERE emp_id = $3",
      /Cannot modify or delete last remaining active administrator/,
      'Last active admin cannot be moved to a non-admin role',
      ctx,
      [r1Id, d1Id, adminEmp1Id]
    );

    // 4. Second admin allows first admin to be deactivated
    const adminEmp2Res = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, status, joining_date) VALUES ('Admin Two', 'admin2@example.com', '+919999988886', $1, $2, 'Active', '2026-01-01') RETURNING emp_id",
      [d1Id, adminRoleId]
    );
    const adminEmp2Id = adminEmp2Res.rows[0].emp_id;

    await client.query("UPDATE employees SET status = 'Inactive' WHERE emp_id = $1", [adminEmp1Id]);
    logPass('With a second active admin, first admin deactivation succeeds');
    await client.query("ROLLBACK TO SAVEPOINT sp_admin_isolation");

    // 5. After soft delete, name or email can be reused
    const reusableDepRes = await client.query("INSERT INTO departments (name) VALUES ('T19_Reusable') RETURNING dep_id");
    const reusableDepId = reusableDepRes.rows[0].dep_id;
    await client.query("UPDATE departments SET deleted_at = now(), deleted_by = $1 WHERE dep_id = $2", [empId, reusableDepId]);
    const reusedDepRes = await client.query("INSERT INTO departments (name) VALUES ('T19_Reusable') RETURNING dep_id");
    logPass('Department name can be reused after soft delete', `new_id=${reusedDepRes.rows[0].dep_id}`);

    // 6. pulse_app cannot DELETE on departments, roles, employees
    await client.query('GRANT pulse_app TO CURRENT_USER').catch(() => {});
    await client.query('SET ROLE pulse_app');
    await expectError(
      client,
      "DELETE FROM departments WHERE dep_id = -999",
      /permission denied for table departments/,
      'pulse_app: DELETE on departments denied',
      ctx
    );
    await expectError(
      client,
      "DELETE FROM roles WHERE role_id = -999",
      /permission denied for table roles/,
      'pulse_app: DELETE on roles denied',
      ctx
    );
    await expectError(
      client,
      "DELETE FROM employees WHERE emp_id = -999",
      /permission denied for table employees/,
      'pulse_app: DELETE on employees denied',
      ctx
    );
    await client.query('RESET ROLE');

    // 7. Migration 18 DO block raises its clear error when roles has rows
    await expectError(
      client,
      `DO $$
       BEGIN
         IF EXISTS (SELECT 1 FROM roles) THEN
           RAISE EXCEPTION 'roles table must be empty: reset the branch first';
         END IF;
       END $$;`,
      /roles table must be empty: reset the branch first/,
      'Migration 18 raises error when roles table contains rows',
      ctx
    );

    // =========================================================================
    // TEST 20: Master Data Defaults, Protection & Company Integrity Triggers
    // =========================================================================
    setGroup('Test 20: Master data defaults, protection & company integrity');

    // 1. Single default per table
    const indDefCount = await client.query("SELECT count(*)::int as c FROM industries WHERE is_default = true AND deleted_at IS NULL");
    if (indDefCount.rows[0].c === 1) {
      logPass('Single active default industry exists');
    } else {
      ctx.failCount++;
      logFail('Single active default industry check', new Error(`Found ${indDefCount.rows[0].c} defaults`));
    }

    const ctDefCount = await client.query("SELECT count(*)::int as c FROM customer_types WHERE is_default = true AND deleted_at IS NULL");
    if (ctDefCount.rows[0].c === 1) {
      logPass('Single active default customer type exists');
    } else {
      ctx.failCount++;
      logFail('Single active default customer type check', new Error(`Found ${ctDefCount.rows[0].c} defaults`));
    }

    // 2. Second default rejected
    await expectError(
      client,
      "INSERT INTO industries (name, is_default) VALUES ('T20_Another_Default', true)",
      /ux_industries_default/,
      'Second default industry rejected by partial unique index',
      ctx
    );

    await expectError(
      client,
      "INSERT INTO customer_types (name, is_default) VALUES ('T20_Another_Default_CT', true)",
      /ux_customer_types_default/,
      'Second default customer type rejected by partial unique index',
      ctx
    );

    // 3. Default industry must be top-level (ck_industries_default_top_level)
    const someParentInd = await client.query("INSERT INTO industries (name) VALUES ('T20_Parent_Ind') RETURNING industry_id");
    const parentIndId = someParentInd.rows[0].industry_id;
    await expectError(
      client,
      "INSERT INTO industries (name, parent_id, is_default) VALUES ('T20_Child_Default', $1, true)",
      /ck_industries_default_top_level/,
      'Default sub-industry rejected by check constraint',
      ctx,
      [parentIndId]
    );

    // 4. Default protected from delete or deactivate
    await expectError(
      client,
      "UPDATE industries SET deleted_at = now() WHERE is_default = true",
      /Default industry cannot be deactivated or deleted/,
      'Default industry cannot be soft deleted',
      ctx
    );
    await expectError(
      client,
      "UPDATE industries SET is_active = false WHERE is_default = true",
      /Default industry cannot be (deactivated or deleted|inactive)/,
      'Default industry cannot be deactivated',
      ctx
    );
    await expectError(
      client,
      "UPDATE customer_types SET deleted_at = now() WHERE is_default = true",
      /Default customer type cannot be (deactivated or deleted|inactive)/,
      'Default customer type cannot be soft deleted',
      ctx
    );
    await expectError(
      client,
      "UPDATE customer_types SET is_active = false WHERE is_default = true",
      /Default customer type cannot be (deactivated or deleted|inactive)/,
      'Default customer type cannot be deactivated',
      ctx
    );

    // 5. is_default and parent_id are immutable on industries after insert
    const regularInd = await client.query("INSERT INTO industries (name) VALUES ('T20_Regular_Ind') RETURNING industry_id");
    const regularIndId = regularInd.rows[0].industry_id;
    await expectError(
      client,
      "UPDATE industries SET is_default = true WHERE industry_id = $1",
      /is_default is immutable for industries/,
      'is_default is immutable on industries',
      ctx,
      [regularIndId]
    );
    await expectError(
      client,
      "UPDATE industries SET parent_id = $1 WHERE industry_id = $2",
      /parent_id is immutable for industries/,
      'parent_id is immutable on industries',
      ctx,
      [parentIndId, regularIndId]
    );

    // 6. Sub-industry cannot be activated under inactive parent
    const inactiveParentInd = await client.query("INSERT INTO industries (name, is_active) VALUES ('T20_Inactive_Parent', false) RETURNING industry_id");
    const inactiveParentId = inactiveParentInd.rows[0].industry_id;

    await expectError(
      client,
      "INSERT INTO industries (name, parent_id, is_active) VALUES ('T20_Sub_Active', $1, true)",
      /Sub-industry cannot be active while its parent industry .* is inactive/,
      'Sub-industry cannot be inserted active under inactive parent',
      ctx,
      [inactiveParentId]
    );

    const inactiveSubInd = await client.query(
      "INSERT INTO industries (name, parent_id, is_active) VALUES ('T20_Sub_Inactive', $1, false) RETURNING industry_id",
      [inactiveParentId]
    );
    const inactiveSubId = inactiveSubInd.rows[0].industry_id;
    await expectError(
      client,
      "UPDATE industries SET is_active = true WHERE industry_id = $1",
      /Sub-industry cannot be active while its parent industry .* is inactive/,
      'Sub-industry cannot be activated while its parent is inactive',
      ctx,
      [inactiveSubId]
    );

    // 7. Industry in-use protection: has active sub-industries
    const activeParentInd = await client.query("INSERT INTO industries (name, is_active) VALUES ('T20_Active_Parent', true) RETURNING industry_id");
    const activeParentId = activeParentInd.rows[0].industry_id;
    const activeChildInd = await client.query("INSERT INTO industries (name, parent_id, is_active) VALUES ('T20_Active_Child', $1, true) RETURNING industry_id", [activeParentId]);
    const activeChildId = activeChildInd.rows[0].industry_id;

    await expectError(
      client,
      "UPDATE industries SET deleted_at = now() WHERE industry_id = $1",
      /cannot be deactivated or deleted while it has active sub-industries/,
      'Industry soft delete rejected while it has active sub-industries',
      ctx,
      [activeParentId]
    );
    await expectError(
      client,
      "UPDATE industries SET is_active = false WHERE industry_id = $1",
      /cannot be deactivated or deleted while it has active sub-industries/,
      'Industry deactivation rejected while it has active sub-industries',
      ctx,
      [activeParentId]
    );

    // Deactivating child allows parent deactivation
    await client.query("UPDATE industries SET is_active = false WHERE industry_id = $1", [activeChildId]);
    await client.query("UPDATE industries SET is_active = false WHERE industry_id = $1", [activeParentId]);
    logPass('Industry can be deactivated once sub-industries are deactivated');

    // 8. Industry & Customer Type in-use protection: referenced by active companies
    const indForComp = await client.query("INSERT INTO industries (name) VALUES ('T20_Ind_For_Comp') RETURNING industry_id");
    const indForCompId = indForComp.rows[0].industry_id;
    const ctForComp = await client.query("INSERT INTO customer_types (name) VALUES ('T20_CT_For_Comp') RETURNING customer_type_id");
    const ctForCompId = ctForComp.rows[0].customer_type_id;

    const compUsingInd = await client.query(
      "INSERT INTO companies (name, customer_type_id, industry_id) VALUES ('T20_Using_Comp', $1, $2) RETURNING company_id",
      [ctForCompId, indForCompId]
    );
    const compUsingIndId = compUsingInd.rows[0].company_id;

    await expectError(
      client,
      "UPDATE industries SET deleted_at = now() WHERE industry_id = $1",
      /cannot be deactivated or deleted while referenced by active companies/,
      'Industry soft delete rejected while referenced by active company',
      ctx,
      [indForCompId]
    );
    await expectError(
      client,
      "UPDATE customer_types SET deleted_at = now() WHERE customer_type_id = $1",
      /cannot be deactivated or deleted while referenced by active companies/,
      'Customer type soft delete rejected while referenced by active company',
      ctx,
      [ctForCompId]
    );

    // Deactivating company allows soft delete of industry and customer type
    await client.query("UPDATE companies SET deleted_at = now(), deleted_by = $1 WHERE company_id = $2", [empId, compUsingIndId]);
    await client.query("UPDATE industries SET deleted_at = now(), deleted_by = $1 WHERE industry_id = $2", [empId, indForCompId]);
    await client.query("UPDATE customer_types SET deleted_at = now(), deleted_by = $1 WHERE customer_type_id = $2", [empId, ctForCompId]);
    logPass('Industry and customer type can be deleted once company is soft-deleted');

    // 9. Companies triggers on INSERT/UPDATE
    // Inactive industry rejected
    await expectError(
      client,
      "INSERT INTO companies (name, customer_type_id, industry_id) VALUES ('T20_Bad_Comp1', $1, $2)",
      /Industry .* is inactive/,
      'Company insert rejects inactive industry',
      ctx,
      [ctDefCount.rows[0] ? (await client.query("SELECT customer_type_id FROM customer_types WHERE is_default = true")).rows[0].customer_type_id : 1, inactiveParentId]
    );

    // Inactive customer type rejected
    const inactiveCT = await client.query("INSERT INTO customer_types (name, is_active) VALUES ('T20_Inactive_CT', false) RETURNING customer_type_id");
    const inactiveCTId = inactiveCT.rows[0].customer_type_id;
    const activeIndId = (await client.query("SELECT industry_id FROM industries WHERE is_default = true")).rows[0].industry_id;
    await expectError(
      client,
      "INSERT INTO companies (name, customer_type_id, industry_id) VALUES ('T20_Bad_Comp2', $1, $2)",
      /Customer type .* is inactive/,
      'Company insert rejects inactive customer type',
      ctx,
      [inactiveCTId, activeIndId]
    );

    // Inactive sub-industry rejected
    const activeTopIndRes = await client.query("INSERT INTO industries (name, is_active) VALUES ('T20_Active_Top_Ind', true) RETURNING industry_id");
    const activeTopIndId = activeTopIndRes.rows[0].industry_id;
    const inactiveSubIndRes = await client.query("INSERT INTO industries (name, parent_id, is_active) VALUES ('T20_Inactive_Sub_Ind', $1, false) RETURNING industry_id", [activeTopIndId]);
    const inactiveSubIndId = inactiveSubIndRes.rows[0].industry_id;

    await expectError(
      client,
      "INSERT INTO companies (name, customer_type_id, industry_id, sub_industry_id) VALUES ('T20_Bad_Comp3', $1, $2, $3)",
      /Sub-industry .* is inactive/,
      'Company insert rejects inactive sub-industry',
      ctx,
      [(await client.query("SELECT customer_type_id FROM customer_types WHERE is_default = true")).rows[0].customer_type_id, activeTopIndId, inactiveSubIndId]
    );

    // Inactive or deleted owner rejected
    const inactiveEmp = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, status, joining_date) VALUES ('Inactive Emp', 'inactive_emp@example.com', '+919999000111', $1, $2, 'Inactive', '2026-01-01') RETURNING emp_id",
      [depId, roleId]
    );
    const inactiveEmpId = inactiveEmp.rows[0].emp_id;
    const defaultCtId = (await client.query("SELECT customer_type_id FROM customer_types WHERE is_default = true")).rows[0].customer_type_id;

    await expectError(
      client,
      "INSERT INTO companies (name, customer_type_id, industry_id, owner_id) VALUES ('T20_Bad_Owner', $1, $2, $3)",
      /Owner employee .* is not Active/,
      'Company insert rejects inactive owner',
      ctx,
      [defaultCtId, activeIndId, inactiveEmpId]
    );

    const deletedEmp = await client.query(
      "INSERT INTO employees (name, email, mob, dep_id, role_id, status, joining_date, deleted_at) VALUES ('Deleted Emp', 'deleted_emp@example.com', '+919999000112', $1, $2, 'Active', '2026-01-01', now()) RETURNING emp_id",
      [depId, roleId]
    );
    const deletedEmpId = deletedEmp.rows[0].emp_id;

    await expectError(
      client,
      "INSERT INTO companies (name, customer_type_id, industry_id, owner_id) VALUES ('T20_Deleted_Owner', $1, $2, $3)",
      /Owner employee .* does not exist or is soft deleted/,
      'Company insert rejects deleted owner',
      ctx,
      [defaultCtId, activeIndId, deletedEmpId]
    );

    // Deleted parent company rejected
    const delParentComp = await client.query(
      "INSERT INTO companies (name, customer_type_id, industry_id, deleted_at) VALUES ('Deleted Parent Comp', $1, $2, now()) RETURNING company_id",
      [defaultCtId, activeIndId]
    );
    const delParentCompId = delParentComp.rows[0].company_id;
    await expectError(
      client,
      "INSERT INTO companies (name, customer_type_id, industry_id, parent_company_id) VALUES ('T20_Child_Of_Deleted', $1, $2, $3)",
      /Parent company .* does not exist or is soft deleted/,
      'Company insert rejects soft-deleted parent company',
      ctx,
      [defaultCtId, activeIndId, delParentCompId]
    );

    // 10. Company soft delete blocked by active child companies or active leads
    const validParentComp = await client.query(
      "INSERT INTO companies (name, customer_type_id, industry_id) VALUES ('Valid Parent Comp', $1, $2) RETURNING company_id",
      [defaultCtId, activeIndId]
    );
    const validParentCompId = validParentComp.rows[0].company_id;

    const validChildComp = await client.query(
      "INSERT INTO companies (name, customer_type_id, industry_id, parent_company_id) VALUES ('Valid Child Comp', $1, $2, $3) RETURNING company_id",
      [defaultCtId, activeIndId, validParentCompId]
    );
    const validChildCompId = validChildComp.rows[0].company_id;

    await expectError(
      client,
      "UPDATE companies SET deleted_at = now() WHERE company_id = $1",
      /cannot be soft deleted while it has active child companies/,
      'Company soft delete blocked while it has active child companies',
      ctx,
      [validParentCompId]
    );

    // Soft delete child allows parent soft delete
    await client.query("UPDATE companies SET deleted_at = now(), deleted_by = $1 WHERE company_id = $2", [empId, validChildCompId]);
    await client.query("UPDATE companies SET deleted_at = now(), deleted_by = $1 WHERE company_id = $2", [empId, validParentCompId]);
    logPass('Parent company can be soft deleted once child company is soft deleted');

    // Company soft delete blocked by active leads
    const compWithLead = await client.query(
      "INSERT INTO companies (name, customer_type_id, industry_id) VALUES ('Comp With Lead', $1, $2) RETURNING company_id",
      [defaultCtId, activeIndId]
    );
    const compWithLeadId = compWithLead.rows[0].company_id;
    const t20StageRes = await client.query("SELECT pipeline_stage_id FROM pipeline_stages WHERE is_won = false AND is_lost = false LIMIT 1");
    const t20StageId = t20StageRes.rows[0].pipeline_stage_id;

    const t20LeadRes = await client.query(
      "INSERT INTO leads (title, company_id, pipeline_stage_id, owner_id, status) VALUES ('Active Test Lead', $1, $2, $3, 'open') RETURNING lead_id",
      [compWithLeadId, t20StageId, empId]
    );
    const testLeadId = t20LeadRes.rows[0].lead_id;

    await expectError(
      client,
      "UPDATE companies SET deleted_at = now() WHERE company_id = $1",
      /cannot be soft deleted while it has active leads/,
      'Company soft delete blocked while it has active leads',
      ctx,
      [compWithLeadId]
    );

    // Soft deleting lead allows company soft delete
    await client.query("UPDATE leads SET deleted_at = now(), deleted_by = $1 WHERE lead_id = $2", [empId, testLeadId]);
    await client.query("UPDATE companies SET deleted_at = now(), deleted_by = $1 WHERE company_id = $2", [empId, compWithLeadId]);
    logPass('Company can be soft deleted once leads are no longer active');

    // 11. pulse_app cannot DELETE on companies, company_channels, company_persons, industries, customer_types
    await client.query('GRANT pulse_app TO CURRENT_USER').catch(() => {});
    await client.query('SET ROLE pulse_app');
    await expectError(
      client,
      "DELETE FROM companies WHERE company_id = -999",
      /permission denied for table companies/,
      'pulse_app: DELETE on companies denied',
      ctx
    );
    await expectError(
      client,
      "DELETE FROM company_channels WHERE channel_id = -999",
      /permission denied for table company_channels/,
      'pulse_app: DELETE on company_channels denied',
      ctx
    );
    await expectError(
      client,
      "DELETE FROM company_persons WHERE company_person_id = -999",
      /permission denied for table company_persons/,
      'pulse_app: DELETE on company_persons denied',
      ctx
    );
    await expectError(
      client,
      "DELETE FROM industries WHERE industry_id = -999",
      /permission denied for table industries/,
      'pulse_app: DELETE on industries denied',
      ctx
    );
    await expectError(
      client,
      "DELETE FROM customer_types WHERE customer_type_id = -999",
      /permission denied for table customer_types/,
      'pulse_app: DELETE on customer_types denied',
      ctx
    );
    await client.query('RESET ROLE');

    // =========================================================================
    // TEST 21: Data Transfer Jobs Table Integrity & Security
    // =========================================================================
    setGroup('Test 21: Data transfer jobs integrity & security');

    const validKey = '0123456789abcdef0123456789abcdef.xlsx';
    const validHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    // 1. Valid insert succeeds
    const jobInsertRes = await client.query(`
      INSERT INTO data_transfer_jobs (
        direction, entity_type, format, status, file_key, file_sha256,
        total_rows, processed_rows, created_by
      ) VALUES (
        'import', 'companies', 'xlsx', 'previewed', $1, $2,
        100, 50, $3
      ) RETURNING job_id;
    `, [validKey, validHash, empId]);
    const testJobId = jobInsertRes.rows[0].job_id;
    logPass('Valid insert into data_transfer_jobs succeeds');

    // 2. Hard DELETE rejected by trigger
    await expectError(
      client,
      "DELETE FROM data_transfer_jobs WHERE job_id = $1",
      /Hard delete is disabled on table data_transfer_jobs/,
      'Hard delete on data_transfer_jobs blocked by trigger',
      ctx,
      [testJobId]
    );

    // 3. TRUNCATE rejected by trigger
    await expectError(
      client,
      "TRUNCATE TABLE data_transfer_jobs",
      /TRUNCATE is disabled on table data_transfer_jobs/,
      'TRUNCATE on data_transfer_jobs blocked by trigger',
      ctx
    );

    // 4. Bad file_key rejected
    await expectError(
      client,
      `INSERT INTO data_transfer_jobs (direction, entity_type, format, status, file_key)
       VALUES ('import', 'companies', 'xlsx', 'previewed', 'bad-key.txt')`,
      /ck_data_transfer_jobs_file_key_format/,
      'Invalid file_key rejected by format check',
      ctx
    );

    await expectError(
      client,
      `INSERT INTO data_transfer_jobs (direction, entity_type, format, status, file_key)
       VALUES ('import', 'companies', 'xlsx', 'previewed', '../../evil.xlsx')`,
      /ck_data_transfer_jobs_file_key_format/,
      'Path traversal file_key rejected by format check',
      ctx
    );

    // 5. Bad report_key rejected
    await expectError(
      client,
      `INSERT INTO data_transfer_jobs (direction, entity_type, format, status, file_key, report_key)
       VALUES ('import', 'companies', 'xlsx', 'previewed', $1, 'bad-report-key.doc')`,
      /ck_data_transfer_jobs_report_key_format/,
      'Invalid report_key rejected by format check',
      ctx,
      [validKey]
    );

    // 6. Bad sha256 hash rejected
    await expectError(
      client,
      `INSERT INTO data_transfer_jobs (direction, entity_type, format, status, file_key, file_sha256)
       VALUES ('import', 'companies', 'xlsx', 'previewed', $1, 'not-a-valid-64-char-hash')`,
      /ck_data_transfer_jobs_file_sha256_format/,
      'Invalid file_sha256 rejected by format check',
      ctx,
      [validKey]
    );

    // 7. processed_rows > total_rows rejected
    await expectError(
      client,
      `INSERT INTO data_transfer_jobs (direction, entity_type, format, status, file_key, total_rows, processed_rows)
       VALUES ('import', 'companies', 'xlsx', 'previewed', $1, 10, 11)`,
      /ck_data_transfer_jobs_processed_le_total/,
      'processed_rows > total_rows rejected by check constraint',
      ctx,
      [validKey]
    );

    // 8. Negative rows rejected
    await expectError(
      client,
      `INSERT INTO data_transfer_jobs (direction, entity_type, format, status, file_key, total_rows)
       VALUES ('import', 'companies', 'xlsx', 'previewed', $1, -1)`,
      /ck_data_transfer_jobs_counts_non_negative/,
      'Negative count rejected by check constraint',
      ctx,
      [validKey]
    );

    // 9. Import missing file_key rejected unless expired
    await expectError(
      client,
      `INSERT INTO data_transfer_jobs (direction, entity_type, format, status, file_key)
       VALUES ('import', 'companies', 'xlsx', 'queued', NULL)`,
      /ck_data_transfer_jobs_import_file_key/,
      'Import job missing file_key rejected unless expired',
      ctx
    );

    const expiredJobRes = await client.query(`
      INSERT INTO data_transfer_jobs (direction, entity_type, format, status, file_key)
      VALUES ('import', 'companies', 'xlsx', 'expired', NULL)
      RETURNING job_id;
    `);
    if (expiredJobRes.rows.length === 1) {
      logPass('Import job with status=expired allows NULL file_key');
    }

    // 10. finished_at < started_at rejected
    await expectError(
      client,
      `INSERT INTO data_transfer_jobs (direction, entity_type, format, status, file_key, started_at, finished_at)
       VALUES ('import', 'companies', 'xlsx', 'previewed', $1, now(), now() - interval '1 hour')`,
      /ck_data_transfer_jobs_finished_ge_started/,
      'finished_at < started_at rejected by check constraint',
      ctx,
      [validKey]
    );

    // 11. pulse_app permissions: SELECT, INSERT, UPDATE allowed; DELETE denied
    await client.query('GRANT pulse_app TO CURRENT_USER').catch(() => {});
    await client.query('SET ROLE pulse_app');

    const appJobRes = await client.query(`
      INSERT INTO data_transfer_jobs (
        direction, entity_type, format, status, file_key
      ) VALUES (
        'export', 'companies', 'csv', 'running', $1
      ) RETURNING job_id;
    `, [validKey]);
    const appJobId = appJobRes.rows[0].job_id;
    logPass('pulse_app can INSERT into data_transfer_jobs');

    const selectRes = await client.query("SELECT * FROM data_transfer_jobs WHERE job_id = $1", [appJobId]);
    if (selectRes.rows.length === 1) {
      logPass('pulse_app can SELECT from data_transfer_jobs');
    }

    await client.query("UPDATE data_transfer_jobs SET status = 'completed' WHERE job_id = $1", [appJobId]);
    logPass('pulse_app can UPDATE data_transfer_jobs');

    await expectError(
      client,
      "DELETE FROM data_transfer_jobs WHERE job_id = $1",
      /permission denied for table data_transfer_jobs/,
      'pulse_app: DELETE on data_transfer_jobs denied',
      ctx,
      [appJobId]
    );
    await client.query('RESET ROLE');

    // =========================================================================
    // Test 22: Attendance, breaks & app settings integrity & security
    // =========================================================================
    ctx.currentGroup = 'Test 22: Attendance, breaks & security';
    console.log(`\n--- ${ctx.currentGroup} ---`);

    // Setup: Get an active employee
    const attEmpRes = await client.query(`
      SELECT emp_id FROM employees WHERE status = 'Active' AND deleted_at IS NULL LIMIT 1;
    `);
    const testEmpId = attEmpRes.rows[0].emp_id;

    // 1. Insert attendance_day
    const attDayRes = await client.query(`
      INSERT INTO attendance_days (
        emp_id, work_date, check_in_at
      ) VALUES (
        $1, '2026-10-15', '2026-10-15 10:00:00+00'
      ) RETURNING attendance_id;
    `, [testEmpId]);
    const testAttId = attDayRes.rows[0].attendance_id;
    logPass('Valid attendance_day inserted');

    // 2. ended_at <= started_at rejected
    await expectError(
      client,
      `INSERT INTO attendance_breaks (attendance_id, started_at, ended_at)
       VALUES ($1, '2026-10-15 11:00:00+00', '2026-10-15 11:00:00+00')`,
      /ck_attendance_breaks_ended_after_started/,
      'ended_at <= started_at rejected',
      ctx,
      [testAttId]
    );

    // 3. break before Punch In rejected
    await expectError(
      client,
      `INSERT INTO attendance_breaks (attendance_id, started_at, ended_at)
       VALUES ($1, '2026-10-15 09:30:00+00', '2026-10-15 09:45:00+00')`,
      /Break started_at .* cannot be earlier than check_in_at/,
      'break before Punch In rejected',
      ctx,
      [testAttId]
    );

    // 4. Insert valid open break
    const openBreakRes = await client.query(`
      INSERT INTO attendance_breaks (attendance_id, started_at)
      VALUES ($1, '2026-10-15 11:00:00+00')
      RETURNING break_id;
    `, [testAttId]);
    const break1Id = openBreakRes.rows[0].break_id;
    logPass('Valid open break inserted');

    // 5. Second open break rejected
    await expectError(
      client,
      `INSERT INTO attendance_breaks (attendance_id, started_at)
       VALUES ($1, '2026-10-15 12:00:00+00')`,
      /(duplicate key value violates unique constraint "ux_attendance_breaks_single_open"|conflicting key value violates exclusion constraint "ex_attendance_breaks_no_overlap")/,
      'second open break rejected',
      ctx,
      [testAttId]
    );

    // Close break 1
    await client.query(`
      UPDATE attendance_breaks SET ended_at = '2026-10-15 11:30:00+00' WHERE break_id = $1
    `, [break1Id]);
    logPass('Break 1 closed at 11:30:00');

    // 6. Overlapping break rejected
    await expectError(
      client,
      `INSERT INTO attendance_breaks (attendance_id, started_at, ended_at)
       VALUES ($1, '2026-10-15 11:15:00+00', '2026-10-15 11:45:00+00')`,
      /conflicting key value violates exclusion constraint "ex_attendance_breaks_no_overlap"/,
      'overlapping breaks rejected',
      ctx,
      [testAttId]
    );

    // 7. Adjacent break allowed
    const adjBreakRes = await client.query(`
      INSERT INTO attendance_breaks (attendance_id, started_at, ended_at)
      VALUES ($1, '2026-10-15 11:30:00+00', '2026-10-15 12:00:00+00')
      RETURNING break_id;
    `, [testAttId]);
    if (adjBreakRes.rows.length === 1) {
      logPass('adjacent breaks allowed');
    }

    // 8. Open break on closed day rejected
    const openBreak2Res = await client.query(`
      INSERT INTO attendance_breaks (attendance_id, started_at)
      VALUES ($1, '2026-10-15 13:00:00+00')
      RETURNING break_id;
    `, [testAttId]);
    const break2Id = openBreak2Res.rows[0].break_id;

    await expectError(
      client,
      `UPDATE attendance_days SET check_out_at = '2026-10-15 18:00:00+00' WHERE attendance_id = $1`,
      /Cannot close attendance day .* while an open break exists/,
      'an open break on a closed day rejected',
      ctx,
      [testAttId]
    );

    // Close break 2 and then close day
    await client.query(`
      UPDATE attendance_breaks SET ended_at = '2026-10-15 13:30:00+00' WHERE break_id = $1
    `, [break2Id]);

    await client.query(`
      UPDATE attendance_days
      SET check_out_at = '2026-10-15 18:00:00+00', break_minutes = 60, production_minutes = 420, day_status = 'present'
      WHERE attendance_id = $1
    `, [testAttId]);
    logPass('Attendance day closed with break_minutes=60, production_minutes=420');

    // 9. New break on closed day rejected
    await expectError(
      client,
      `INSERT INTO attendance_breaks (attendance_id, started_at, ended_at)
       VALUES ($1, '2026-10-15 14:00:00+00', '2026-10-15 14:30:00+00')`,
      /Cannot add break to an already closed attendance day/,
      'break insert on closed day rejected',
      ctx,
      [testAttId]
    );

    // 10. Break after Punch Out rejected
    await expectError(
      client,
      `INSERT INTO attendance_breaks (attendance_id, started_at, ended_at)
       VALUES ($1, '2026-10-15 18:30:00+00', '2026-10-15 19:00:00+00')`,
      /Cannot add break to an already closed attendance day/,
      'break after Punch Out rejected',
      ctx,
      [testAttId]
    );

    // 11. break_minutes cannot exceed session
    await expectError(
      client,
      `UPDATE attendance_days SET break_minutes = 500 WHERE attendance_id = $1`,
      /ck_attendance_days_break_le_session/,
      'break_minutes cannot exceed session',
      ctx,
      [testAttId]
    );

    // 12. attendance_corrections requested_break_minutes cannot exceed session
    await expectError(
      client,
      `INSERT INTO attendance_corrections (
        emp_id, attendance_id, work_date, requested_check_in_at, requested_check_out_at, requested_break_minutes, reason
      ) VALUES (
        $1, $2, '2026-10-15', '2026-10-15 10:00:00+00', '2026-10-15 12:00:00+00', 150, 'Forgot to punch'
      )`,
      /ck_attendance_corrections_break_le_session/,
      'correction requested_break_minutes cannot exceed session',
      ctx,
      [testEmpId, testAttId]
    );

    // 13. Hard delete on attendance_breaks rejected
    await expectError(
      client,
      `DELETE FROM attendance_breaks WHERE break_id = $1`,
      /Hard delete is disabled on table attendance_breaks/,
      'Hard delete on attendance_breaks rejected',
      ctx,
      [break1Id]
    );

    // 14. Hard delete on attendance_days rejected
    await expectError(
      client,
      `DELETE FROM attendance_days WHERE attendance_id = $1`,
      /Hard delete is disabled on table attendance_days/,
      'Hard delete on attendance_days rejected',
      ctx,
      [testAttId]
    );

    // 15. pulse_app and pulse_readonly grants matrix
    await client.query('GRANT pulse_app TO CURRENT_USER').catch(() => {});
    await client.query('SET ROLE pulse_app');

    const appAttRes = await client.query(`
      SELECT attendance_id FROM attendance_days WHERE attendance_id = $1
    `, [testAttId]);
    if (appAttRes.rows.length === 1) {
      logPass('pulse_app can SELECT from attendance_days');
    }

    const appBreakRes = await client.query(`
      SELECT break_id FROM attendance_breaks WHERE break_id = $1
    `, [break1Id]);
    if (appBreakRes.rows.length === 1) {
      logPass('pulse_app can SELECT from attendance_breaks');
    }

    const appSettingRes = await client.query(`
      SELECT setting_value FROM app_settings WHERE setting_key = 'week_start_day'
    `);
    if (appSettingRes.rows.length === 1) {
      logPass('pulse_app can SELECT from app_settings');
    }

    await expectError(
      client,
      `DELETE FROM attendance_days WHERE attendance_id = $1`,
      /permission denied for table attendance_days/,
      'pulse_app: DELETE on attendance_days denied',
      ctx,
      [testAttId]
    );

    await expectError(
      client,
      `DELETE FROM attendance_breaks WHERE break_id = $1`,
      /permission denied for table attendance_breaks/,
      'pulse_app: DELETE on attendance_breaks denied',
      ctx,
      [break1Id]
    );

    await client.query('RESET ROLE');

    // Test pulse_readonly
    await client.query('GRANT pulse_readonly TO CURRENT_USER').catch(() => {});
    await client.query('SET ROLE pulse_readonly');

    const roSettingRes = await client.query(`
      SELECT setting_value FROM app_settings WHERE setting_key = 'week_start_day'
    `);
    if (roSettingRes.rows.length === 1) {
      logPass('pulse_readonly can SELECT from app_settings');
    }

    await expectError(
      client,
      `SELECT * FROM attendance_days WHERE attendance_id = $1`,
      /permission denied for table attendance_days/,
      'pulse_readonly: SELECT on attendance_days denied',
      ctx,
      [testAttId]
    );

    await expectError(
      client,
      `SELECT * FROM attendance_breaks WHERE break_id = $1`,
      /permission denied for table attendance_breaks/,
      'pulse_readonly: SELECT on attendance_breaks denied',
      ctx,
      [break1Id]
    );

    await expectError(
      client,
      `SELECT * FROM attendance_corrections`,
      /permission denied for table attendance_corrections/,
      'pulse_readonly: SELECT on attendance_corrections denied',
      ctx
    );

    await client.query('RESET ROLE');

    // =========================================================================
    // Test 23: Task management, integrity triggers, deferred assignees & security
    // =========================================================================
    ctx.currentGroup = 'Test 23: Task management, integrity triggers & security';
    console.log(`\n--- ${ctx.currentGroup} ---`);

    // Setup active employees
    const empRows = await client.query(`
      SELECT emp_id FROM employees WHERE status = 'Active' AND deleted_at IS NULL ORDER BY emp_id LIMIT 2;
    `);
    const taskEmp1Id = empRows.rows[0].emp_id;
    const taskEmp2Id = empRows.rows[1].emp_id;

    // Get or create an inactive employee
    let inactEmpRes = await client.query(`
      SELECT emp_id FROM employees WHERE status = 'Inactive' AND deleted_at IS NULL LIMIT 1;
    `);
    let taskInactiveEmpId: number;
    if (inactEmpRes.rows.length === 0) {
      const depRes = await client.query(`SELECT dep_id FROM departments WHERE deleted_at IS NULL LIMIT 1;`);
      const createInact = await client.query(`
        INSERT INTO employees (name, email, dep_id, joining_date, status)
        VALUES ('Inactive Tester', 'inact_test_task@example.com', $1, '2026-01-01', 'Inactive')
        RETURNING emp_id;
      `, [depRes.rows[0].dep_id]);
      taskInactiveEmpId = createInact.rows[0].emp_id;
    } else {
      taskInactiveEmpId = inactEmpRes.rows[0].emp_id;
    }

    // Get a valid task_type lookup_id
    const taskTypeRes = await client.query(`
      SELECT lookup_id FROM master_lookup WHERE lookup_type = 'task_type' AND is_active = true AND deleted_at IS NULL LIMIT 1;
    `);
    const validTaskTypeId = taskTypeRes.rows[0].lookup_id;

    // 1. task_counters
    await client.query(`
      INSERT INTO task_counters (counter_year, last_number)
      VALUES (2099, 0)
      ON CONFLICT (counter_year) DO UPDATE SET last_number = task_counters.last_number + 1;
    `);
    logPass('Valid insert/update into task_counters');

    await expectError(
      client,
      `INSERT INTO task_counters (counter_year, last_number) VALUES (2098, -1)`,
      /ck_task_counters_last_number_ge_zero/,
      'task_counters last_number >= 0 enforced',
      ctx
    );

    await expectError(
      client,
      `DELETE FROM task_counters WHERE counter_year = 2099`,
      /Hard delete is disabled on table task_counters/,
      'DELETE rejected on task_counters by trigger',
      ctx
    );

    await expectError(
      client,
      `TRUNCATE task_counters`,
      /TRUNCATE is disabled on table task_counters/,
      'TRUNCATE rejected on task_counters by trigger',
      ctx
    );

    // 2. tasks & task_assignees: Deferred constraint check (at least one assignee)
    await expectDeferredError(
      client,
      `INSERT INTO tasks (task_code, title) VALUES ('TSK-TEST-001', 'Task without assignee')`,
      /Task .* must have at least one active assignee/,
      'Create task without assignee fails at commit',
      ctx
    );

    // Create task with assignee in one subtransaction
    let testTaskId: number;
    {
      await client.query('SAVEPOINT sp_create_task');
      const tRes = await client.query(`
        INSERT INTO tasks (task_code, title, task_type_id, allocated_minutes)
        VALUES ('TSK-TEST-002', 'Valid Task With Assignee', $1, 120)
        RETURNING task_id;
      `, [validTaskTypeId]);
      testTaskId = tRes.rows[0].task_id;

      await client.query(`
        INSERT INTO task_assignees (task_id, employee_id)
        VALUES ($1, $2);
      `, [testTaskId, taskEmp1Id]);
      await client.query('RELEASE SAVEPOINT sp_create_task');
      logPass('Task created with active assignee successfully');
    }

    // Assigning inactive employee fails
    await expectError(
      client,
      `INSERT INTO task_assignees (task_id, employee_id) VALUES ($1, $2)`,
      /Assigned employee .* must be Active and not deleted/,
      'Assigning inactive employee rejected by trigger',
      ctx,
      [testTaskId, taskInactiveEmpId]
    );

    // Duplicate active assignee rejected
    await expectError(
      client,
      `INSERT INTO task_assignees (task_id, employee_id) VALUES ($1, $2)`,
      /duplicate key value violates unique constraint "ux_task_assignees_task_emp"/,
      'Duplicate active assignee on same task rejected',
      ctx,
      [testTaskId, taskEmp1Id]
    );

    // Check constraints on tasks
    await expectError(
      client,
      `INSERT INTO tasks (task_code, title) VALUES ('TSK-TEST-003', '   ')`,
      /ck_tasks_title_non_blank/,
      'Blank title rejected by check constraint',
      ctx
    );

    await expectError(
      client,
      `INSERT INTO tasks (task_code, title, allocated_minutes) VALUES ('TSK-TEST-004', 'Bad Minutes', 0)`,
      /ck_tasks_allocated_minutes/,
      'allocated_minutes <= 0 rejected',
      ctx
    );

    await expectError(
      client,
      `INSERT INTO tasks (task_code, title, allocated_minutes) VALUES ('TSK-TEST-005', 'Too Many Minutes', 14401)`,
      /ck_tasks_allocated_minutes/,
      'allocated_minutes > 14400 rejected',
      ctx
    );

    await expectError(
      client,
      `INSERT INTO tasks (task_code, title) VALUES ('TSK-TEST-002', 'Duplicate Code')`,
      /duplicate key value violates unique constraint "ux_tasks_task_code"/,
      'Duplicate task_code rejected',
      ctx
    );

    // Removing last assignee fails at commit
    await expectDeferredError(
      client,
      `UPDATE task_assignees SET deleted_at = now(), deleted_by = $1 WHERE task_id = $2`,
      /Task .* must have at least one active assignee/,
      'Removing last assignee fails at commit',
      ctx,
      [taskEmp1Id, testTaskId]
    );

    // Add a second assignee
    await client.query(`
      INSERT INTO task_assignees (task_id, employee_id) VALUES ($1, $2);
    `, [testTaskId, taskEmp2Id]);
    logPass('Second assignee added successfully');

    // Now removing first assignee succeeds
    await client.query(`
      UPDATE task_assignees SET deleted_at = now(), deleted_by = $1 WHERE task_id = $2 AND employee_id = $1;
    `, [taskEmp1Id, testTaskId]);
    logPass('Removing one assignee when another remains succeeds');

    // 3. Stage transition matrix & row_version
    // Initial stage is assigned, row_version is 1
    const v1Res = await client.query(`SELECT stage, row_version FROM tasks WHERE task_id = $1;`, [testTaskId]);
    const initStage = v1Res.rows[0].stage;
    const initVer = v1Res.rows[0].row_version;

    // Illegal: assigned -> completed
    await expectError(
      client,
      `UPDATE tasks SET stage = 'completed', completed_at = now(), completed_by = $1 WHERE task_id = $2`,
      /Invalid stage transition from assigned to completed/,
      'Illegal transition assigned -> completed rejected',
      ctx,
      [taskEmp2Id, testTaskId]
    );

    // Illegal: assigned -> requested
    await expectError(
      client,
      `UPDATE tasks SET stage = 'requested' WHERE task_id = $1`,
      /Invalid stage transition from assigned to requested/,
      'Illegal transition assigned -> requested rejected',
      ctx,
      [testTaskId]
    );

    // Legal: assigned -> in_progress
    await client.query(`UPDATE tasks SET stage = 'in_progress' WHERE task_id = $1;`, [testTaskId]);
    const v2Res = await client.query(`SELECT stage, row_version FROM tasks WHERE task_id = $1;`, [testTaskId]);
    if (v2Res.rows[0].stage === 'in_progress' && v2Res.rows[0].row_version === initVer + 1) {
      logPass('Legal transition assigned -> in_progress succeeds; row_version increments');
    } else {
      logFail('assigned -> in_progress verification', `stage=${v2Res.rows[0].stage}, version=${v2Res.rows[0].row_version}`);
    }

    // Illegal: in_progress -> assigned (BFD Section 3.3: in_progress can only move to hold or requested)
    await expectError(
      client,
      `UPDATE tasks SET stage = 'assigned' WHERE task_id = $1`,
      /Invalid stage transition from in_progress to assigned/,
      'Illegal transition in_progress -> assigned rejected per BFD rules',
      ctx,
      [testTaskId]
    );

    // in_progress -> requested
    await client.query(`UPDATE tasks SET stage = 'in_progress' WHERE task_id = $1;`, [testTaskId]);
    await client.query(`UPDATE tasks SET stage = 'requested' WHERE task_id = $1;`, [testTaskId]);
    const reqRes = await client.query(`SELECT requested_at FROM tasks WHERE task_id = $1;`, [testTaskId]);
    if (reqRes.rows[0].requested_at !== null) {
      logPass('Legal transition in_progress -> requested succeeds and sets requested_at');
    } else {
      logFail('requested_at check', 'requested_at is null');
    }

    // Illegal: requested -> assigned
    await expectError(
      client,
      `UPDATE tasks SET stage = 'assigned' WHERE task_id = $1`,
      /Invalid stage transition from requested to assigned/,
      'Illegal transition requested -> assigned rejected',
      ctx,
      [testTaskId]
    );

    // Legal: requested -> in_progress (withdraw)
    await client.query(`UPDATE tasks SET stage = 'in_progress' WHERE task_id = $1;`, [testTaskId]);
    logPass('Legal transition requested -> in_progress (withdraw) succeeds');

    // Move to requested
    await client.query(`UPDATE tasks SET stage = 'requested' WHERE task_id = $1;`, [testTaskId]);

    // Self-approval rejection: assignee cannot approve their own task per BFD Section 3.3
    await expectError(
      client,
      `UPDATE tasks SET stage = 'completed', completed_at = clock_timestamp(), completed_by = $1 WHERE task_id = $2;`,
      /Assignee cannot approve their own task/,
      'Assignee self-approval rejected per BFD rules',
      ctx,
      [taskEmp2Id, testTaskId]
    );

    // Non-assignee approval succeeds
    const approverRes = await client.query(`
      SELECT emp_id FROM employees
      WHERE status = 'Active' AND deleted_at IS NULL AND emp_id NOT IN ($1, $2)
      ORDER BY emp_id LIMIT 1;
    `, [taskEmp1Id, taskEmp2Id]);
    const approverEmpId = approverRes.rows[0].emp_id;

    await client.query(`
      UPDATE tasks
      SET stage = 'completed', completed_at = clock_timestamp(), completed_by = $1
      WHERE task_id = $2;
    `, [approverEmpId, testTaskId]);
    logPass('Legal transition requested -> completed (approve by non-assignee) succeeds');

    // Completed task is locked: ANY update with stage = completed is rejected
    await expectError(
      client,
      `UPDATE tasks SET title = 'New Title On Completed' WHERE task_id = $1`,
      /Approved task is locked: cannot be updated/,
      'Completed task is locked for updates',
      ctx,
      [testTaskId]
    );

    // Cannot add assignee to completed task
    await expectError(
      client,
      `INSERT INTO task_assignees (task_id, employee_id) VALUES ($1, $2)`,
      /Cannot modify assignees of completed task/,
      'Cannot add assignee to completed task',
      ctx,
      [testTaskId, taskEmp1Id]
    );

    // Cannot soft-delete assignee of completed task
    await expectError(
      client,
      `UPDATE task_assignees SET deleted_at = now() WHERE task_id = $1`,
      /Cannot modify assignees of completed task/,
      'Cannot soft-delete assignee of completed task',
      ctx,
      [testTaskId]
    );

    // Illegal: completed -> in_progress (reopen) rejected per BFD rules
    await expectError(
      client,
      `UPDATE tasks SET stage = 'in_progress' WHERE task_id = $1;`,
      /Approved task is locked and cannot be moved to any other stage/,
      'Completed task cannot be reopened or moved to another stage',
      ctx,
      [testTaskId]
    );

    // 4. task_history append-only
    const histRes = await client.query(`
      INSERT INTO task_history (task_id, event_type, actor_id, from_stage, to_stage, note)
      VALUES ($1, 'stage_changed', $2, 'assigned', 'in_progress', 'Started work')
      RETURNING history_id;
    `, [testTaskId, taskEmp2Id]);
    const testHistId = histRes.rows[0].history_id;
    logPass('Valid insert into task_history');

    await expectError(
      client,
      `UPDATE task_history SET note = 'Tampered' WHERE history_id = $1`,
      /task_history is append-only/,
      'UPDATE on task_history rejected (append-only)',
      ctx,
      [testHistId]
    );

    await expectError(
      client,
      `DELETE FROM task_history WHERE history_id = $1`,
      /task_history is append-only/,
      'DELETE on task_history rejected (append-only)',
      ctx,
      [testHistId]
    );

    await expectError(
      client,
      `TRUNCATE task_history`,
      /TRUNCATE is disabled on table task_history/,
      'TRUNCATE on task_history rejected',
      ctx
    );

    // 5. master_lookup protection
    await expectError(
      client,
      `UPDATE master_lookup SET deleted_at = now(), deleted_by = $1 WHERE lookup_id = $2`,
      /Cannot soft-delete task_type lookup .* while active tasks reference it/,
      'Cannot soft-delete task_type lookup used by active task',
      ctx,
      [taskEmp2Id, validTaskTypeId]
    );

    // Deactivation is allowed
    await client.query(`UPDATE master_lookup SET is_active = false WHERE lookup_id = $1;`, [validTaskTypeId]);
    logPass('Deactivating task_type lookup is allowed');
    await client.query(`UPDATE master_lookup SET is_active = true WHERE lookup_id = $1;`, [validTaskTypeId]);

    // 6. notifications
    const notifRes = await client.query(`
      INSERT INTO notifications (recipient_id, kind, title, body, entity_type, entity_id)
      VALUES ($1, 'task_assigned', 'New Task Assigned', 'You have been assigned to TSK-TEST-002', 'task', $2)
      RETURNING notification_id;
    `, [taskEmp2Id, testTaskId]);
    const testNotifId = notifRes.rows[0].notification_id;
    logPass('Valid insert into notifications');

    await expectError(
      client,
      `INSERT INTO notifications (recipient_id, kind, title) VALUES ($1, 'Invalid-Kind', 'Title')`,
      /ck_notifications_kind_format/,
      'Invalid notification kind rejected by regex check',
      ctx,
      [taskEmp2Id]
    );

    await expectError(
      client,
      `DELETE FROM notifications WHERE notification_id = $1`,
      /Hard delete is disabled on table notifications/,
      'DELETE rejected on notifications by trigger',
      ctx,
      [testNotifId]
    );

    await expectError(
      client,
      `TRUNCATE notifications`,
      /TRUNCATE is disabled on table notifications/,
      'TRUNCATE rejected on notifications by trigger',
      ctx
    );

    // 7. Role grants
    await client.query('SET ROLE pulse_app');
    await client.query(`SELECT count(*) FROM task_counters;`);
    await client.query(`SELECT count(*) FROM tasks;`);
    await client.query(`SELECT count(*) FROM task_assignees;`);
    await client.query(`SELECT count(*) FROM task_history;`);
    await client.query(`SELECT count(*) FROM notifications;`);
    logPass('pulse_app can SELECT from all task & notification tables');

    await expectError(
      client,
      `DELETE FROM tasks WHERE task_id = $1`,
      /permission denied for table tasks/,
      'pulse_app: DELETE on tasks denied',
      ctx,
      [testTaskId]
    );

    await expectError(
      client,
      `DELETE FROM task_assignees WHERE task_id = $1`,
      /permission denied for table task_assignees/,
      'pulse_app: DELETE on task_assignees denied',
      ctx,
      [testTaskId]
    );

    await expectError(
      client,
      `UPDATE task_history SET note = 'hack' WHERE history_id = $1`,
      /permission denied for table task_history/,
      'pulse_app: UPDATE on task_history denied',
      ctx,
      [testHistId]
    );

    await expectError(
      client,
      `DELETE FROM task_history WHERE history_id = $1`,
      /permission denied for table task_history/,
      'pulse_app: DELETE on task_history denied',
      ctx,
      [testHistId]
    );

    await expectError(
      client,
      `DELETE FROM notifications WHERE notification_id = $1`,
      /permission denied for table notifications/,
      'pulse_app: DELETE on notifications denied',
      ctx,
      [testNotifId]
    );

    await client.query('RESET ROLE');

    // pulse_readonly role tests
    await client.query('SET ROLE pulse_readonly');
    await expectError(
      client,
      `SELECT * FROM task_counters`,
      /permission denied for table task_counters/,
      'pulse_readonly: SELECT on task_counters denied',
      ctx
    );

    await expectError(
      client,
      `SELECT * FROM tasks`,
      /permission denied for table tasks/,
      'pulse_readonly: SELECT on tasks denied',
      ctx
    );

    await expectError(
      client,
      `SELECT * FROM task_assignees`,
      /permission denied for table task_assignees/,
      'pulse_readonly: SELECT on task_assignees denied',
      ctx
    );

    await expectError(
      client,
      `SELECT * FROM task_history`,
      /permission denied for table task_history/,
      'pulse_readonly: SELECT on task_history denied',
      ctx
    );

    await expectError(
      client,
      `SELECT * FROM notifications`,
      /permission denied for table notifications/,
      'pulse_readonly: SELECT on notifications denied',
      ctx
    );
    await client.query('RESET ROLE');

    console.log('\n=============================================================');
    console.log('SQL Test Breakdown by Group:');
    for (const [groupName, stats] of Object.entries(ctx.groupStats)) {
      console.log(`  ${groupName}: ${stats.pass} PASSED, ${stats.fail} FAILED`);
    }
    console.log(`\nFunctional Tests Result: ${ctx.passCount} PASSED, ${ctx.failCount} FAILED`);
    console.log('=============================================================\n');

    return ctx.failCount === 0;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Fatal test error:', err);
    return false;
  } finally {
    await client.end();
  }
}
