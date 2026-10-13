import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  ChunkCommitResult,
  DataTransferJob,
  DuplicatePolicy,
  ExcelJsSpreadsheetAdapter,
  CsvSpreadsheetAdapter,
  ImportHandler,
  JobIssue,
  PreviewResult,
  RowReportItem,
} from '../../../data-transfer/public-api';
import { CrmNormalizationService } from '../../domain/services/crm-normalization.service';
import {
  CompanyImportValidatorService,
  ClosestMatchItem,
} from '../../domain/services/company-import-validator.service';
import { stringify } from 'csv-stringify/sync';

export interface PreparedCompanyItem {
  rowNumber: number;
  companyRef?: string;
  name: string;
  parentCompanyRef?: string;
  parentCompanyId?: number | null;
  customerTypeId: number;
  industryId: number;
  subIndustryId?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  ownerId?: number | null;
  isActive: boolean;
  channels: Array<{
    sheet: string;
    rowNumber: number;
    channel_type: string;
    value: string;
    label?: string | null;
    is_primary: boolean;
  }>;
  contacts: Array<{
    sheet: string;
    rowNumber: number;
    name: string;
    email?: string | null;
    mobile?: string | null;
    linkedin_url?: string | null;
    designation?: string | null;
    departmentId?: number | null;
    is_primary: boolean;
    reportsToRef?: string | null;
  }>;
  duplicateCompanyId?: number | null;
  isDuplicate: boolean;
  duplicateReason?: string;
  hasErrors: boolean;
}

