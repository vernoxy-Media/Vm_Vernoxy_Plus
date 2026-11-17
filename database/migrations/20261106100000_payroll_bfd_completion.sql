-- migrate:up
-- =============================================================================
-- Salary & Payroll BFD 1.0 completion
--  * Attendance month lock (Payroll cannot be locked while the month is open).
--  * Accounts users and company details in Payroll Settings.
--  * Every error and warning of an employee is kept (Checks tab), not just one flag.
--  * Per-employee payment, removable adjustments, history of every action.
--  * Monthly Salary Slip template (Template Management) and rendered slips.
-- =============================================================================

CREATE TABLE IF NOT EXISTS attendance_month_locks (
    lock_year integer NOT NULL,
    lock_month integer NOT NULL,
    is_locked boolean NOT NULL DEFAULT true,
    lock_mode varchar(10) NOT NULL DEFAULT 'MANUAL',
    locked_at timestamptz,
    locked_by integer REFERENCES employees(emp_id) ON DELETE SET NULL,
    unlocked_at timestamptz,
    unlocked_by integer REFERENCES employees(emp_id) ON DELETE SET NULL,
    unlock_reason varchar(250),
    updated_at timestamptz,
    CONSTRAINT pk_attendance_month_locks PRIMARY KEY (lock_year, lock_month),
    CONSTRAINT ck_attendance_month_locks_month CHECK (lock_month BETWEEN 1 AND 12),
    CONSTRAINT ck_attendance_month_locks_mode CHECK (lock_mode IN ('MANUAL', 'AUTO'))
);

ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS accounts_emp_ids integer[] NOT NULL DEFAULT '{}';
ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS company_name varchar(150);
ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS company_address varchar(300);

ALTER TABLE payroll_employees ADD COLUMN IF NOT EXISTS issues jsonb NOT NULL DEFAULT '[]';
ALTER TABLE payroll_employees ADD COLUMN IF NOT EXISTS paid_on date;
ALTER TABLE payroll_employees ADD COLUMN IF NOT EXISTS payment_reference varchar(100);

ALTER TABLE payroll_adjustments ADD COLUMN IF NOT EXISTS removed_reason varchar(250);
ALTER TABLE payroll_adjustments ADD COLUMN IF NOT EXISTS removed_by integer REFERENCES employees(emp_id) ON DELETE SET NULL;
ALTER TABLE payroll_adjustments ADD COLUMN IF NOT EXISTS removed_at timestamptz;

ALTER TABLE payroll_salary_slips ADD COLUMN IF NOT EXISTS content_html text;

ALTER TYPE payroll_run_action ADD VALUE IF NOT EXISTS 'ADJUSTED';
ALTER TYPE payroll_run_action ADD VALUE IF NOT EXISTS 'OT_DECIDED';
ALTER TYPE payroll_run_action ADD VALUE IF NOT EXISTS 'SLIPS_GENERATED';
ALTER TYPE payroll_run_action ADD VALUE IF NOT EXISTS 'SLIPS_RELEASED';

-- Monthly Salary Slip template. Placeholders are the Payroll fields of BFD Section 5, Part 5.
INSERT INTO document_templates (code, name, document_type, description, content_html, is_active)
VALUES (
    'tpl_payroll_salary_slip',
    'Salary Slip',
    'payroll_salary_slip',
    'Monthly Salary Slip made in bulk from a locked Payroll Run.',
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:760px;margin:0 auto;">
<table width="100%" style="border-collapse:collapse;margin-bottom:12px;"><tr>
<td><h2 style="margin:0;">{{CompanyName}}</h2><div style="font-size:12px;color:#475569;">{{CompanyAddress}}</div></td>
<td style="text-align:right;"><div style="font-size:18px;font-weight:bold;">Salary Slip</div><div style="font-size:12px;">{{Month}}</div><div style="font-size:11px;color:#64748b;">{{SlipNumber}}</div></td>
</tr></table>
<table width="100%" cellpadding="6" style="border-collapse:collapse;font-size:12px;border:1px solid #cbd5e1;">
<tr><td><b>Employee</b></td><td>{{EmployeeName}} ({{EmployeeCode}})</td><td><b>Department</b></td><td>{{Department}}</td></tr>
<tr><td><b>Designation</b></td><td>{{Designation}}</td><td><b>UAN</b></td><td>{{UAN}}</td></tr>
<tr><td><b>Paid Days</b></td><td>{{PaidDays}}</td><td><b>LOP Days</b></td><td>{{LOPDays}}</td></tr>
<tr><td><b>OT Hours</b></td><td>{{OTHours}}</td><td><b>Bank A/c</b></td><td>{{BankAccount}}</td></tr>
</table>
<table width="100%" cellpadding="6" style="border-collapse:collapse;font-size:12px;margin-top:12px;border:1px solid #cbd5e1;">
<tr style="background:#f1f5f9;"><th align="left">Earnings</th><th align="right">Amount (₹)</th><th align="left">Deductions</th><th align="right">Amount (₹)</th></tr>
<tr><td colspan="2" style="vertical-align:top;padding:0;">{{EarningsRows}}</td><td colspan="2" style="vertical-align:top;padding:0;">{{DeductionsRows}}</td></tr>
<tr style="background:#f8fafc;font-weight:bold;"><td>Gross</td><td align="right">{{Gross}}</td><td>Total Deductions</td><td align="right">{{TotalDeductions}}</td></tr>
</table>
<p style="font-size:15px;margin-top:14px;"><b>Net Pay: ₹ {{NetPay}}</b><br><span style="font-size:12px;color:#475569;">{{NetPayInWords}}</span></p>
<p style="font-size:11px;color:#94a3b8;">This is a system generated Salary Slip and does not need a signature.</p>
</div>',
    true
)
ON CONFLICT (code) DO NOTHING;

-- migrate:down
DELETE FROM document_templates WHERE code = 'tpl_payroll_salary_slip'
  AND NOT EXISTS (SELECT 1 FROM payroll_salary_slips s WHERE s.template_id = document_templates.template_id);
ALTER TABLE payroll_salary_slips DROP COLUMN IF EXISTS content_html;
ALTER TABLE payroll_adjustments DROP COLUMN IF EXISTS removed_at;
ALTER TABLE payroll_adjustments DROP COLUMN IF EXISTS removed_by;
ALTER TABLE payroll_adjustments DROP COLUMN IF EXISTS removed_reason;
ALTER TABLE payroll_employees DROP COLUMN IF EXISTS payment_reference;
ALTER TABLE payroll_employees DROP COLUMN IF EXISTS paid_on;
ALTER TABLE payroll_employees DROP COLUMN IF EXISTS issues;
ALTER TABLE payroll_settings DROP COLUMN IF EXISTS company_address;
ALTER TABLE payroll_settings DROP COLUMN IF EXISTS company_name;
ALTER TABLE payroll_settings DROP COLUMN IF EXISTS accounts_emp_ids;
DROP TABLE IF EXISTS attendance_month_locks;
-- Enum values added to payroll_run_action stay (PostgreSQL cannot drop enum values).
