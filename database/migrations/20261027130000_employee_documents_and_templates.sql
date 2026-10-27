-- migrate:up
-- =============================================================================
-- Migration: Employee Documents and Document Templates
-- Description: Creates employee_documents and document_templates tables with
--              default letter templates and indexes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS document_templates (
    template_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    content_html TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT REFERENCES employees(emp_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ,
    updated_by INT REFERENCES employees(emp_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS employee_documents (
    doc_id SERIAL PRIMARY KEY,
    emp_id INT NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'given_to_employee', 'taken_from_employee', 'agreement'
    document_type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    is_ticked BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'not_ticked', -- 'uploaded', 'file_pending', 'not_ticked', 'locked', 'draft', 'final'
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INT,
    mime_type VARCHAR(100),
    draft_content TEXT,
    template_id INT REFERENCES document_templates(template_id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ,
    issued_by INT REFERENCES employees(emp_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT REFERENCES employees(emp_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ,
    updated_by INT REFERENCES employees(emp_id) ON DELETE SET NULL,
    CONSTRAINT uq_emp_doc_type UNIQUE (emp_id, document_type)
);

CREATE INDEX IF NOT EXISTS ix_employee_documents_emp_id ON employee_documents(emp_id);
CREATE INDEX IF NOT EXISTS ix_employee_documents_category ON employee_documents(category);
CREATE INDEX IF NOT EXISTS ix_document_templates_type ON document_templates(document_type);

-- Seed default standard templates for company letters
INSERT INTO document_templates (code, name, document_type, description, content_html)
VALUES
(
    'tpl_offer_letter_std',
    'Standard Offer Letter',
    'offer_letter',
    'Formal appointment offer letter detailing role, department, salary package, and proposed joining date.',
    '<h2>Vernoxy Pulse Technologies Private Limited</h2>
<p><strong>Date:</strong> {{current_date}}</p>
<p><strong>To:</strong><br>{{employee_name}}<br>{{employee_address}}</p>
<p><strong>Subject: Offer of Employment - {{designation}}</strong></p>
<p>Dear {{employee_name}},</p>
<p>We are pleased to extend an offer of employment to you for the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at Vernoxy Pulse.</p>
<p><strong>1. Compensation & Benefits:</strong> Your total monthly gross salary will be <strong>INR {{salary}}/-</strong> (plus applicable statutory Provident Fund benefits of <strong>INR {{pf}}/-</strong>).</p>
<p><strong>2. Proposed Date of Joining:</strong> Your expected date of joining will be <strong>{{proposed_joining_date}}</strong>.</p>
<p><strong>3. Reporting Office:</strong> Vernoxy Pulse Corporate Headquarters, Surat, Gujarat.</p>
<p>Please review and sign a copy of this offer letter as an acceptance of our offer within 3 business days.</p>
<p>Warm regards,<br><strong>Human Resources Team</strong><br>Vernoxy Pulse</p>'
),
(
    'tpl_joining_letter_std',
    'Standard Joining Letter',
    'joining_letter',
    'Official joining confirmation issued on the employee’s confirmed joining date.',
    '<h2>Vernoxy Pulse Technologies Private Limited</h2>
<p><strong>Date:</strong> {{current_date}}</p>
<p><strong>To:</strong> {{employee_name}} (Emp ID: {{employee_code}})</p>
<p><strong>Subject: Welcome to Vernoxy Pulse - Appointment & Joining Confirmation</strong></p>
<p>Dear {{employee_name}},</p>
<p>We are delighted to formally welcome you to the Vernoxy family! This letter confirms your joining with Vernoxy Pulse Technologies on <strong>{{joining_date}}</strong> as <strong>{{designation}}</strong>.</p>
<p>You will be reporting to <strong>{{reporting_manager}}</strong> in the <strong>{{department}}</strong> department.</p>
<p>We look forward to a rewarding and successful journey together.</p>
<p>Warm regards,<br><strong>Operations & HR Directorate</strong><br>Vernoxy Pulse</p>'
),
(
    'tpl_experience_letter_std',
    'Standard Experience & Relieving Certificate',
    'experience_letter',
    'Experience certificate specifying service period, role, conduct, and final relief.',
    '<h2>Vernoxy Pulse Technologies Private Limited</h2>
<p><strong>Date of Issue:</strong> {{current_date}}</p>
<p><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
<p>This is to certify that <strong>{{employee_name}}</strong> was employed with Vernoxy Pulse Technologies Private Limited from <strong>{{joining_date}}</strong> to <strong>{{termination_date}}</strong>.</p>
<p>During this tenure, {{employee_name}} served as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department. Their conduct and performance were observed to be diligent, sincere, and professional.</p>
<p>All company assets and responsibilities have been duly handed over. We wish {{employee_name}} all success in future career endeavours.</p>
<p>Sincerely,<br><strong>Authorized Signatory</strong><br>Human Resources & Administration</p>'
),
(
    'tpl_relieving_letter_std',
    'Standard Relieving Letter',
    'relieving_letter',
    'Official relieving order acknowledging completion of notice period and settlement.',
    '<h2>Vernoxy Pulse Technologies Private Limited</h2>
<p><strong>Date:</strong> {{current_date}}</p>
<p><strong>To:</strong> {{employee_name}} (Emp ID: {{employee_code}})</p>
<p><strong>Subject: Relieving Order & Clearance</strong></p>
<p>Dear {{employee_name}},</p>
<p>With reference to your formal resignation, we confirm that you have been relieved of your duties as <strong>{{designation}}</strong> at the close of business hours on <strong>{{termination_date}}</strong>.</p>
<p>Your full and final settlement accounts will be processed as per company policies. We thank you for your contributions to Vernoxy Pulse.</p>
<p>Warm regards,<br><strong>Human Resources Department</strong></p>'
),
(
    'tpl_salary_slip_final',
    'Final Settlement Salary Slip Summary',
    'salary_slip',
    'Summary document of final salary slip issued upon employee departure.',
    '<h2>Vernoxy Pulse Technologies - Final Pay Statement</h2>
<p><strong>Employee:</strong> {{employee_name}} ({{employee_code}})</p>
<p><strong>Designation:</strong> {{designation}} | <strong>Department:</strong> {{department}}</p>
<p><strong>Last Working Day:</strong> {{termination_date}}</p>
<table border="1" cellpadding="6" cellspacing="0" width="100%">
<tr><th>Earnings Component</th><th>Amount (INR)</th></tr>
<tr><td>Basic & Special Allowances</td><td>{{salary}}</td></tr>
<tr><td>Provident Fund (Employer Contribution)</td><td>{{pf}}</td></tr>
</table>
<p>Issued by Finance & Payroll, Vernoxy Pulse.</p>'
)
ON CONFLICT (code) DO NOTHING;

-- migrate:down
DROP TABLE IF EXISTS employee_documents;
DROP TABLE IF EXISTS document_templates;