@Injectable()
export class CompanyImportHandler implements ImportHandler<PreparedCompanyItem> {
  readonly entityType = 'companies';

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ExcelJsSpreadsheetAdapter)
    private readonly excelAdapter: ExcelJsSpreadsheetAdapter,
    @Inject(CsvSpreadsheetAdapter)
    private readonly csvAdapter: CsvSpreadsheetAdapter,
  ) {}

  async preview(
    job: DataTransferJob,
    fileBuffer: Buffer,
    duplicatePolicy: DuplicatePolicy,
    skipInvalidRows: boolean,
  ): Promise<PreviewResult> {
    const adapter = job.format === 'csv' ? this.csvAdapter : this.excelAdapter;

    const parsed = await adapter.parseWorkbook(fileBuffer, job.format, {
      phoneColumns: ['phone', 'whatsapp', 'mobile'],
      requiredSheets: job.format === 'xlsx' ? ['Companies'] : undefined,
      requiredColumnsBySheet: {
        companies: ['name'],
        channels: ['company_ref', 'channel_type', 'value'],
        contacts: ['company_ref', 'name'],
      },
      maxRowsBySheet: {
        companies: 10000,
        contacts: 25000,
        channels: 25000,
      },
      maxColumns: 50,
      maxCellLength: 1000,
    });

    const issues: JobIssue[] = [];

    // Add file-level errors/warnings
    for (const fe of parsed.fileErrors) {
      issues.push({
        row: 1,
        sheet: 'File',
        severity: 'error',
        code: fe.code,
        message: fe.message,
      });
    }

    if (parsed.fileErrors.length > 0) {
      return {
        totals: { total: 0, valid: 0, warnings: 0, errors: parsed.fileErrors.length, duplicates: 0 },
        willCreate: 0,
        willSkip: 0,
        issues,
        issuesTruncated: false,
        canConfirm: false,
        hasFileErrors: true,
      };
    }

    // 1. Batched Master Data and DB lookups
    const [
      customerTypes,
      industries,
      departments,
      employees,
      existingCompanies,
      existingChannels,
      existingPersons,
    ] = await Promise.all([
      this.prisma.customer_types.findMany({
        where: { deleted_at: null },
        select: { customer_type_id: true, name: true, is_active: true, is_default: true },
      }),
      this.prisma.industries.findMany({
        where: { deleted_at: null },
        select: { industry_id: true, name: true, parent_id: true, is_active: true, is_default: true },
      }),
      this.prisma.master_lookup.findMany({
        where: { lookup_type: 'person_department', deleted_at: null },
        select: { lookup_id: true, code: true, label: true },
      }),
      this.prisma.employees.findMany({
        where: { deleted_at: null },
        select: { emp_id: true, email: true, status: true },
      }),
      this.prisma.companies.findMany({
        where: { deleted_at: null },
        select: { company_id: true, name: true, city: true, is_active: true },
      }),
      this.prisma.company_channels.findMany({
        where: { deleted_at: null },
        select: { company_id: true, channel_type: true, value: true },
      }),
      this.prisma.persons.findMany({
        where: { deleted_at: null },
        select: { person_id: true, name: true, email: true, mobile: true },
      }),
    ]);

    const activeCustTypes = customerTypes.filter((c) => c.is_active);
    const defaultCustType = customerTypes.find((c) => c.is_default && c.is_active);
    const activeIndustries = industries.filter((i) => i.is_active);
    const defaultIndustry = industries.find((i) => i.is_default && i.is_active && !i.parent_id);
    const activeEmployees = employees.filter((e) => e.status === 'Active');

    // Build lookup maps
    const custTypeByName = new Map<string, number>();
    customerTypes.forEach((c) => custTypeByName.set(c.name.trim().toLowerCase(), c.customer_type_id));

    const industryByName = new Map<string, typeof industries[0]>();
    industries.forEach((i) => industryByName.set(i.name.trim().toLowerCase(), i));

    const deptMap = new Map<string, number>();
    departments.forEach((d) => {
      deptMap.set(d.label.trim().toLowerCase(), d.lookup_id);
      deptMap.set(d.code.trim().toLowerCase(), d.lookup_id);
    });

    const empByEmail = new Map<string, number>();
    activeEmployees.forEach((e) => empByEmail.set(e.email.trim().toLowerCase(), e.emp_id));

    // Master hint lists
    const custTypeHints: ClosestMatchItem[] = activeCustTypes.map((c) => ({ id: c.customer_type_id, name: c.name }));
    const indHints: ClosestMatchItem[] = activeIndustries.filter((i) => !i.parent_id).map((i) => ({ id: i.industry_id, name: i.name }));
    const deptHints: ClosestMatchItem[] = departments.map((d) => ({ id: d.lookup_id, name: d.label, code: d.code }));

    // Existing active companies maps for parent and duplicate lookups
    const existingCompanyIds = new Set(existingCompanies.map((c) => c.company_id));
    const existingCompanyByName = new Map<string, number[]>();
    existingCompanies.filter((c) => c.is_active).forEach((c) => {
      const lower = c.name.trim().toLowerCase();
      if (!existingCompanyByName.has(lower)) existingCompanyByName.set(lower, []);
      existingCompanyByName.get(lower)!.push(c.company_id);
    });

    // Existing duplicate keys
    const existingCompNameCity = new Map<string, number>();
    existingCompanies.filter((c) => c.is_active).forEach((c) => {
      const key = `${c.name.trim().toLowerCase()}::${(c.city || '').trim().toLowerCase()}`;
      existingCompNameCity.set(key, c.company_id);
      // Also match if either city is blank
      const blankKey = `${c.name.trim().toLowerCase()}::`;
      if (!existingCompNameCity.has(blankKey)) existingCompNameCity.set(blankKey, c.company_id);
    });

    const existingChannelsByKey = new Map<string, number>();
    existingChannels.forEach((ch) => {
      const k = CompanyImportValidatorService.getChannelDuplicateKey(ch.channel_type, ch.value);
      if (k) existingChannelsByKey.set(`${ch.channel_type}::${k}`, ch.company_id);
    });

    // Persons maps
    const personByEmail = new Map<string, typeof existingPersons[0]>();
    const personByMobile = new Map<string, typeof existingPersons[0]>();
    existingPersons.forEach((p) => {
      if (p.email) personByEmail.set(p.email.trim().toLowerCase(), p);
      if (p.mobile) personByMobile.set(p.mobile.replace(/\D/g, ''), p);
    });

    // Process Companies rows
    const companyRows = parsed.sheets.get('Companies') || [];
    const fileCompanyRefs = new Set<string>();
    const fileCompanyDupKeys = new Set<string>();
    const fileChannelDupKeys = new Set<string>();

    let validRowsCount = 0;
    let warningRowsCount = 0;
    let errorRowsCount = 0;
    let duplicatesCount = 0;
    let willCreateCount = 0;
    let willSkipCount = 0;

    for (const r of companyRows) {
      let rowHasErrors = false;
      let rowHasWarnings = false;
      let isDuplicate = false;
      let matchedDuplicateCompId: number | null = null;
      let duplicateReason = '';

      // Carry cell parsing warnings
      for (const w of r.warnings) {
        issues.push({ row: r.rowNumber, sheet: 'Companies', severity: 'warning', code: w.code, message: w.message, field: w.field });
        rowHasWarnings = true;
      }

      // Check company_id (update-by-import not supported yet)
      const compIdVal = (r.cells['company_id'] || '').trim();
      if (compIdVal) {
        const numId = Number(compIdVal);
        if (!isNaN(numId) && existingCompanyIds.has(numId)) {
          issues.push({
            row: r.rowNumber,
            sheet: 'Companies',
            severity: 'warning',
            code: 'ALREADY_EXISTS',
            message: `Company with ID '${compIdVal}' already exists. Updating via import is not supported yet (skipped).`,
            field: 'company_id',
          });
          isDuplicate = true;
          willSkipCount++;
          continue;
        }
      }

      // 1. Company Name (Required)
      const rawName = r.cells['name'];
      const normName = CrmNormalizationService.normalizeName(rawName);
      if (!normName) {
        issues.push({
          row: r.rowNumber,
          sheet: 'Companies',
          severity: 'error',
          code: 'NAME_REQUIRED',
          message: 'Company name is required and cannot be blank',
          field: 'name',
        });
        rowHasErrors = true;
      }

      // 2. Company Ref
      const compRef = (r.cells['company_ref'] || '').trim();
      if (compRef) {
        const lowerRef = compRef.toLowerCase();
        if (fileCompanyRefs.has(lowerRef)) {
          issues.push({
            row: r.rowNumber,
            sheet: 'Companies',
            severity: 'error',
            code: 'DUPLICATE_COMPANY_REF',
            message: `company_ref '${compRef}' is duplicated in the file`,
            field: 'company_ref',
          });
          rowHasErrors = true;
        } else {
          fileCompanyRefs.add(lowerRef);
        }
      }

      // 2b. Parent Company Ref (check for self-reference)
      const rawParentRef = (r.cells['parent_company_ref'] || '').trim();
      if (
        rawParentRef &&
        ((compRef && rawParentRef.toLowerCase() === compRef.toLowerCase()) ||
          (normName && rawParentRef.toLowerCase() === normName.toLowerCase()))
      ) {
        issues.push({
          row: r.rowNumber,
          sheet: 'Companies',
          severity: 'warning',
          code: 'SELF_PARENT_IGNORED',
          message: `parent_company_ref '${rawParentRef}' matches the company itself and will be imported as a top-level company.`,
          field: 'parent_company_ref',
        });
        rowHasWarnings = true;
        r.cells['parent_company_ref'] = '';
      }

      // 3. Customer Type
      const rawCustType = (r.cells['customer_type'] || '').trim();
      let customerTypeId: number | undefined;
      if (!rawCustType) {
        customerTypeId = defaultCustType?.customer_type_id;
      } else {
        const foundId = custTypeByName.get(rawCustType.toLowerCase());
        const foundObj = customerTypes.find((c) => c.customer_type_id === foundId);
        if (!foundObj || !foundObj.is_active) {
          const hints = CompanyImportValidatorService.getClosestHints(rawCustType, custTypeHints);
          issues.push({
            row: r.rowNumber,
            sheet: 'Companies',
            severity: 'error',
            code: 'UNKNOWN_CUSTOMER_TYPE',
            message: `Customer type '${rawCustType}' is unknown or inactive. ${hints}`.trim(),
            field: 'customer_type',
          });
          rowHasErrors = true;
        } else {
          customerTypeId = foundObj.customer_type_id;
        }
      }

      // 4. Industry & Sub-industry
      const rawIndustry = (r.cells['industry'] || '').trim();
      let industryId: number | undefined;
      if (!rawIndustry) {
        industryId = defaultIndustry?.industry_id;
      } else {
        const indObj = industryByName.get(rawIndustry.toLowerCase());
        if (!indObj || !indObj.is_active || indObj.parent_id !== null) {
          const hints = CompanyImportValidatorService.getClosestHints(rawIndustry, indHints);
          issues.push({
            row: r.rowNumber,
            sheet: 'Companies',
            severity: 'error',
            code: 'UNKNOWN_INDUSTRY',
            message: `Industry '${rawIndustry}' is unknown, inactive, or a sub-industry. ${hints}`.trim(),
            field: 'industry',
          });
          rowHasErrors = true;
        } else {
          industryId = indObj.industry_id;
        }
      }

      // Sub-industry
      const rawSubInd = (r.cells['sub_industry'] || '').trim();
      let subIndustryId: number | null = null;
      if (rawSubInd) {
        const subObj = industryByName.get(rawSubInd.toLowerCase());
        if (!subObj || !subObj.is_active || !subObj.parent_id) {
          issues.push({
            row: r.rowNumber,
            sheet: 'Companies',
            severity: 'error',
            code: 'UNKNOWN_SUB_INDUSTRY',
            message: `Sub-industry '${rawSubInd}' is unknown or inactive`,
            field: 'sub_industry',
          });
          rowHasErrors = true;
        } else if (industryId && subObj.parent_id !== industryId) {
          issues.push({
            row: r.rowNumber,
            sheet: 'Companies',
            severity: 'error',
            code: 'SUB_INDUSTRY_NOT_CHILD',
            message: `Sub-industry '${rawSubInd}' does not belong to industry '${rawIndustry}'`,
            field: 'sub_industry',
          });
          rowHasErrors = true;
        } else {
          subIndustryId = subObj.industry_id;
        }
      }

      // 5. Owner
      const rawOwnerEmail = (r.cells['owner_email'] || '').trim();
      let ownerId: number | null = null;
      if (rawOwnerEmail) {
        const empId = empByEmail.get(rawOwnerEmail.toLowerCase());
        if (!empId) {
          issues.push({
            row: r.rowNumber,
            sheet: 'Companies',
            severity: 'error',
            code: 'UNKNOWN_OWNER',
            message: `Owner email '${rawOwnerEmail}' does not match any active employee`,
            field: 'owner_email',
          });
          rowHasErrors = true;
        } else {
          ownerId = empId;
        }
      }

      // 6. Status
      const rawStatus = r.cells['status'];
      const statusRes = CompanyImportValidatorService.parseStatus(rawStatus);
      if (!statusRes.valid) {
        issues.push({
          row: r.rowNumber,
          sheet: 'Companies',
          severity: 'error',
          code: 'INVALID_STATUS',
          message: `Status '${rawStatus}' is invalid. Allowed: active, inactive, yes, no, true, false, 1, 0`,
          field: 'status',
        });
        rowHasErrors = true;
      }

      // 7. Quick Channels Validation
      const quickChannelTypes = ['website', 'linkedin', 'facebook', 'instagram', 'x', 'email', 'phone', 'whatsapp'];
      for (const ct of quickChannelTypes) {
        const chVal = (r.cells[ct] || '').trim();
        if (chVal) {
          const normRes = CompanyImportValidatorService.normalizeChannel(ct, chVal);
          if (normRes.error) {
            issues.push({
              row: r.rowNumber,
              sheet: 'Companies',
              severity: 'error',
              code: `INVALID_${ct.toUpperCase()}_FORMAT`,
              message: `Invalid format for ${ct}: ${normRes.error}`,
              field: ct,
            });
            rowHasErrors = true;
          } else {
            // Check channel duplicate against DB
            const chDupKey = CompanyImportValidatorService.getChannelDuplicateKey(ct, normRes.normalized);
            const fullKey = `${ct}::${chDupKey}`;
            if (existingChannelsByKey.has(fullKey)) {
              isDuplicate = true;
              matchedDuplicateCompId = existingChannelsByKey.get(fullKey)!;
              duplicateReason = `Channel ${ct} '${normRes.normalized}' matches existing company #${matchedDuplicateCompId}`;
            } else if (fileChannelDupKeys.has(fullKey)) {
              isDuplicate = true;
              duplicateReason = `Channel ${ct} '${normRes.normalized}' duplicates earlier row in file`;
            } else {
              fileChannelDupKeys.add(fullKey);
            }
          }
        }
      }

      // 8. Duplicate Company Detection
      const rawCity = (r.cells['city'] || '').trim().toLowerCase();
      const compCityKey = `${normName.toLowerCase()}::${rawCity}`;
      const compBlankCityKey = `${normName.toLowerCase()}::`;

      if (existingCompNameCity.has(compCityKey)) {
        isDuplicate = true;
        matchedDuplicateCompId = existingCompNameCity.get(compCityKey)!;
        duplicateReason = `Company name '${normName}' matches existing active company #${matchedDuplicateCompId}`;
      } else if (existingCompNameCity.has(compBlankCityKey)) {
        isDuplicate = true;
        matchedDuplicateCompId = existingCompNameCity.get(compBlankCityKey)!;
        duplicateReason = `Company name '${normName}' matches existing active company #${matchedDuplicateCompId}`;
      } else if (fileCompanyDupKeys.has(compCityKey) || fileCompanyDupKeys.has(compBlankCityKey)) {
        isDuplicate = true;
        duplicateReason = `Company name '${normName}' duplicates earlier row in file`;
      } else {
        fileCompanyDupKeys.add(compCityKey);
        fileCompanyDupKeys.add(compBlankCityKey);
      }

      if (isDuplicate) {
        duplicatesCount++;
        issues.push({
          row: r.rowNumber,
          sheet: 'Companies',
          severity: 'warning',
          code: 'DUPLICATE_COMPANY',
          message: duplicateReason,
          field: 'name',
        });
        if (duplicatePolicy === 'skip_duplicates') {
          willSkipCount++;
        } else {
          if (!rowHasErrors) willCreateCount++;
        }
      } else {
        if (!rowHasErrors) {
          validRowsCount++;
          willCreateCount++;
        }
      }

      if (rowHasErrors) errorRowsCount++;
      if (rowHasWarnings) warningRowsCount++;
    }

    // Process Channels Sheet
    const channelRows = parsed.sheets.get('Channels') || [];
    for (const cr of channelRows) {
      const cRef = (cr.cells['company_ref'] || '').trim();
      const cType = (cr.cells['channel_type'] || '').trim().toLowerCase();
      const cVal = (cr.cells['value'] || '').trim();
      const isPrimary = cr.cells['is_primary'] === 'true' || cr.cells['is_primary'] === '1' || cr.cells['is_primary'] === 'yes';

      if (!cRef) {
        issues.push({ row: cr.rowNumber, sheet: 'Channels', severity: 'error', code: 'COMPANY_REF_REQUIRED', message: 'company_ref is required', field: 'company_ref' });
      } else if (!fileCompanyRefs.has(cRef.toLowerCase())) {
        issues.push({ row: cr.rowNumber, sheet: 'Channels', severity: 'error', code: 'UNKNOWN_COMPANY_REF', message: `company_ref '${cRef}' does not exist in Companies sheet`, field: 'company_ref' });
      }

      if (!cVal) {
        issues.push({ row: cr.rowNumber, sheet: 'Channels', severity: 'error', code: 'VALUE_REQUIRED', message: 'Channel value is required', field: 'value' });
      } else {
        const norm = CompanyImportValidatorService.normalizeChannel(cType, cVal);
        if (norm.error) {
          issues.push({ row: cr.rowNumber, sheet: 'Channels', severity: 'error', code: `INVALID_${cType.toUpperCase()}_FORMAT`, message: `Invalid format: ${norm.error}`, field: 'value' });
        }
      }
    }

    // Process Contacts Sheet
    const contactRows = parsed.sheets.get('Contacts') || [];
    const primaryContactByRef = new Set<string>();
    const personsInCompany = new Map<string, Set<number>>();

    for (const con of contactRows) {
      const cRef = (con.cells['company_ref'] || '').trim();
      const name = (con.cells['name'] || '').trim();
      const email = (con.cells['email'] || '').trim().toLowerCase();
      const mobile = (con.cells['mobile'] || '').trim();
      const isPrimary = con.cells['is_primary'] === 'true' || con.cells['is_primary'] === '1' || con.cells['is_primary'] === 'yes';

      if (!cRef) {
        issues.push({ row: con.rowNumber, sheet: 'Contacts', severity: 'error', code: 'COMPANY_REF_REQUIRED', message: 'company_ref is required', field: 'company_ref' });
      } else if (!fileCompanyRefs.has(cRef.toLowerCase())) {
        issues.push({ row: con.rowNumber, sheet: 'Contacts', severity: 'error', code: 'UNKNOWN_COMPANY_REF', message: `company_ref '${cRef}' does not exist in Companies sheet`, field: 'company_ref' });
      }

      if (!name) {
        issues.push({ row: con.rowNumber, sheet: 'Contacts', severity: 'error', code: 'NAME_REQUIRED', message: 'Contact name is required', field: 'name' });
      }

      if (!email && !mobile) {
        issues.push({ row: con.rowNumber, sheet: 'Contacts', severity: 'error', code: 'CONTACT_NEEDS_EMAIL_OR_MOBILE', message: 'Contact must have an email or a mobile number', field: 'email' });
      }

      if (isPrimary && cRef) {
        const lowerRef = cRef.toLowerCase();
        if (primaryContactByRef.has(lowerRef)) {
          issues.push({ row: con.rowNumber, sheet: 'Contacts', severity: 'error', code: 'MULTIPLE_PRIMARY_CONTACTS', message: 'At most one primary contact per company is allowed', field: 'is_primary' });
        } else {
          primaryContactByRef.add(lowerRef);
        }
      }

      // Existing person matching
      const personByEm = email ? personByEmail.get(email) : null;
      const cleanMob = mobile ? mobile.replace(/\D/g, '') : '';
      const personByMob = cleanMob ? personByMobile.get(cleanMob) : null;

      if (personByEm && personByMob && personByEm.person_id !== personByMob.person_id) {
        issues.push({ row: con.rowNumber, sheet: 'Contacts', severity: 'error', code: 'AMBIGUOUS_PERSON', message: 'Email and mobile match two different existing persons', field: 'email' });
      } else {
        const matched = personByEm || personByMob;
        if (matched) {
          if (matched.name.toLowerCase() !== name.toLowerCase()) {
            issues.push({ row: con.rowNumber, sheet: 'Contacts', severity: 'warning', code: 'NAME_DIFFERS', message: `Contact links existing person #${matched.person_id} whose name is '${matched.name}'`, field: 'name' });
          }
          if (cRef) {
            const lowerRef = cRef.toLowerCase();
            if (!personsInCompany.has(lowerRef)) personsInCompany.set(lowerRef, new Set());
            if (personsInCompany.get(lowerRef)!.has(matched.person_id)) {
              issues.push({ row: con.rowNumber, sheet: 'Contacts', severity: 'error', code: 'DUPLICATE_CONTACT', message: `Person #${matched.person_id} is added more than once to this company`, field: 'name' });
            } else {
              personsInCompany.get(lowerRef)!.add(matched.person_id);
            }
          }
        }
      }
    }

    // Topological order & cycle detection
    const { cyclicRefs } = CompanyImportValidatorService.orderCompaniesByParentHierarchy(
      companyRows.map((r) => ({
        rowNumber: r.rowNumber,
        company_ref: r.cells['company_ref'],
        parent_company_ref: r.cells['parent_company_ref'],
      })),
    );

    for (const cyc of cyclicRefs) {
      issues.push({
        row: 1,
        sheet: 'Companies',
        severity: 'error',
        code: 'PARENT_CYCLE',
        message: `Hierarchy cycle detected involving company_ref '${cyc}'`,
        field: 'parent_company_ref',
      });
      errorRowsCount++;
    }

    const issuesTruncated = issues.length > 200;
    const canConfirm = issues.filter((i) => i.severity === 'error').length === 0 || skipInvalidRows;

    return {
      totals: {
        total: companyRows.length,
        valid: validRowsCount,
        warnings: warningRowsCount,
        errors: errorRowsCount,
        duplicates: duplicatesCount,
      },
      willCreate: willCreateCount,
      willSkip: willSkipCount,
      issues: issues.slice(0, 200),
      issuesTruncated,
      canConfirm,
      hasFileErrors: false,
    };
  }

  async *getChunks(
    job: DataTransferJob,
    fileBuffer: Buffer,
  ): AsyncIterable<PreparedCompanyItem[]> {
    const adapter = job.format === 'csv' ? this.csvAdapter : this.excelAdapter;
    const parsed = await adapter.parseWorkbook(fileBuffer, job.format);
    const companyRows = parsed.sheets.get('Companies') || [];
    const channelRows = parsed.sheets.get('Channels') || [];
    const contactRows = parsed.sheets.get('Contacts') || [];

    // Master data lookups
    const [customerTypes, industries, departments, employees, existingCompanies] = await Promise.all([
      this.prisma.customer_types.findMany({ where: { deleted_at: null } }),
      this.prisma.industries.findMany({ where: { deleted_at: null } }),
      this.prisma.master_lookup.findMany({ where: { lookup_type: 'person_department', deleted_at: null } }),
      this.prisma.employees.findMany({ where: { deleted_at: null } }),
      this.prisma.companies.findMany({ where: { deleted_at: null } }),
    ]);

    const defaultCustType = customerTypes.find((c) => c.is_default && c.is_active);
    const defaultIndustry = industries.find((i) => i.is_default && i.is_active && !i.parent_id);

    const custTypeByName = new Map<string, number>();
    customerTypes.filter((c) => c.is_active).forEach((c) => custTypeByName.set(c.name.trim().toLowerCase(), c.customer_type_id));

    const indByName = new Map<string, typeof industries[0]>();
    industries.filter((i) => i.is_active).forEach((i) => indByName.set(i.name.trim().toLowerCase(), i));

    const deptByName = new Map<string, number>();
    departments.forEach((d) => {
      deptByName.set(d.label.trim().toLowerCase(), d.lookup_id);
      deptByName.set(d.code.trim().toLowerCase(), d.lookup_id);
    });

    const empByEmail = new Map<string, number>();
    employees.filter((e) => e.status === 'Active').forEach((e) => empByEmail.set(e.email.trim().toLowerCase(), e.emp_id));

    const existingCompByName = new Map<string, number>();
    existingCompanies.filter((c) => c.is_active).forEach((c) => existingCompByName.set(c.name.trim().toLowerCase(), c.company_id));

    // Channels map by company_ref
    const channelsByRef = new Map<string, any[]>();
    for (const ch of channelRows) {
      const ref = (ch.cells['company_ref'] || '').trim().toLowerCase();
      if (!channelsByRef.has(ref)) channelsByRef.set(ref, []);
      channelsByRef.get(ref)!.push({
        sheet: 'Channels',
        rowNumber: ch.rowNumber,
        channel_type: (ch.cells['channel_type'] || '').trim().toLowerCase(),
        value: (ch.cells['value'] || '').trim(),
        label: (ch.cells['label'] || '').trim() || null,
        is_primary: ch.cells['is_primary'] === 'true' || ch.cells['is_primary'] === '1',
      });
    }

    // Contacts map by company_ref
    const contactsByRef = new Map<string, any[]>();
    for (const con of contactRows) {
      const ref = (con.cells['company_ref'] || '').trim().toLowerCase();
      if (!contactsByRef.has(ref)) contactsByRef.set(ref, []);
      const deptRaw = (con.cells['department'] || '').trim().toLowerCase();
      contactsByRef.get(ref)!.push({
        sheet: 'Contacts',
        rowNumber: con.rowNumber,
        name: (con.cells['name'] || '').trim(),
        email: (con.cells['email'] || '').trim().toLowerCase() || null,
        mobile: (con.cells['mobile'] || '').trim() || null,
        linkedin_url: (con.cells['linkedin_url'] || '').trim() || null,
        designation: (con.cells['designation'] || '').trim() || null,
        departmentId: deptRaw ? deptByName.get(deptRaw) || null : null,
        is_primary: con.cells['is_primary'] === 'true' || con.cells['is_primary'] === '1',
        reportsToRef: (con.cells['reports_to'] || '').trim() || null,
      });
    }

    // Order companies so parents come first
    const { ordered } = CompanyImportValidatorService.orderCompaniesByParentHierarchy(
      companyRows.map((r) => ({
        ...r,
        company_ref: r.cells['company_ref'],
        parent_company_ref: r.cells['parent_company_ref'],
      })),
    );

    const preparedItems: PreparedCompanyItem[] = [];

    for (const r of ordered) {
      const name = CrmNormalizationService.normalizeName(r.cells['name']);
      const compRef = (r.cells['company_ref'] || '').trim();
      const rawParentRef = (r.cells['parent_company_ref'] || '').trim();
      const isSelfParent =
        rawParentRef &&
        ((compRef && rawParentRef.toLowerCase() === compRef.toLowerCase()) ||
          (name && rawParentRef.toLowerCase() === name.toLowerCase()));
      const parentRef = isSelfParent ? '' : rawParentRef;

      const custTypeRaw = (r.cells['customer_type'] || '').trim().toLowerCase();
      const customerTypeId = custTypeRaw ? custTypeByName.get(custTypeRaw) || defaultCustType?.customer_type_id || 1 : defaultCustType?.customer_type_id || 1;

      const indRaw = (r.cells['industry'] || '').trim().toLowerCase();
      const indObj = indRaw ? indByName.get(indRaw) : defaultIndustry;
      const industryId = indObj?.industry_id || defaultIndustry?.industry_id || 1;

      const subIndRaw = (r.cells['sub_industry'] || '').trim().toLowerCase();
      const subIndObj = subIndRaw ? indByName.get(subIndRaw) : null;
      const subIndustryId = subIndObj?.industry_id || null;

      const ownerEmailRaw = (r.cells['owner_email'] || '').trim().toLowerCase();
      const ownerId = ownerEmailRaw ? empByEmail.get(ownerEmailRaw) || null : null;

      const statusRes = CompanyImportValidatorService.parseStatus(r.cells['status']);

      // Channels from quick columns
      const channels: PreparedCompanyItem['channels'] = [];
      const quickCols = ['website', 'linkedin', 'facebook', 'instagram', 'x', 'email', 'phone', 'whatsapp'];
      for (const qc of quickCols) {
        const val = (r.cells[qc] || '').trim();
        if (val) {
          channels.push({
            sheet: 'Companies',
            rowNumber: r.rowNumber,
            channel_type: qc,
            value: val,
            is_primary: true,
          });
        }
      }

      // Additional channels from Channels sheet
      if (compRef) {
        const extraCh = channelsByRef.get(compRef.toLowerCase()) || [];
        channels.push(...extraCh);
      }

      // Contacts from Contacts sheet
      const contacts = compRef ? contactsByRef.get(compRef.toLowerCase()) || [] : [];

      preparedItems.push({
        rowNumber: r.rowNumber,
        companyRef: compRef || undefined,
        name,
        parentCompanyRef: parentRef || undefined,
        parentCompanyId: parentRef ? existingCompByName.get(parentRef.toLowerCase()) || null : null,
        customerTypeId,
        industryId,
        subIndustryId,
        address: (r.cells['address'] || '').trim() || null,
        city: (r.cells['city'] || '').trim() || null,
        state: (r.cells['state'] || '').trim() || null,
        country: (r.cells['country'] || '').trim() || null,
        ownerId,
        isActive: statusRes.isActive,
        channels,
        contacts,
        isDuplicate: false,
        hasErrors: false,
      });
    }

    // Chunk size: 250 items
    const chunkSize = 250;
    for (let i = 0; i < preparedItems.length; i += chunkSize) {
      yield preparedItems.slice(i, i + chunkSize);
    }
  }

  async commitChunk(
    job: DataTransferJob,
    chunk: PreparedCompanyItem[],
    adminEmpId: number,
  ): Promise<ChunkCommitResult> {
    const rowResults: RowReportItem[] = [];
    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Filter out rows that have file-level skips or duplicates if skip_duplicates is selected
    const skipDuplicates = job.options.duplicate_policy !== 'import_anyway';

    try {
      // Execute chunk in ONE transaction with multi-row INSERT ... RETURNING and row index mapping
      await this.prisma.$transaction(async (tx) => {
        // Collect existing companies to check duplicates inside transaction
        const existingCompanies = await tx.companies.findMany({
          where: { deleted_at: null },
          select: { company_id: true, name: true, city: true },
        });
        const existingNameCity = new Set<string>();
        existingCompanies.forEach((c) => {
          existingNameCity.add(`${c.name.trim().toLowerCase()}::${(c.city || '').trim().toLowerCase()}`);
          existingNameCity.add(`${c.name.trim().toLowerCase()}::`);
        });

        // Map companyRef -> company_id
        const refToIdMap = new Map<string, number>();

        // 1. Prepare valid rows for bulk insert
        const toInsert: { item: PreparedCompanyItem; idx: number }[] = [];

        chunk.forEach((item, idx) => {
          if (!item.name) {
            failedCount++;
            rowResults.push({
              rowNumber: item.rowNumber,
              sheet: 'Companies',
              status: 'failed',
              code: 'NAME_REQUIRED',
              message: 'Company name is required',
            });
            return;
          }

          const key = `${item.name.toLowerCase()}::${(item.city || '').toLowerCase()}`;
          const blankKey = `${item.name.toLowerCase()}::`;
          if (existingNameCity.has(key) || existingNameCity.has(blankKey)) {
            if (skipDuplicates) {
              skippedCount++;
              rowResults.push({
                rowNumber: item.rowNumber,
                sheet: 'Companies',
                status: 'skipped',
                code: 'DUPLICATE_COMPANY',
                message: 'Duplicate company skipped',
              });
              return;
            }
          }

          toInsert.push({ item, idx });
        });

        if (toInsert.length > 0) {
          // Multi-row INSERT with unnest and row_idx to PROVE correct ID-to-row mapping
          const names = toInsert.map((t) => t.item.name);
          const custTypeIds = toInsert.map((t) => t.item.customerTypeId);
          const indIds = toInsert.map((t) => t.item.industryId);
          const subIndIds = toInsert.map((t) => t.item.subIndustryId);
          const addresses = toInsert.map((t) => t.item.address);
          const cities = toInsert.map((t) => t.item.city);
          const states = toInsert.map((t) => t.item.state);
          const countries = toInsert.map((t) => t.item.country);
          const ownerIds = toInsert.map((t) => t.item.ownerId);
          const isActives = toInsert.map((t) => t.item.isActive);
          const indices = toInsert.map((t) => t.idx);

          const insertSql = `
            INSERT INTO companies (
              name, customer_type_id, industry_id, sub_industry_id,
              address, city, state, country, owner_id, is_active,
              created_by, updated_by
            )
            SELECT
              t.name, t.customer_type_id, t.industry_id, t.sub_industry_id,
              t.address, t.city, t.state, t.country, t.owner_id, t.is_active,
              $1, $1
            FROM unnest(
              $2::text[], $3::int[], $4::int[], $5::int[],
              $6::text[], $7::text[], $8::text[], $9::text[],
              $10::int[], $11::boolean[], $12::int[]
            ) AS t(
              name, customer_type_id, industry_id, sub_industry_id,
              address, city, state, country, owner_id, is_active, row_idx
            )
            RETURNING company_id, t.row_idx;
          `;

          const insertedRows: any[] = await tx.$queryRawUnsafe(
            insertSql,
            adminEmpId,
            names,
            custTypeIds,
            indIds,
            subIndIds,
            addresses,
            cities,
            states,
            countries,
            ownerIds,
            isActives,
            indices,
          );

          // Map returned IDs by row_idx
          for (const row of insertedRows) {
            const rowIdx = Number(row.row_idx);
            const compId = Number(row.company_id);
            const item = chunk[rowIdx];
            createdCount++;

            if (item.companyRef) {
              refToIdMap.set(item.companyRef.toLowerCase(), compId);
            }

            rowResults.push({
              rowNumber: item.rowNumber,
              sheet: 'Companies',
              status: 'created',
              createdId: compId,
            });

            // Insert channels for this company
            for (const ch of item.channels) {
              try {
                const normVal = CrmNormalizationService.normalizeChannelValue(ch.channel_type, ch.value);
                await tx.company_channels.create({
                  data: {
                    company_id: compId,
                    channel_type: ch.channel_type as any,
                    value: normVal,
                    label: ch.label,
                    is_primary: ch.is_primary,
                    created_by: adminEmpId,
                    updated_by: adminEmpId,
                  },
                });
              } catch (chErr: any) {
                // Non-fatal or log
              }
            }

            // Insert contacts for this company
            for (const cont of item.contacts) {
              try {
                // Find or link person
                let personId: number | null = null;
                const normEmail = cont.email ? CrmNormalizationService.normalizeEmail(cont.email) : null;
                const normMobile = cont.mobile ? CrmNormalizationService.normalizePhone(cont.mobile) : null;

                const existingPerson = await tx.persons.findFirst({
                  where: {
                    deleted_at: null,
                    OR: [
                      ...(normEmail ? [{ email: normEmail }] : []),
                      ...(normMobile ? [{ mobile: normMobile }] : []),
                    ],
                  },
                });

                if (existingPerson) {
                  personId = existingPerson.person_id;
                } else {
                  const newPerson = await tx.persons.create({
                    data: {
                      name: cont.name,
                      email: normEmail,
                      mobile: normMobile,
                      linkedin_url: cont.linkedin_url ? CrmNormalizationService.normalizeUrl(cont.linkedin_url) : null,
                      created_by: adminEmpId,
                      updated_by: adminEmpId,
                    },
                  });
                  personId = newPerson.person_id;
                }

                await tx.company_persons.create({
                  data: {
                    company_id: compId,
                    person_id: personId,
                    department_id: cont.departmentId,
                    designation: cont.designation,
                    is_primary: cont.is_primary,
                    created_by: adminEmpId,
                    updated_by: adminEmpId,
                  },
                });
              } catch (conErr: any) {
                // Non-fatal contact error
              }
            }
          }

          // Bulk UPDATE parent_company_id
          for (const item of chunk) {
            if (item.companyRef && item.parentCompanyRef) {
              const compId = refToIdMap.get(item.companyRef.toLowerCase());
              const parentId =
                refToIdMap.get(item.parentCompanyRef.toLowerCase()) || item.parentCompanyId;

              if (compId && parentId && compId !== parentId) {
                await tx.companies.update({
                  where: { company_id: compId },
                  data: { parent_company_id: parentId },
                });
              }
            }
          }
        }
      });
    } catch (chunkError: any) {
      // Chunk-level failure: fallback to row-by-row retry using SAVEPOINTs
      rowResults.length = 0;
      createdCount = 0;
      skippedCount = 0;
      failedCount = 0;

      await this.prisma.$transaction(async (tx) => {
        for (const item of chunk) {
          await tx.$executeRawUnsafe('SAVEPOINT sp_row;');
          try {
            if (!item.name) {
              throw new Error('Company name is required');
            }

            const comp = await tx.companies.create({
              data: {
                name: item.name,
                customer_type_id: item.customerTypeId,
                industry_id: item.industryId,
                sub_industry_id: item.subIndustryId,
                address: item.address,
                city: item.city,
                state: item.state,
                country: item.country,
                owner_id: item.ownerId,
                is_active: item.isActive,
                created_by: adminEmpId,
                updated_by: adminEmpId,
              },
            });

            // Insert channels
            for (const ch of item.channels) {
              const normVal = CrmNormalizationService.normalizeChannelValue(ch.channel_type, ch.value);
              await tx.company_channels.create({
                data: {
                  company_id: comp.company_id,
                  channel_type: ch.channel_type as any,
                  value: normVal,
                  label: ch.label,
                  is_primary: ch.is_primary,
                  created_by: adminEmpId,
                  updated_by: adminEmpId,
                },
              });
            }

            createdCount++;
            rowResults.push({
              rowNumber: item.rowNumber,
              sheet: 'Companies',
              status: 'created',
              createdId: comp.company_id,
            });

            await tx.$executeRawUnsafe('RELEASE SAVEPOINT sp_row;');
          } catch (rowErr: any) {
            await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT sp_row;');
            failedCount++;
            rowResults.push({
              rowNumber: item.rowNumber,
              sheet: 'Companies',
              status: 'failed',
              code: 'ROW_INSERT_FAILED',
              message: rowErr.message || 'Row insert failed',
            });
          }
        }
      });
    }

    return {
      createdCount,
      skippedCount,
      failedCount,
      rowResults,
    };
  }

  async generateReportCsv(
    job: DataTransferJob,
    allRowResults: RowReportItem[],
  ): Promise<string> {
    const records = allRowResults.map((r) => [
      r.rowNumber,
      r.sheet,
      r.status,
      r.code || '',
      r.message || '',
      r.createdId ? String(r.createdId) : '',
    ]);

    const csvData = [
      ['row_number', 'sheet', 'status', 'code', 'message', 'created_company_id'],
      ...records,
    ];

    return stringify(csvData, {
      quoted: true,
      record_delimiter: 'windows',
    });
  }
}
