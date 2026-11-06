import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Optional,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { AUTH_TOKENS } from '../../../auth/application/ports/tokens';
import { MailPort, DocumentRequestMailItem } from '../../../auth/application/ports/auth.ports';
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

export interface PredefinedDoc {
  type: string;
  category: 'given_to_employee' | 'taken_from_employee' | 'agreement';
  title: string;
  lockWhenActive?: boolean;
  isRequiredForActivation?: boolean;
}

export const PREDEFINED_DOCS: PredefinedDoc[] = [
  // Agreement (Moved to top as requested)
  { type: 'nda_signed', category: 'agreement', title: 'NDA signed', isRequiredForActivation: true },

  // Given to employee
  { type: 'offer_letter', category: 'given_to_employee', title: 'Offer Letter' },
  { type: 'joining_letter', category: 'given_to_employee', title: 'Joining Letter' },
  { type: 'experience_letter', category: 'given_to_employee', title: 'Experience Letter', lockWhenActive: true },
  { type: 'salary_slip', category: 'given_to_employee', title: 'Salary Slip', lockWhenActive: true },
  { type: 'relieving_letter', category: 'given_to_employee', title: 'Relieving Letter', lockWhenActive: true },

  // Taken from employee (BFD Screen 8 Part 2 rules)
  { type: 'marksheet_10th', category: 'taken_from_employee', title: '10th Standard Marksheet', isRequiredForActivation: true },
  { type: 'marksheet_12th', category: 'taken_from_employee', title: '12th Standard Marksheet (or Diploma)', isRequiredForActivation: true },
  { type: 'marksheet_ug', category: 'taken_from_employee', title: 'Graduation Degree / Marksheet' },
  { type: 'marksheet_pg', category: 'taken_from_employee', title: 'Post-Graduation Marksheet' },
  { type: 'pan_card', category: 'taken_from_employee', title: 'PAN Card', isRequiredForActivation: true },
  { type: 'aadhaar_card', category: 'taken_from_employee', title: 'Aadhaar Card', isRequiredForActivation: true },
  { type: 'passport_photos', category: 'taken_from_employee', title: 'Passport Size Photo', isRequiredForActivation: true },
  { type: 'bank_details', category: 'taken_from_employee', title: 'Bank Details (Passbook or cancelled cheque)', isRequiredForActivation: true },
  { type: 'experience_letter_old', category: 'taken_from_employee', title: 'Previous Experience / Relieving Letter' },
  { type: 'salary_slip_old', category: 'taken_from_employee', title: 'Last 3 Salary Slips' },
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
export class EmployeeDocumentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmployeeDocumentService.name);
  private autoActivateInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(AUTH_TOKENS.MailPort) private readonly mailPort?: MailPort,
  ) {}

  onModuleInit() {
    // Check auto-activation on startup and every 5 minutes
    setTimeout(() => {
      this.autoActivateJoinedEmployees().catch((err) =>
        this.logger.error(`Error in initial auto-activation: ${err.message}`),
      );
    }, 5000);

    this.autoActivateInterval = setInterval(() => {
      this.autoActivateJoinedEmployees().catch((err) =>
        this.logger.error(`Error in periodic auto-activation: ${err.message}`),
      );
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.autoActivateInterval) {
      clearInterval(this.autoActivateInterval);
    }
  }

  async autoActivateJoinedEmployees(): Promise<number> {
    try {
      const candidatesToActivate = await this.prisma.$queryRaw<Array<{ emp_id: number; name: string }>>`
        SELECT e.emp_id, e.name
        FROM employees e
        WHERE e.status = 'Onboarding'
          AND e.joining_date <= CURRENT_DATE
          AND e.deleted_at IS NULL
      `;

      if (!candidatesToActivate || candidatesToActivate.length === 0) {
        return 0;
      }

      let activatedCount = 0;
      for (const cand of candidatesToActivate) {
        try {
          const eligibility = await this.getActivationEligibility(cand.emp_id);
          if (eligibility.can_activate) {
            await this.activateEmployee(cand.emp_id, 1);
            activatedCount++;
            this.logger.log(
              `[AutoActivation] Auto-activated employee ${cand.name} (EMP-${cand.emp_id}) on joining date.`,
            );
          }
        } catch (subErr: any) {
          this.logger.warn(
            `[AutoActivation] Could not auto-activate ${cand.name} (EMP-${cand.emp_id}): ${subErr.message}`,
          );
        }
      }
      return activatedCount;
    } catch (err: any) {
      this.logger.error(`Failed to execute autoActivateJoinedEmployees: ${err.message}`);
      return 0;
    }
  }

  async getEmployeeDocuments(empId: number): Promise<EmployeeDocumentItemDto[]> {
    const empResult = await this.prisma.$queryRaw<Array<{ emp_id: number; status: string }>>`
      SELECT emp_id, status FROM employees WHERE emp_id = ${empId} AND deleted_at IS NULL
    `;
    if (!empResult || empResult.length === 0) {
      throw new NotFoundException(`Employee with ID ${empId} not found`);
    }
    const emp = empResult[0];
    const isEmployeeDeactivated = emp.status === 'Inactive';

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
        const isReq = def.isRequiredForActivation ?? false;
        const defaultStatus = def.lockWhenActive && !isEmployeeDeactivated
          ? 'locked'
          : (isReq ? 'file_pending' : 'not_ticked');
        const defaultTicked = isReq;
        const inserted = await this.prisma.$queryRaw<any[]>`
          INSERT INTO employee_documents (emp_id, category, document_type, title, is_ticked, status, is_required_for_activation)
          VALUES (${empId}, ${def.category}, ${def.type}, ${def.title}, ${defaultTicked}, ${defaultStatus}, ${isReq})
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
          if (!isEmployeeDeactivated) {
            status = 'locked';
          } else if (isEmployeeDeactivated && status === 'locked') {
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

    // Also include any custom / other documents added for this employee
    for (const d of existingDocs) {
      if (!PREDEFINED_DOCS.some((def) => def.type === d.document_type)) {
        if (d.document_type === 'offer_letter_old' || d.document_type === 'joining_letter_old') {
          continue;
        }
        results.push({
          doc_id: d.doc_id,
          emp_id: d.emp_id,
          category: d.category || 'other',
          document_type: d.document_type,
          title: d.title,
          is_ticked: Boolean(d.is_ticked),
          status: d.status,
          is_required_for_activation: Boolean(d.is_required_for_activation),
          file_url: d.file_url,
          file_name: d.file_name,
          file_size: d.file_size ? Number(d.file_size) : null,
          mime_type: d.mime_type,
          draft_content: null,
          template_id: d.template_id,
          issued_at: d.issued_at ? new Date(d.issued_at).toISOString() : null,
          created_at: new Date(d.created_at).toISOString(),
          updated_at: d.updated_at ? new Date(d.updated_at).toISOString() : null,
        });
      }
    }

    return results;
  }

  async addCustomDocument(
    empId: number,
    title: string,
    isRequired: boolean,
    adminId: number,
  ): Promise<EmployeeDocumentItemDto> {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30);
    const documentType = `custom_${slug || 'doc'}_${Date.now()}`;

    const inserted = await this.prisma.$queryRaw<any[]>`
      INSERT INTO employee_documents (
        emp_id, category, document_type, title, is_ticked, status, is_required_for_activation, created_by
      ) VALUES (
        ${empId}, 'other', ${documentType}, ${title.trim()}, true, 'file_pending', ${isRequired}, ${adminId}
      )
      RETURNING *
    `;

    const doc = inserted[0];
    return {
      doc_id: doc.doc_id,
      emp_id: doc.emp_id,
      category: doc.category,
      document_type: doc.document_type,
      title: doc.title,
      is_ticked: Boolean(doc.is_ticked),
      status: doc.status,
      is_required_for_activation: Boolean(doc.is_required_for_activation),
      file_url: doc.file_url,
      file_name: doc.file_name,
      file_size: doc.file_size ? Number(doc.file_size) : null,
      mime_type: doc.mime_type,
      draft_content: null,
      template_id: doc.template_id,
      issued_at: null,
      created_at: new Date(doc.created_at).toISOString(),
      updated_at: doc.updated_at ? new Date(doc.updated_at).toISOString() : null,
    };
  }

  async deleteCustomDocument(
    empId: number,
    documentType: string,
    adminId: number,
  ): Promise<{ success: boolean }> {
    await this.prisma.$executeRaw`
      DELETE FROM employee_documents
      WHERE emp_id = ${empId} AND document_type = ${documentType}
    `;
    return { success: true };
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
    let finalStatus: string;
    if (documentType === 'offer_letter') {
      finalStatus = target.status === 'draft' ? 'issued' : 'accepted';
    } else if (documentType === 'joining_letter') {
      finalStatus = target.status === 'draft' ? 'issued' : 'uploaded';
    } else if (documentType === 'nda_signed') {
      finalStatus = target.status === 'draft' ? 'issued' : 'signed';
    } else {
      finalStatus = 'uploaded';
    }

    await this.prisma.$executeRaw`
      UPDATE employee_documents
      SET file_url = ${fileUrl},
          file_name = ${file.originalname},
          file_size = ${file.size},
          mime_type = ${file.mimetype},
          draft_content = NULL,
          is_ticked = TRUE,
          status = ${finalStatus},
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
      const isNda = documentType.includes('nda');
      if (isNda) {
        templates = await this.prisma.$queryRaw<any[]>`
          SELECT * FROM document_templates WHERE is_active = TRUE AND document_type IN ('nda', 'nda_signed') ORDER BY template_id ASC
        `;
      } else {
        templates = await this.prisma.$queryRaw<any[]>`
          SELECT * FROM document_templates WHERE is_active = TRUE AND document_type = ${documentType} ORDER BY template_id ASC
        `;
      }
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

    const isExitDoc = ['experience_letter', 'relieving_letter', 'salary_slip'].includes(dto.document_type);
    if (isExitDoc && emp.status !== 'Inactive') {
      throw new BadRequestException(
        `Document "${dto.document_type}" is an exit document and can only be generated after employee deactivation.`,
      );
    }

    if (dto.document_type === 'joining_letter') {
      const offerRows = await this.prisma.$queryRaw<any[]>`
        SELECT status FROM employee_documents
        WHERE emp_id = ${empId} AND document_type = 'offer_letter'
      `;
      const offerStatus = offerRows && offerRows[0]?.status;
      if (offerStatus !== 'accepted' && offerStatus !== 'uploaded' && offerStatus !== 'final') {
        throw new BadRequestException(
          'Joining Letter can only be generated after the Offer Letter is Accepted.',
        );
      }
    }

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
      const isNda = dto.document_type.includes('nda');
      let tRows: any[];
      if (isNda) {
        tRows = await this.prisma.$queryRaw<any[]>`
          SELECT * FROM document_templates WHERE document_type IN ('nda', 'nda_signed') AND is_active = TRUE LIMIT 1
        `;
      } else {
        tRows = await this.prisma.$queryRaw<any[]>`
          SELECT * FROM document_templates WHERE document_type = ${dto.document_type} AND is_active = TRUE LIMIT 1
        `;
      }
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
    const offerValidTillStr = dto.offer_valid_till_date ? formatDate(dto.offer_valid_till_date) : '-';
    const todayStr = formatDate(new Date());
    const termDateStr = emp.termination_date ? formatDate(emp.termination_date) : todayStr;
    const empName = dto.candidate_name?.trim() || emp.name;
    const designationStr = dto.designation?.trim() || emp.role_name || 'Executive';
    const finalDepNames = dto.department?.trim() || depNames;

    const reportingManagerStr = emp.manager_name || 'Management';
    const shiftStr = emp.shift || 'General Shift (09:30 AM - 06:30 PM)';
    const probationStr = emp.probation_period || '3 Months';

    // 4. Substitute placeholders
    let draftHtml = tpl.content_html;
    draftHtml = draftHtml.replace(/\{\{current_date\}\}/g, todayStr);
    draftHtml = draftHtml.replace(/\{\{employee_name\}\}/g, empName);
    draftHtml = draftHtml.replace(/\{\{employee_code\}\}/g, `EMP-${String(emp.emp_id).padStart(4, '0')}`);
    draftHtml = draftHtml.replace(/\{\{designation\}\}/g, designationStr);
    draftHtml = draftHtml.replace(/\{\{department\}\}/g, finalDepNames);
    draftHtml = draftHtml.replace(/\{\{joining_date\}\}/g, joiningDateStr);
    draftHtml = draftHtml.replace(/\{\{proposed_joining_date\}\}/g, proposedJoiningDateStr);
    draftHtml = draftHtml.replace(/\{\{offer_valid_till_date\}\}/g, offerValidTillStr);
    draftHtml = draftHtml.replace(/\{\{salary\}\}/g, salaryVal.toLocaleString());
    draftHtml = draftHtml.replace(/\{\{pf\}\}/g, pfVal.toLocaleString());
    draftHtml = draftHtml.replace(/\{\{employee_address\}\}/g, emp.address || 'Surat, Gujarat');
    draftHtml = draftHtml.replace(/\{\{reporting_manager\}\}/g, reportingManagerStr);
    draftHtml = draftHtml.replace(/\{\{shift\}\}/g, shiftStr);
    draftHtml = draftHtml.replace(/\{\{probation\}\}/g, probationStr);
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
    const empResult = await this.prisma.$queryRaw<Array<{ name: string; status: string }>>`
      SELECT name, status FROM employees WHERE emp_id = ${empId}
    `;
    const emp = empResult?.[0];
    if (!emp) {
      throw new NotFoundException(`Employee ${empId} not found`);
    }

    const isExitDoc = ['experience_letter', 'relieving_letter', 'salary_slip'].includes(dto.document_type);
    if (isExitDoc && emp.status === 'Active') {
      throw new BadRequestException(
        `Document "${dto.document_type}" is an exit document and can only be finalized after employee deactivation.`,
      );
    }

    const cleanName = emp.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${dto.document_type}_${cleanName}.doc`;
    const fileUrl = `/api/v1/employees/${empId}/documents/${dto.document_type}/download`;

    await this.prisma.$executeRaw`
      UPDATE employee_documents
      SET draft_content = ${dto.final_content},
          file_name = ${fileName},
          file_url = ${fileUrl},
          mime_type = 'application/msword',
          file_size = ${Buffer.byteLength(dto.final_content, 'utf8')},
          status = 'issued',
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

  async declineDocument(
    empId: number,
    documentType: string,
    reason: string,
    adminId: number,
  ): Promise<EmployeeDocumentItemDto> {
    const docs = await this.getEmployeeDocuments(empId);
    const target = docs.find((d) => d.document_type === documentType);
    if (!target) {
      throw new NotFoundException(`Document ${documentType} not found`);
    }

    await this.prisma.$executeRaw`
      UPDATE employee_documents
      SET status = 'declined',
          updated_at = NOW(),
          updated_by = ${adminId}
      WHERE emp_id = ${empId} AND document_type = ${documentType}
    `;

    // Activity log
    await this.prisma.$executeRaw`
      INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
      VALUES (
        'EMPLOYEE', ${empId}, 'OFFER_DECLINED', 'Offer Letter Marked as Declined',
        jsonb_build_object('reason', ${reason || 'Candidate declined the offer'}, 'document_type', ${documentType}),
        ${adminId}, NOW()
      )
    `;

    // If offer_letter is declined, BFD Section 8: Admin marks employee "Did not join", onboarding stops
    if (documentType === 'offer_letter') {
      await this.prisma.$executeRaw`
        UPDATE candidates
        SET stage = 'rejected', rejection_reason = ${reason || 'Offer declined by candidate'}, updated_at = NOW()
        WHERE converted_to_emp_id = ${empId}
      `.catch(() => {});
    }

    const refreshed = await this.getEmployeeDocuments(empId);
    return refreshed.find((d) => d.document_type === documentType)!;
  }

  async getDocumentForDownload(
    empId: number,
    documentType: string,
    variant: 'signed' | 'issued' = 'signed',
  ): Promise<{ content: string | Buffer; fileName: string; mimeType: string }> {
    const docs = await this.getEmployeeDocuments(empId);
    const doc = docs.find((d) => d.document_type === documentType);
    if (!doc) {
      throw new NotFoundException(`Document ${documentType} not found`);
    }

    // If 'issued' is explicitly requested
    if (variant === 'issued') {
      let issuedHtml = doc.draft_content;
      if (!issuedHtml && ['offer_letter', 'joining_letter', 'nda_signed'].includes(documentType)) {
        try {
          const draft = await this.generateDraft(empId, { document_type: documentType }, 1);
          issuedHtml = draft.draft_content;
          await this.prisma.$executeRaw`
            UPDATE employee_documents
            SET draft_content = ${issuedHtml}
            WHERE emp_id = ${empId} AND document_type = ${documentType}
          `;
        } catch (e) {}
      }

      if (issuedHtml) {
        const docHtml = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset="utf-8">
            <title>${doc.title} (Issued)</title>
            <style>
              body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; padding: 40px; }
              h2 { color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
              table { border-collapse: collapse; width: 100%; margin: 16px 0; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
              th { background-color: #f1f5f9; }
            </style>
          </head>
          <body>
            ${issuedHtml}
          </body>
          </html>
        `;
        return {
          content: docHtml,
          fileName: `issued_${doc.file_name || `${documentType}.doc`}`,
          mimeType: 'application/msword',
        };
      }
    }

    // Default or signed: Check if an uploaded file exists in storage/employee-docs/<empId>/
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

  async getIssuedDocument(
    empId: number,
    documentType: string,
  ): Promise<{ title: string; document_type: string; draft_content: string; issued_at: string | null }> {
    const docs = await this.getEmployeeDocuments(empId);
    const doc = docs.find((d) => d.document_type === documentType);
    if (!doc) {
      throw new NotFoundException(`Document ${documentType} not found`);
    }

    let issuedContent = doc.draft_content;
    if (!issuedContent && ['offer_letter', 'joining_letter', 'nda_signed'].includes(documentType)) {
      try {
        const draft = await this.generateDraft(empId, { document_type: documentType }, 1);
        issuedContent = draft.draft_content;
        await this.prisma.$executeRaw`
          UPDATE employee_documents
          SET draft_content = ${issuedContent}
          WHERE emp_id = ${empId} AND document_type = ${documentType}
        `;
      } catch (e) {}
    }

    if (!issuedContent) {
      throw new NotFoundException(`Issued content for ${documentType} is not available.`);
    }

    return {
      title: doc.title,
      document_type: documentType,
      draft_content: issuedContent,
      issued_at: doc.issued_at || null,
    };
  }

  async getActivationEligibility(empId: number): Promise<EmployeeActivationStatusDto> {
    const empResult = await this.prisma.$queryRaw<Array<any>>`
      SELECT e.emp_id, e.status, e.address, e.emergency_contact_name, e.emergency_contact_number, e.birth_date,
             e.leave_policy_id,
             p.emp_id AS pay_policy_emp_id, p.bank_name, p.account_number, p.pf_applicable, p.ot_eligible
      FROM employees e
      LEFT JOIN employee_pay_policies p ON p.emp_id = e.emp_id
      WHERE e.emp_id = ${empId} AND e.deleted_at IS NULL
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
        is_details_completed: true,
        missing_details: [],
      };
    }

    const docs = await this.getEmployeeDocuments(empId);
    // Find all required documents (excluding ones specifically unticked by admin as not applicable)
    const requiredDocs = docs.filter(
      (d) => d.is_required_for_activation && (d.is_ticked || d.status === 'uploaded' || d.status === 'file_pending'),
    );
    const missingDocs: string[] = [];

    for (const doc of requiredDocs) {
      const isComplete =
        doc.status === 'uploaded' ||
        doc.status === 'final' ||
        doc.status === 'accepted' ||
        doc.status === 'signed' ||
        doc.status === 'issued' ||
        Boolean(doc.file_url);

      if (!isComplete) {
        missingDocs.push(doc.title);
      }
    }

    const totalRequired = requiredDocs.length;
    const completedRequired = totalRequired - missingDocs.length;
    const isDocsComplete = missingDocs.length === 0 && totalRequired > 0;

    // Check if employee master details (BFD Part 5: Personal, Emergency, Pay Policy) have been completed
    const isDetailsCompleted = Boolean(
      emp.pay_policy_emp_id ||
      (emp.emergency_contact_name && emp.address)
    );

    const missingDetails: string[] = [];
    if (!isDetailsCompleted) {
      if (!emp.emergency_contact_name || !emp.address) {
        missingDetails.push('Personal Details (Address, Emergency Contact)');
      }
      if (!emp.pay_policy_emp_id) {
        missingDetails.push('Salary & Policies (PF, OT, Bank Details)');
      }
    }

    // Leave BFD 3.2: a Leave Policy is required before the employee is activated.
    if (!emp.leave_policy_id) {
      missingDetails.push('Leave Policy (Pay & Policies > Leave)');
    }
    const canActivate = isDocsComplete && isDetailsCompleted && Boolean(emp.leave_policy_id);

    return {
      can_activate: canActivate,
      is_already_active: false,
      missing_documents: missingDocs,
      total_required: totalRequired,
      completed_required: completedRequired,
      is_details_completed: isDetailsCompleted && Boolean(emp.leave_policy_id),
      missing_details: missingDetails,
    };
  }

  async activateEmployee(empId: number, adminId: number): Promise<ActivateEmployeeResponseDto> {
    const eligibility = await this.getActivationEligibility(empId);
    if (eligibility.is_already_active) {
      throw new BadRequestException('Employee account is already active.');
    }
    if (!eligibility.can_activate) {
      const reasons: string[] = [];
      if (eligibility.missing_documents.length > 0) {
        reasons.push(`Mandatory documents missing: ${eligibility.missing_documents.join(', ')}`);
      }
      if (!eligibility.is_details_completed) {
        reasons.push(
          eligibility.missing_details?.length
            ? `Please complete: ${(eligibility.missing_details || []).join(', ')}.`
            : 'Employee details (PF, OT, Bank, Emergency Contact) must be filled before activating account.',
        );
      }
      throw new BadRequestException(`Cannot activate account. ${reasons.join(' ')}`);
    }

    const empResult = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, name, email, office_email, personal_email, status, joining_date, dep_id, role_id, reporting_manager
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
    await this.prisma.$executeRaw`
      UPDATE employees
      SET status = 'Active', updated_at = NOW(), updated_by = ${adminId}
      WHERE emp_id = ${empId}
    `;

    // 2. Upsert credentials with must_change_password = true
    const existingCred = await this.prisma.employee_credentials.findFirst({
      where: { emp_id: empId, deleted_at: null },
    });

    if (existingCred) {
      await this.prisma.employee_credentials.update({
        where: { credential_id: existingCred.credential_id },
        data: {
          password_hash: passwordHash,
          must_change_password: true,
          failed_attempts: 0,
          locked_until: null,
          updated_at: new Date(),
          updated_by: adminId,
        },
      });
    } else {
      await this.prisma.employee_credentials.create({
        data: {
          emp_id: empId,
          password_hash: passwordHash,
          must_change_password: true,
          created_by: adminId,
          updated_at: new Date(),
        },
      });
    }

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
    await this.prisma.$executeRaw`
      INSERT INTO auth_events (emp_id, actor_emp_id, event_type, details)
      VALUES (${empId}, ${adminId}, 'credentials_created'::auth_event_type, '{"source":"activation","must_change_password":true}'::jsonb)
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

    if (this.mailPort) {
      try {
        await this.mailPort.sendWelcomeCredentials({
          officeEmail,
          personalEmail: emp.personal_email?.trim().toLowerCase() || undefined,
          employeeName: emp.name,
          temporaryPassword: tempPassword,
          loginUrl: process.env.WEB_ORIGIN || 'http://localhost:5173',
        });
      } catch (mailErr: any) {
        this.logger.warn(`Failed to dispatch activation email to ${officeEmail}: ${mailErr.message}`);
      }
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
      ON CONFLICT (emp_id) WHERE deleted_at IS NULL DO UPDATE SET
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

    if (this.mailPort) {
      try {
        await this.mailPort.sendWelcomeCredentials({
          officeEmail,
          personalEmail: emp.personal_email?.trim().toLowerCase() || undefined,
          employeeName: emp.name,
          temporaryPassword: tempPassword,
          loginUrl: process.env.WEB_ORIGIN || 'http://localhost:5173',
        });
      } catch (mailErr: any) {
        this.logger.warn(`Failed to dispatch resend credentials email to ${officeEmail}: ${mailErr.message}`);
      }
    }

    return {
      success: true,
      message: 'New temporary login credentials generated successfully.',
      emp_id: empId,
      office_email: officeEmail,
      temporary_password: tempPassword,
      must_change_password: true,
    };
  }

  /**
   * BFD Reference Screen 8 Marker 3:
   * Send document request email to candidate listing every ticked-but-pending
   * and required-but-unticked document.
   */
  async sendDocumentRequestEmail(
    empId: number,
    adminId?: number,
    options?: { email?: string; notes?: string }
  ): Promise<{
    success: boolean;
    message: string;
    sent_to: string;
    candidate_name: string;
    pending_count: number;
    pending_documents: DocumentRequestMailItem[];
  }> {
    const employee = await this.prisma.employees.findUnique({
      where: { emp_id: empId },
      select: {
        emp_id: true,
        name: true,
        personal_email: true,
        office_email: true,
        email: true,
        status: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee #${empId} not found`);
    }

    const candidate = await this.prisma.candidates.findFirst({
      where: { converted_to_emp_id: empId },
      select: { candidate_id: true, name: true, email: true },
    });

    const recipientEmail = (
      options?.email ||
      candidate?.email ||
      employee.personal_email ||
      employee.email ||
      employee.office_email ||
      ''
    ).trim();

    if (!recipientEmail) {
      throw new BadRequestException('No email address available to send the document request.');
    }

    const allDocs = await this.getEmployeeDocuments(empId);

    // Rule: Marker 3 - Emails candidate a list of every ticked-but-pending and required-but-unticked document.
    const pendingList: DocumentRequestMailItem[] = [];

    for (const doc of allDocs) {
      // Exclude purely company-given exit/post-employment letters (relieving, experience, salary slips)
      if (
        doc.category === 'given_to_employee' &&
        doc.document_type !== 'offer_letter' &&
        doc.document_type !== 'joining_letter'
      ) {
        continue;
      }

      const hasFile = Boolean(doc.file_url) || doc.status === 'uploaded' || doc.status === 'accepted' || doc.status === 'signed';

      if (doc.is_ticked && !hasFile) {
        pendingList.push({
          title: doc.title,
          category: doc.category === 'agreement' ? 'Agreement' : 'Documentation',
          isRequired: Boolean(doc.is_required_for_activation),
          reason: 'ticked_pending',
        });
      } else if (doc.is_required_for_activation && !doc.is_ticked && !hasFile) {
        pendingList.push({
          title: doc.title,
          category: doc.category === 'agreement' ? 'Agreement' : 'Documentation',
          isRequired: true,
          reason: 'required_unticked',
        });
      }
    }

    if (pendingList.length === 0) {
      return {
        success: true,
        message: 'All requested documents have already been uploaded. No pending documents to request.',
        sent_to: recipientEmail,
        candidate_name: candidate?.name || employee.name,
        pending_count: 0,
        pending_documents: [],
      };
    }

    if (this.mailPort) {
      try {
        await this.mailPort.sendDocumentRequest({
          to: recipientEmail,
          candidateName: candidate?.name || employee.name,
          employeeId: empId,
          pendingDocuments: pendingList,
          customMessage: options?.notes,
        });
      } catch (err: any) {
        this.logger.error(`Failed to dispatch document request email: ${err.message}`);
        throw new BadRequestException(`Failed to send email: ${err.message}`);
      }
    } else {
      this.logger.warn(`MailPort not available. Skipping email delivery to ${recipientEmail}.`);
    }

    // Log in activity_logs
    try {
      await this.prisma.$executeRaw`
        INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
        VALUES (
          'EMPLOYEE', ${empId}, 'DOCUMENT_REQUEST_SENT', 'Document Request Emailed',
          jsonb_build_object(
            'sent_to', ${recipientEmail},
            'pending_count', ${pendingList.length},
            'candidate_name', ${candidate?.name || employee.name},
            'notes', ${options?.notes || null}
          ),
          ${adminId || null}, NOW()
        )
      `;
    } catch (logErr: any) {
      this.logger.warn(`Failed to record activity log for document request: ${logErr.message}`);
    }

    return {
      success: true,
      message: `Document request successfully sent to ${recipientEmail} (${pendingList.length} pending document${pendingList.length > 1 ? 's' : ''}).`,
      sent_to: recipientEmail,
      candidate_name: candidate?.name || employee.name,
      pending_count: pendingList.length,
      pending_documents: pendingList,
    };
  }

}
