import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  EmployeeDocumentItemDto,
  DocumentTemplateItemDto,
  GenerateDocumentDraftDto,
  FinalizeDocumentDraftDto,
  EmployeeActivationStatusDto,
  ActivateEmployeeResponseDto,
} from '../../presentation/dto/employee-document.dto';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as argon2 from 'argon2';

interface PredefinedDoc {
  type: string;
  category: 'given_to_employee' | 'taken_from_employee' | 'agreement';
  title: string;
  lockWhenActive?: boolean;
  isRequiredForActivation?: boolean;
}

const PREDEFINED_DOCS: PredefinedDoc[] = [
  // Given to employee
  { type: 'offer_letter', category: 'given_to_employee', title: 'Offer Letter' },
  { type: 'joining_letter', category: 'given_to_employee', title: 'Joining Letter' },
  { type: 'experience_letter', category: 'given_to_employee', title: 'Experience Letter', lockWhenActive: true },
  { type: 'salary_slip', category: 'given_to_employee', title: 'Salary Slip', lockWhenActive: true },
  { type: 'relieving_letter', category: 'given_to_employee', title: 'Relieving Letter', lockWhenActive: true },

  // Taken from employee (BFD Screen 8 Part 2 rules)
  { type: 'marksheet_10th', category: 'taken_from_employee', title: '10th Standard Marksheet', isRequiredForActivation: true },
  { type: 'marksheet_12th', category: 'taken_from_employee', title: '12th Standard Marksheet (or Diploma)', isRequiredForActivation: true },
  { type: 'marksheet_ug', category: 'taken_from_employee', title: 'Graduation Degree / Marksheet', isRequiredForActivation: true },
  { type: 'marksheet_pg', category: 'taken_from_employee', title: 'Post-Graduation Marksheet' },
  { type: 'pan_card', category: 'taken_from_employee', title: 'PAN Card', isRequiredForActivation: true },
  { type: 'aadhaar_card', category: 'taken_from_employee', title: 'Aadhaar Card', isRequiredForActivation: true },
  { type: 'passport_photos', category: 'taken_from_employee', title: 'Passport Size Photo', isRequiredForActivation: true },
  { type: 'bank_details', category: 'taken_from_employee', title: 'Bank Details (Passbook or cancelled cheque)', isRequiredForActivation: true },
  { type: 'experience_letter_old', category: 'taken_from_employee', title: 'Previous Experience / Relieving Letter' },
  { type: 'salary_slip_old', category: 'taken_from_employee', title: 'Last 3 Salary Slips' },
  { type: 'offer_letter_old', category: 'taken_from_employee', title: 'Offer Letter (old company)' },
  { type: 'joining_letter_old', category: 'taken_from_employee', title: 'Joining Letter (old company)' },

  // Agreement
  { type: 'nda_signed', category: 'agreement', title: 'NDA signed', isRequiredForActivation: true },
];

const argon2Options: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;

  let pwd = '';
  pwd += upper[crypto.randomInt(0, upper.length)];
  pwd += lower[crypto.randomInt(0, lower.length)];
  pwd += digits[crypto.randomInt(0, digits.length)];
  pwd += symbols[crypto.randomInt(0, symbols.length)];

  for (let i = 0; i < 8; i++) {
    pwd += all[crypto.randomInt(0, all.length)];
  }

  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

@Injectable()
export class EmployeeDocumentService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getEmployeeDocuments(empId: number): Promise<EmployeeDocumentItemDto[]> {
    const empResult = await this.prisma.$queryRaw<Array<{ emp_id: number; status: string }>>`
      SELECT emp_id, status FROM employees WHERE emp_id = ${empId} AND deleted_at IS NULL
    `;
    if (!empResult || empResult.length === 0) {
      throw new NotFoundException(`Employee with ID ${empId} not found`);
    }
    const emp = empResult[0];
    const isEmployeeActive = emp.status === 'Active';

    // Fetch existing docs
    const existingDocs = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM employee_documents WHERE emp_id = ${empId} ORDER BY doc_id ASC
    `;

    const existingMap = new Map<string, any>();
    for (const d of existingDocs) {
      existingMap.set(d.document_type, d);
    }

    // Check and create missing predefined docs
    for (const def of PREDEFINED_DOCS) {
      if (!existingMap.has(def.type)) {
        const defaultStatus = def.lockWhenActive && isEmployeeActive ? 'locked' : 'not_ticked';
        const isReq = def.isRequiredForActivation ?? false;
        const inserted = await this.prisma.$queryRaw<any[]>`
          INSERT INTO employee_documents (emp_id, category, document_type, title, is_ticked, status, is_required_for_activation)
          VALUES (${empId}, ${def.category}, ${def.type}, ${def.title}, FALSE, ${defaultStatus}, ${isReq})
          ON CONFLICT (emp_id, document_type) DO UPDATE SET updated_at = NOW()
          RETURNING *
        `;
        if (inserted && inserted[0]) {
          existingMap.set(def.type, inserted[0]);
        }
      }
    }

    // Return all sorted in the order of PREDEFINED_DOCS
    const results: EmployeeDocumentItemDto[] = [];
    for (const def of PREDEFINED_DOCS) {
      const doc = existingMap.get(def.type);
      if (doc) {
        let status = doc.status;
        if (def.lockWhenActive) {
          if (isEmployeeActive && status !== 'uploaded' && status !== 'final') {
            status = 'locked';
          } else if (!isEmployeeActive && status === 'locked') {
            status = doc.is_ticked ? 'file_pending' : 'not_ticked';
          }
        }
        // Only return draft_content if it is an actual HTML draft letter
        const isHtmlDraft = doc.draft_content && doc.draft_content.trim().startsWith('<');
        results.push({
          doc_id: doc.doc_id,
          emp_id: doc.emp_id,
          category: doc.category,
          document_type: doc.document_type,
          title: doc.title,
          is_ticked: Boolean(doc.is_ticked),
          status,
          is_required_for_activation: Boolean(doc.is_required_for_activation ?? def.isRequiredForActivation),
          file_url: doc.file_url,
          file_name: doc.file_name,
          file_size: doc.file_size ? Number(doc.file_size) : null,
          mime_type: doc.mime_type,
          draft_content: isHtmlDraft ? doc.draft_content : null,
          template_id: doc.template_id,
          issued_at: doc.issued_at ? new Date(doc.issued_at).toISOString() : null,
          created_at: new Date(doc.created_at).toISOString(),
          updated_at: doc.updated_at ? new Date(doc.updated_at).toISOString() : null,
        });
      }
    }

    return results;
  }

  async toggleDocument(empId: number, documentType: string, isTicked: boolean, adminId: number): Promise<EmployeeDocumentItemDto> {
    const docs = await this.getEmployeeDocuments(empId);
    const target = docs.find((d) => d.document_type === documentType);
    if (!target) {
      throw new NotFoundException(`Document type ${documentType} not found for employee ${empId}`);
    }

    let nextStatus = target.status;
    if (target.status === 'locked') {
      throw new BadRequestException(`Document ${target.title} is locked while the employee is active.`);
    }

    if (isTicked) {
      if (target.file_url) {
        nextStatus = 'uploaded';
      } else if (target.status === 'not_ticked') {
        nextStatus = 'file_pending';
      }
    } else {
      if (!target.file_url) {
        nextStatus = 'not_ticked';
      }
    }

    await this.prisma.$executeRaw`
      UPDATE employee_documents
      SET is_ticked = ${isTicked},
          status = ${nextStatus},
          updated_at = NOW(),
          updated_by = ${adminId}
      WHERE emp_id = ${empId} AND document_type = ${documentType}
    `;

    const refreshed = await this.getEmployeeDocuments(empId);
    return refreshed.find((d) => d.document_type === documentType)!;
  }

  async uploadDocumentFile(
    empId: number,
    documentType: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    adminId: number,
  ): Promise<EmployeeDocumentItemDto> {
    const docs = await this.getEmployeeDocuments(empId);
    const target = docs.find((d) => d.document_type === documentType);
    if (!target) {
      throw new NotFoundException(`Document type ${documentType} not found`);
    }

    if (target.status === 'locked') {
      throw new BadRequestException(`Document ${target.title} is locked.`);
    }

    // Generate safe storage path in storage/employee-docs/<empId>/
    const repoRoot = path.resolve(__dirname, '../../../../../../..');
    const storageDir = path.resolve(repoRoot, 'storage', 'employee-docs', String(empId));
    if (!fs.existsSync(storageDir)) {
      await fs.promises.mkdir(storageDir, { recursive: true });
    }

    // Clean any prior file for this documentType in storageDir
    try {
      const existingFiles = fs.readdirSync(storageDir);
      for (const f of existingFiles) {
        if (f.startsWith(`${documentType}-`)) {
          fs.unlinkSync(path.join(storageDir, f));
        }
      }
    } catch {}

    const safeExt = file.originalname.includes('.')
      ? file.originalname.split('.').pop()!.replace(/[^a-zA-Z0-9]/g, '')
      : 'pdf';
    const diskFileName = `${documentType}-${crypto.randomBytes(8).toString('hex')}.${safeExt}`;
    const absPath = path.resolve(storageDir, diskFileName);
    await fs.promises.writeFile(absPath, file.buffer);

    const fileUrl = `/api/v1/employees/${empId}/documents/${documentType}/download`;

    await this.prisma.$executeRaw`
      UPDATE employee_documents
      SET file_url = ${fileUrl},
          file_name = ${file.originalname},
          file_size = ${file.size},
          mime_type = ${file.mimetype},
          draft_content = NULL,
          is_ticked = TRUE,
          status = 'uploaded',
          updated_at = NOW(),
          updated_by = ${adminId}
      WHERE emp_id = ${empId} AND document_type = ${documentType}
    `;

    const refreshed = await this.getEmployeeDocuments(empId);
    return refreshed.find((d) => d.document_type === documentType)!;
  }

  async removeDocumentFile(empId: number, documentType: string, adminId: number): Promise<EmployeeDocumentItemDto> {
    const docs = await this.getEmployeeDocuments(empId);
    const target = docs.find((d) => d.document_type === documentType);
    if (!target) {
      throw new NotFoundException(`Document type ${documentType} not found`);
    }

    const repoRoot = path.resolve(__dirname, '../../../../../../..');
    const storageDir = path.resolve(repoRoot, 'storage', 'employee-docs', String(empId));
    if (fs.existsSync(storageDir)) {
      try {
        const files = fs.readdirSync(storageDir);
        for (const f of files) {
          if (f.startsWith(`${documentType}-`)) {
            fs.unlinkSync(path.join(storageDir, f));
          }
        }
      } catch {}
    }

    const nextStatus = target.is_ticked ? 'file_pending' : 'not_ticked';

    await this.prisma.$executeRaw`
      UPDATE employee_documents
      SET file_url = NULL,
          file_name = NULL,
          file_size = NULL,
          mime_type = NULL,
          draft_content = NULL,
          status = ${nextStatus},
          updated_at = NOW(),
          updated_by = ${adminId}
      WHERE emp_id = ${empId} AND document_type = ${documentType}
    `;

    const refreshed = await this.getEmployeeDocuments(empId);
    return refreshed.find((d) => d.document_type === documentType)!;
  }

  async listTemplates(documentType?: string): Promise<DocumentTemplateItemDto[]> {
    let templates: any[];
    if (documentType) {
      templates = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM document_templates WHERE is_active = TRUE AND document_type = ${documentType} ORDER BY template_id ASC
      `;
    } else {
      templates = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM document_templates WHERE is_active = TRUE ORDER BY template_id ASC
      `;
    }

    return templates.map((t) => ({
      template_id: t.template_id,
      code: t.code,
      name: t.name,
      document_type: t.document_type,
      description: t.description,
      content_html: t.content_html,
      is_active: t.is_active,
    }));
  }

  async generateDraft(
    empId: number,
    dto: GenerateDocumentDraftDto,
    adminId: number,
  ): Promise<{ draft_content: string; document: EmployeeDocumentItemDto }> {
    // 1. Fetch full employee record
    const empRows = await this.prisma.$queryRaw<any[]>`
      SELECT e.*, r.role_name, d.name as primary_dep_name, m.name as manager_name
      FROM employees e
      LEFT JOIN roles r ON r.role_id = e.role_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      LEFT JOIN employees m ON m.emp_id = e.reporting_manager
      WHERE e.emp_id = ${empId} AND e.deleted_at IS NULL
    `;
    if (!empRows || empRows.length === 0) {
      throw new NotFoundException(`Employee ${empId} not found`);
    }
    const emp = empRows[0];

    // Fetch all department names
    const deptRows = await this.prisma.$queryRaw<any[]>`
      SELECT d.name FROM employee_departments ed
      JOIN departments d ON d.dep_id = ed.dep_id
      WHERE ed.emp_id = ${empId}
    `;
    const depNames = deptRows.map((d) => d.name).join(', ') || emp.primary_dep_name || 'General';

    // 2. Fetch template
    let tpl: any;
    if (dto.template_id) {
      const tRows = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM document_templates WHERE template_id = ${dto.template_id} AND is_active = TRUE
      `;
      if (tRows && tRows.length > 0) tpl = tRows[0];
    }
    if (!tpl) {
      const tRows = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM document_templates WHERE document_type = ${dto.document_type} AND is_active = TRUE LIMIT 1
      `;
      if (tRows && tRows.length > 0) tpl = tRows[0];
    }
    if (!tpl) {
      throw new NotFoundException(`No active template found for document type ${dto.document_type}`);
    }

    // 3. Format dates and variables
    const formatDate = (date: any) => {
      if (!date) return '-';
      const d = new Date(date);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const salaryVal = dto.custom_salary !== undefined ? Number(dto.custom_salary) : Number(emp.salary || 0);
    const pfVal = dto.custom_pf !== undefined ? Number(dto.custom_pf) : Number(emp.pf || 0);
    const joiningDateStr = formatDate(emp.joining_date);
    const proposedJoiningDateStr = dto.proposed_joining_date ? formatDate(dto.proposed_joining_date) : joiningDateStr;
    const todayStr = formatDate(new Date());
    const termDateStr = emp.termination_date ? formatDate(emp.termination_date) : todayStr;

    // 4. Substitute placeholders
    let draftHtml = tpl.content_html;
    draftHtml = draftHtml.replace(/\{\{current_date\}\}/g, todayStr);
    draftHtml = draftHtml.replace(/\{\{employee_name\}\}/g, emp.name);
    draftHtml = draftHtml.replace(/\{\{employee_code\}\}/g, `EMP-${String(emp.emp_id).padStart(4, '0')}`);
    draftHtml = draftHtml.replace(/\{\{designation\}\}/g, emp.role_name || 'Executive');
    draftHtml = draftHtml.replace(/\{\{department\}\}/g, depNames);
    draftHtml = draftHtml.replace(/\{\{joining_date\}\}/g, joiningDateStr);
    draftHtml = draftHtml.replace(/\{\{proposed_joining_date\}\}/g, proposedJoiningDateStr);
    draftHtml = draftHtml.replace(/\{\{salary\}\}/g, salaryVal.toLocaleString());
    draftHtml = draftHtml.replace(/\{\{pf\}\}/g, pfVal.toLocaleString());
    draftHtml = draftHtml.replace(/\{\{employee_address\}\}/g, emp.address || 'Surat, Gujarat');
    draftHtml = draftHtml.replace(/\{\{reporting_manager\}\}/g, emp.manager_name || 'Management');
    draftHtml = draftHtml.replace(/\{\{termination_date\}\}/g, termDateStr);

    // 5. Save draft into employee_documents
    await this.prisma.$executeRaw`
      UPDATE employee_documents
      SET draft_content = ${draftHtml},
          template_id = ${tpl.template_id},
          status = 'draft',
          is_ticked = TRUE,
          updated_at = NOW(),
          updated_by = ${adminId}
      WHERE emp_id = ${empId} AND document_type = ${dto.document_type}
    `;

    const refreshed = await this.getEmployeeDocuments(empId);
    const updatedDoc = refreshed.find((d) => d.document_type === dto.document_type)!;

    return {
      draft_content: draftHtml,
      document: updatedDoc,
    };
  }

  async finalizeDraft(
    empId: number,
    dto: FinalizeDocumentDraftDto,
    adminId: number,
  ): Promise<EmployeeDocumentItemDto> {
    const empResult = await this.prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM employees WHERE emp_id = ${empId}
    `;
    const empName = empResult?.[0]?.name || 'Employee';
    const cleanName = empName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${dto.document_type}_${cleanName}.doc`;
    const fileUrl = `/api/v1/employees/${empId}/documents/${dto.document_type}/download`;

    await this.prisma.$executeRaw`
      UPDATE employee_documents
      SET draft_content = ${dto.final_content},
          file_name = ${fileName},
          file_url = ${fileUrl},
          mime_type = 'application/msword',
          file_size = ${Buffer.byteLength(dto.final_content, 'utf8')},
          status = 'uploaded',
          is_ticked = TRUE,
          issued_at = NOW(),
          issued_by = ${adminId},
          updated_at = NOW(),
          updated_by = ${adminId}
      WHERE emp_id = ${empId} AND document_type = ${dto.document_type}
    `;

    const refreshed = await this.getEmployeeDocuments(empId);
    return refreshed.find((d) => d.document_type === dto.document_type)!;
  }

  async getDocumentForDownload(
    empId: number,
    documentType: string,
  ): Promise<{ content: string | Buffer; fileName: string; mimeType: string }> {
    const docs = await this.getEmployeeDocuments(empId);
    const doc = docs.find((d) => d.document_type === documentType);
    if (!doc) {
      throw new NotFoundException(`Document ${documentType} not found`);
    }

    // 1. Check if an uploaded file exists in storage/employee-docs/<empId>/
    const repoRoot = path.resolve(__dirname, '../../../../../../..');
    const storageDir = path.resolve(repoRoot, 'storage', 'employee-docs', String(empId));
    if (fs.existsSync(storageDir)) {
      const files = fs.readdirSync(storageDir);
      const match = files.find((f) => f.startsWith(`${documentType}-`));
      if (match) {
        const buffer = await fs.promises.readFile(path.join(storageDir, match));
        return {
          content: buffer,
          fileName: doc.file_name || `${documentType}.pdf`,
          mimeType: doc.mime_type || 'application/octet-stream',
        };
      }
    }

    if (doc.draft_content) {
      // Export as HTML/MS Word document
      const docHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${doc.title}</title>
          <style>
            body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; padding: 40px; }
            h2 { color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
            table { border-collapse: collapse; width: 100%; margin: 16px 0; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          ${doc.draft_content}
        </body>
        </html>
      `;
      return {
        content: docHtml,
        fileName: doc.file_name || `${documentType}.doc`,
        mimeType: 'application/msword',
      };
    }

    throw new NotFoundException(`Document file content not available`);
  }

  async getActivationEligibility(empId: number): Promise<EmployeeActivationStatusDto> {
    const empResult = await this.prisma.$queryRaw<Array<{ emp_id: number; status: string }>>`
      SELECT emp_id, status FROM employees WHERE emp_id = ${empId} AND deleted_at IS NULL
    `;
    if (!empResult || empResult.length === 0) {
      throw new NotFoundException(`Employee with ID ${empId} not found`);
    }
    const emp = empResult[0];
    if (emp.status === 'Active') {
      return {
        can_activate: false,
        is_already_active: true,
        missing_documents: [],
        total_required: 0,
        completed_required: 0,
      };
    }

    const docs = await this.getEmployeeDocuments(empId);
    // Find all required documents (excluding ones specifically unticked by admin as not applicable)
    const requiredDocs = docs.filter(
      (d) => d.is_required_for_activation && (d.is_ticked || d.status === 'uploaded' || d.status === 'file_pending'),
    );
    const missingDocs: string[] = [];

    for (const doc of requiredDocs) {
      if (doc.status !== 'uploaded' && doc.status !== 'final') {
        missingDocs.push(doc.title);
      }
    }

    const totalRequired = requiredDocs.length;
    const completedRequired = totalRequired - missingDocs.length;
    const canActivate = missingDocs.length === 0 && totalRequired > 0;

    return {
      can_activate: canActivate,
      is_already_active: false,
      missing_documents: missingDocs,
      total_required: totalRequired,
      completed_required: completedRequired,
    };
  }

  async activateEmployee(empId: number, adminId: number): Promise<ActivateEmployeeResponseDto> {
    const eligibility = await this.getActivationEligibility(empId);
    if (eligibility.is_already_active) {
      throw new BadRequestException('Employee account is already active.');
    }
    if (!eligibility.can_activate) {
      throw new BadRequestException(
        `Cannot activate account. Mandatory documents are missing: ${eligibility.missing_documents.join(', ')}`,
      );
    }

    const empResult = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, name, email, office_email, personal_email, status, joining_date, dep_id, role_id
      FROM employees WHERE emp_id = ${empId} AND deleted_at IS NULL
    `;
    if (!empResult || empResult.length === 0) {
      throw new NotFoundException(`Employee with ID ${empId} not found`);
    }
    const emp = empResult[0];

    const tempPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(tempPassword, argon2Options);
    const officeEmail = (emp.office_email || emp.email || '').trim().toLowerCase();

    // 1. Update employee status to Active
    await this.prisma.$queryRaw`
      UPDATE employees
      SET status = 'Active', updated_at = NOW(), updated_by = ${adminId}
      WHERE emp_id = ${empId}
    `;

    // 2. Upsert credentials with must_change_password = true
    await this.prisma.$queryRaw`
      INSERT INTO employee_credentials (emp_id, password_hash, must_change_password, created_by, updated_at)
      VALUES (${empId}, ${passwordHash}, TRUE, ${adminId}, NOW())
      ON CONFLICT (emp_id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        must_change_password = TRUE,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
    `;

    // 3. Log into activity_logs
    await this.prisma.$executeRaw`
      INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
      VALUES (
        'EMPLOYEE', ${empId}, 'ACTIVATED', 'Account Activated',
        jsonb_build_object(
          'department_ids', ARRAY[${emp.dep_id}]::integer[],
          'role_id', ${emp.role_id || null}::integer,
          'effective_date', NOW(),
          'reason', 'Onboarding completed & credentials provisioned',
          'notes', 'System generated temporary login credentials'
        ),
        ${adminId}, NOW()
      )
    `;

    // 4. Log auth event
    await this.prisma.$queryRaw`
      INSERT INTO auth_events (emp_id, actor_emp_id, event_type, details)
      VALUES (${empId}, ${adminId}, 'credentials_created', '{"source":"activation","must_change_password":true}'::jsonb)
    `;

    // 5. Update linked candidate stage to 'joined' (Part 7: Candidate stage Onboarding -> Joined)
    await this.prisma.$executeRaw`
      UPDATE candidates
      SET stage = 'joined', updated_at = NOW()
      WHERE converted_to_emp_id = ${empId}
    `;

    // 6. Welcome message for Reporting Manager (Part 7: Reporting Manager gets "X joins your team today")
    if (emp.reporting_manager) {
      await this.prisma.$executeRaw`
        INSERT INTO notifications (recipient_id, kind, title, body, entity_type, entity_id, created_by)
        VALUES (${emp.reporting_manager}, 'welcome_team_member', 'New Team Member', ${`${emp.name} joins your team today.`}, 'employees', ${empId}, ${adminId})
      `.catch(() => {});
    }

    return {
      success: true,
      message: 'Employee account activated successfully. Login credentials generated.',
      emp_id: empId,
      office_email: officeEmail,
      temporary_password: tempPassword,
      must_change_password: true,
    };
  }

  async resendLogin(empId: number, adminId: number): Promise<ActivateEmployeeResponseDto> {
    const empResult = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, name, email, office_email, personal_email, status, dep_id, role_id
      FROM employees WHERE emp_id = ${empId} AND deleted_at IS NULL
    `;
    if (!empResult || empResult.length === 0) {
      throw new NotFoundException(`Employee with ID ${empId} not found`);
    }
    const emp = empResult[0];

    const tempPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(tempPassword, argon2Options);
    const officeEmail = (emp.office_email || emp.email || '').trim().toLowerCase();

    // Upsert credentials with must_change_password = true and fresh timestamp
    await this.prisma.$executeRaw`
      INSERT INTO employee_credentials (emp_id, password_hash, must_change_password, created_by, updated_at)
      VALUES (${empId}, ${passwordHash}, TRUE, ${adminId}, NOW())
      ON CONFLICT (emp_id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        must_change_password = TRUE,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
    `;

    // Log into activity_logs
    await this.prisma.$executeRaw`
      INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
      VALUES (
        'EMPLOYEE', ${empId}, 'CREDENTIALS_RESET', 'Login Resent',
        jsonb_build_object(
          'department_ids', ARRAY[${emp.dep_id}]::integer[],
          'role_id', ${emp.role_id || null}::integer,
          'effective_date', NOW(),
          'reason', 'Admin resent login credentials',
          'notes', 'System generated fresh temporary password'
        ),
        ${adminId}, NOW()
      )
    `;

    // Log auth event
    await this.prisma.$executeRaw`
      INSERT INTO auth_events (emp_id, actor_emp_id, event_type, details)
      VALUES (${empId}, ${adminId}, 'credentials_resent', '{"source":"resend_login","must_change_password":true}'::jsonb)
    `;

    return {
      success: true,
      message: 'New temporary login credentials generated successfully.',
      emp_id: empId,
      office_email: officeEmail,
      temporary_password: tempPassword,
      must_change_password: true,
    };
  }
}
