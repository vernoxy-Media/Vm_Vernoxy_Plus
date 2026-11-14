import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CreateSoftwareLicenseDto,
  UpdateSoftwareLicenseDto,
  RenewLicenseDto,
  AssignLicenseDto,
  RevokeLicenseDto,
  DiscontinueLicenseDto,
  QuerySoftwareLicenseDto,
  BulkRevokeLicenseDto,
  AddSeatsDto,
  CorrectTermDto,
} from '../../presentation/dto/license.dto';
import { LicenseNotifierService } from './license-notifier.service';
import { LicenseSettingsService } from './license-settings.service';
import {
  ALLOWED_MIME,
  BILLING_CYCLES,
  LICENSE_TYPES,
  MAX_COST,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_SEATS,
  daysBetween,
  fmtDate,
  hasTwoDecimalsAtMost,
  mustBeFree,
  needsBillingCycle,
  needsExpiry,
  seatsCounted,
  termCycleMismatch,
  todayStr,
  yearlyCost,
} from '../../domain/license-rules';

/** A field error the web shows next to the field (BFD 4 Part 4: "Stops"). */
function bad(field: string, message: string): never {
  throw new BadRequestException({ message, field });
}

/** Date-only column to 'YYYY-MM-DD'. */
function toDateStr(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
}

function normalizeLicenseType(type: string): string {
  if (!type) return 'Subscription · Per User';
  const t = type.trim();
  if (t === 'Subscription') return 'Subscription · Per User';
  if (t === 'Subscription - Per User') return 'Subscription · Per User';
  if (t === 'Subscription - Organisation' || t === 'Subscription - Organization') return 'Subscription · Organisation';
  if (t === 'Perpetual') return 'Perpetual · Per User';
  if (t === 'Perpetual - Per User') return 'Perpetual · Per User';
  if (t === 'Perpetual - Organisation' || t === 'Perpetual - Organization') return 'Perpetual · Organisation';
  if (t === 'Free/Open-Source' || t === 'Free' || t === 'Open Source') return 'Free / Open Source';
  if (t === 'Floating/Shared') return 'Subscription · Organisation';
  if (t === 'Usage-Based') return 'Subscription · Per User';
  return t;
}

function normalizeBillingCycle(cycle?: string | null): string | null {
  if (!cycle) return null;
  const c = cycle.trim();
  if (c === 'Annual') return 'Yearly';
  if (c === 'Half-Yearly') return 'Quarterly';
  if (c === 'Biennial') return 'Multi-year';
  if (c === 'Custom' || c === 'None') return 'One-time';
  return c;
}

@Injectable()
export class LicenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: LicenseSettingsService,
    private readonly notifier: LicenseNotifierService,
  ) {}

  // ---------------------------------------------------------------------------
  // HELPER: Generate SW-XXXX code
  // ---------------------------------------------------------------------------
  private async generateSoftwareCode(): Promise<string> {
    const lastSoftware = await this.prisma.software_licenses.findFirst({
      orderBy: { software_id: 'desc' },
      select: { software_id: true, software_code: true },
    });

    let nextNumber = 1;
    if (lastSoftware?.software_code?.startsWith('SW-')) {
      const match = lastSoftware.software_code.match(/^SW-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      } else {
        nextNumber = lastSoftware.software_id + 1;
      }
    } else if (lastSoftware) {
      nextNumber = lastSoftware.software_id + 1;
    }

    return `SW-${nextNumber.toString().padStart(4, '0')}`;
  }

  // ---------------------------------------------------------------------------
  // HELPER: Log activity in unified activity_logs
  // ---------------------------------------------------------------------------
  async logActivity(
    softwareId: number,
    event: string,
    summary: string,
    details?: any,
    performedBy?: number,
  ) {
    return this.prisma.activity_logs.create({
      data: {
        entity_type: 'SOFTWARE_LICENSE',
        entity_id: softwareId,
        event,
        summary,
        details: details || null,
        performed_by: performedBy || null,
        performed_at: new Date(),
      },
    });
  }

  async isDiscontinued(softwareId: number): Promise<boolean> {
    const sw = await this.prisma.software_licenses.findUnique({ where: { software_id: softwareId }, select: { status: true } });
    return sw?.status === 'Discontinued';
  }

  /** Active, Expiring Soon or Expired from the Expiry Date (BFD 2). Trial keeps its own label while valid. */
  private statusFor(type: string, expiry: string | null, reminderWindow: number): string {
    if (expiry) {
      const left = daysBetween(todayStr(), expiry);
      if (left < 0) return 'Expired';
      if (left <= reminderWindow) return 'Expiring Soon';
    }
    return type === 'Trial' ? 'Trial' : 'Active';
  }

  /**
   * BFD 4 Part 4. "Stops" checks throw a field error. "Confirm" checks (term vs cycle,
   * possible duplicate, already expired) throw CONFIRM_REQUIRED until the user sends confirm: true.
   */
  private async checkSoftwareForm(dto: CreateSoftwareLicenseDto) {
    const name = (dto.software_name || '').trim();
    if (!name) bad('software_name', 'Please fill this field.');
    if (name.length < 2 || name.length > 100) bad('software_name', 'Software Name must be 2 to 100 characters.');

    const type = normalizeLicenseType(dto.license_type);
    if (!(LICENSE_TYPES as readonly string[]).includes(type)) bad('license_type', 'Please fill this field.');
    if ((await this.settingsService.getDisabledLicenseTypes()).includes(type)) {
      bad('license_type', 'This License Type is switched off. Please choose another.');
    }

    if (!dto.category_id) bad('category_id', 'Please fill this field.');
    const category = await this.prisma.software_license_categories.findUnique({ where: { category_id: dto.category_id } });
    if (!category) bad('category_id', 'Please fill this field.');
    if (!category.is_active) bad('category_id', 'This category is no longer in use. Please choose another.');

    if (dto.vendor_id) {
      const vendor = await this.prisma.software_license_vendors.findUnique({ where: { vendor_id: dto.vendor_id } });
      if (!vendor) bad('vendor_id', 'Please fill this field.');
      if (!vendor.is_active) bad('vendor_id', 'This vendor is no longer in use. Please choose another.');
    } else if (!dto.vendor_name?.trim()) {
      bad('vendor_id', 'Please fill this field.');
    }

    let seats: number | null = null;
    if (seatsCounted(type)) {
      const n = Number(dto.total_seats);
      if (!Number.isInteger(n) || n < 1 || n > MAX_SEATS) bad('total_seats', 'Please enter the number of seats bought, from 1 to 10,000.');
      seats = n;
    }

    let cost = 0;
    if (mustBeFree(type)) {
      if (dto.cost !== undefined && dto.cost !== null && Number(dto.cost) !== 0) bad('cost', 'The cost must be 0 for Free and Trial software.');
    } else {
      cost = Number(dto.cost);
      if (dto.cost === undefined || dto.cost === null || !Number.isFinite(cost) || cost < 0 || cost > MAX_COST || !hasTwoDecimalsAtMost(cost)) {
        bad('cost', 'Please enter the amount paid for one cycle.');
      }
    }

    let cycle: string | null = null;
    if (needsBillingCycle(type)) {
      cycle = normalizeBillingCycle(dto.billing_cycle);
      if (!cycle || !(BILLING_CYCLES as readonly string[]).includes(cycle)) bad('billing_cycle', 'Please fill this field.');
    }

    const today = todayStr();
    const purchase = (dto.purchase_date || '').slice(0, 10);
    if (!purchase) bad('purchase_date', 'Please fill this field.');
    if (purchase > today) bad('purchase_date', 'The purchase date cannot be in the future.');
    const start = (dto.start_date || '').slice(0, 10);
    if (!start) bad('start_date', 'Please fill this field.');

    let expiry: string | null = null;
    if (needsExpiry(type)) {
      expiry = (dto.expiry_date || '').slice(0, 10);
      if (!expiry) bad('expiry_date', 'Please fill this field.');
      if (expiry <= start) bad('expiry_date', 'The expiry date must be after the start date.');
    }
    if (type === 'Trial' && expiry) {
      const settings = await this.settingsService.getSettings();
      const max = settings.max_trial_days ?? 90;
      if (daysBetween(start, expiry) + 1 > max) bad('expiry_date', `A trial can be up to ${max} days. Choose Subscription for a longer term.`);
    }

    if (!dto.software_owner_id) bad('software_owner_id', 'Please fill this field.');
    const owner = await this.prisma.employees.findFirst({
      where: { emp_id: dto.software_owner_id, status: 'Active', deleted_at: null },
      select: { emp_id: true },
    });
    if (!owner) bad('software_owner_id', 'Please choose an active employee as owner.');

    await this.checkFiles(dto.attachment_ids);

    // "Confirm" checks
    const confirms: string[] = [];
    const mismatch = termCycleMismatch(cycle, start, expiry);
    if (mismatch) confirms.push(mismatch);
    const dup = await this.prisma.software_licenses.findFirst({
      where: {
        software_name: { equals: name, mode: 'insensitive' },
        status: { not: 'Discontinued' },
        ...(dto.vendor_id
          ? { vendor_id: dto.vendor_id }
          : { software_license_vendors: { name: { equals: (dto.vendor_name || '').trim(), mode: 'insensitive' } } }),
      },
      select: { software_code: true, software_name: true },
    });
    if (dup) confirms.push(`${dup.software_code} ${dup.software_name} already exists. Is this a separate agreement?`);
    if (expiry && expiry < today) confirms.push(`This license expired on ${fmtDate(expiry)}. It will be saved as Expired.`);
    if (confirms.length && !dto.confirm) {
      throw new ConflictException({
        message: confirms.join(' '),
        code: 'CONFIRM_REQUIRED',
        errors: confirms.map((m) => ({ field: 'confirm', message: m })),
      });
    }

    return { name, type, seats, cost, cycle, purchase, start, expiry };
  }

  /** Documents: up to 5 files, PDF, JPG or PNG, 10 MB each (BFD 4 Part 1, marker 11). */
  private async checkFiles(ids?: number[]) {
    if (!ids?.length) return;
    const msg = 'Only PDF, JPG or PNG up to 10 MB, up to 5 files.';
    if (ids.length > MAX_FILES) bad('attachment_ids', msg);
    const files = await this.prisma.attachments.findMany({
      where: { attachment_id: { in: ids } },
      select: { mime_type: true, file_size_bytes: true },
    });
    if (files.some((f) => !ALLOWED_MIME.includes((f.mime_type || '').toLowerCase()) || Number(f.file_size_bytes) > MAX_FILE_BYTES)) {
      bad('attachment_ids', msg);
    }
  }

  private async lookupId(type: string, label: string): Promise<number | null> {
    const row = await this.prisma.master_lookup.findFirst({
      where: { lookup_type: type, label: { equals: label, mode: 'insensitive' }, deleted_at: null },
      select: { lookup_id: true },
    });
    return row?.lookup_id ?? null;
  }

  private async adminIds(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<Array<{ emp_id: number }>>`
      SELECT e.emp_id FROM employees e JOIN roles r ON r.role_id = e.role_id
      WHERE r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL
      ORDER BY e.emp_id;
    `;
    return rows.map((r) => Number(r.emp_id));
  }

  private async notify(recipients: number[], kind: string, title: string, body: string, softwareId: number | null, by?: number | null, email = false) {
    this.notifier.notify({ recipients, kind, title, body, softwareId, actorId: by ?? null, email });
  }

  // ---------------------------------------------------------------------------
  // License Key "Show" / "Copy" (Admin and License Managers only; every view is logged, BFD 4 Part 3 and 8)
  // ---------------------------------------------------------------------------
  async getLicenseKey(softwareId: number, action: 'VIEWED' | 'COPIED', viewerId: number) {
    const sw = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      select: { software_id: true, software_code: true, license_key: true },
    });
    if (!sw) throw new NotFoundException('Software not found.');
    if (!sw.license_key) return { license_key: null };
    const viewer = await this.prisma.employees.findUnique({ where: { emp_id: viewerId }, select: { name: true } });
    // The key itself is never written in the History.
    await this.logActivity(
      softwareId,
      action === 'COPIED' ? 'LICENSE_KEY_COPIED' : 'LICENSE_KEY_VIEWED',
      `License Key ${action === 'COPIED' ? 'copied' : 'viewed'} by ${viewer?.name || 'a user'}`,
      { action },
      viewerId,
    );
    return { license_key: sw.license_key };
  }

  // ---------------------------------------------------------------------------
  // 1. CREATE SOFTWARE LICENSE & INITIAL TERM
  // ---------------------------------------------------------------------------
  async createSoftware(dto: CreateSoftwareLicenseDto, creatorId: number) {
    // Every check of BFD 4 Part 4 runs before anything is saved.
    const v = await this.checkSoftwareForm(dto);

    let vendorId = dto.vendor_id;
    if (!vendorId && dto.vendor_name) {
      const vendor = await this.settingsService.createVendor({
        name: dto.vendor_name.trim(),
        is_active: true,
      });
      vendorId = vendor.vendor_id;
    }
    if (!vendorId) bad('vendor_id', 'Please fill this field.');

    const code = await this.generateSoftwareCode();
    const settings = await this.settingsService.getSettings();
    const status = this.statusFor(v.type, v.expiry, settings.reminder_window_days ?? 30);

    // Create software
    const software = await this.prisma.software_licenses.create({
      data: {
        software_code: code,
        software_name: v.name,
        vendor_id: vendorId,
        category_id: dto.category_id,
        license_type: v.type,
        total_seats: v.seats,
        software_owner_id: dto.software_owner_id,
        bought_from: dto.bought_from?.trim().slice(0, 100) || null,
        license_key: dto.license_key?.trim().slice(0, 500) || null,
        auto_renews: dto.auto_renews ?? false,
        status,
        created_by: creatorId,
      },
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        employees_software_licenses_software_owner_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
      },
    });

    // Create initial term
    const term = await this.prisma.software_license_terms.create({
      data: {
        software_id: software.software_id,
        term_number: 1,
        billing_cycle: v.cycle,
        cost: v.cost,
        total_seats: v.seats,
        purchase_date: new Date(v.purchase),
        start_date: new Date(v.start),
        expiry_date: v.expiry ? new Date(v.expiry) : null,
        invoice_order_no: dto.invoice_order_no?.trim() || null,
        expense_claim_no: dto.expense_claim_no?.trim() || null,
        remarks: dto.remarks?.trim() || null,
        recorded_by: creatorId,
      },
    });

    // Link unified attachments to this term if provided
    if (dto.attachment_ids && dto.attachment_ids.length > 0) {
      await this.prisma.attachments.updateMany({
        where: { attachment_id: { in: dto.attachment_ids } },
        data: {
          entity_type: 'LICENSE_TERM',
          entity_id: term.term_id,
        },
      });
    }

    // Audit log
    await this.logActivity(
      software.software_id,
      'SOFTWARE_CREATED',
      `Registered software ${software.software_name} (${software.software_code})`,
      {
        code: software.software_code,
        license_type: software.license_type,
        total_seats: software.total_seats,
        term_id: term.term_id,
      },
      creatorId,
    );

    if (dto.software_owner_id !== creatorId) {
      await this.notify(
        [dto.software_owner_id],
        'license_software_added',
        `You own ${software.software_name}`,
        `${software.software_code} ${software.software_name} was added with you as Software Owner.`,
        software.software_id,
        creatorId,
      );
    }

    const { license_key: _createdKey, ...softwareWithoutKey } = software;
    return { ...softwareWithoutKey, has_license_key: Boolean(_createdKey), initial_term: term };
  }

  // ---------------------------------------------------------------------------
  // 2. LIST SOFTWARE WITH METRICS AND FILTERING
  // ---------------------------------------------------------------------------
  async getSoftwareList(query: QuerySoftwareLicenseDto, scope: { ownerId?: number } = {}) {
    // 20 software on one page (BFD 3); the export asks for every row (all=true, up to 5,000).
    const exportAll = String(query.all) === 'true';
    const page = exportAll ? 1 : Math.max(1, query.page || 1);
    const limit = exportAll ? 5000 : Math.max(1, Math.min(100, query.limit || 20));

    const rows = await this.registerRows(query, scope);
    const total = rows.length;
    const items = rows.slice((page - 1) * limit, page * limit);
    const summary = await this.registerSummary(scope);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      summary,
    };
  }

  /**
   * Every software matching the filters, nearest Expiry Date first and software without an
   * Expiry Date last (BFD 3 "Default view"). Status defaults to "all except Discontinued".
   */
  private async registerRows(query: QuerySoftwareLicenseDto, scope: { ownerId?: number }) {
    const where: any = scope.ownerId ? { software_owner_id: scope.ownerId } : {};

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { software_name: { contains: q, mode: 'insensitive' } },
        { software_code: { contains: q, mode: 'insensitive' } },
        { software_license_vendors: { name: { contains: q, mode: 'insensitive' } } },
        // ...or the name of an assigned employee
        {
          software_license_assignments: {
            some: {
              status: 'Active',
              employees_software_license_assignments_emp_idToemployees: { name: { contains: q, mode: 'insensitive' } },
            },
          },
        },
      ];
    }
    if (query.category_id) where.category_id = query.category_id;
    if (query.vendor_id) where.vendor_id = query.vendor_id;
    if (query.owner_id) where.software_owner_id = scope.ownerId ?? query.owner_id;
    if (!query.status || query.status === 'Not Discontinued') where.status = { not: 'Discontinued' };
    else if (query.status !== 'All') where.status = query.status;
    if (query.license_type && query.license_type !== 'All') where.license_type = query.license_type;

    const items = await this.prisma.software_licenses.findMany({
      where,
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        employees_software_licenses_software_owner_idToemployees: { select: { emp_id: true, name: true, email: true } },
        software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 },
        software_license_assignments: { where: { status: 'Active' }, select: { assignment_id: true, emp_id: true } },
      },
    });

    const today = todayStr();
    let rows = items.map((item) => {
      const t = item.software_license_terms[0] || null;
      const assignedSeats = item.software_license_assignments.length;
      const totalSeats = item.total_seats;
      const start = toDateStr(t?.start_date);
      const expiry = toDateStr(t?.expiry_date);
      return {
        software_id: item.software_id,
        software_code: item.software_code,
        software_name: item.software_name,
        category: item.software_license_categories?.name,
        category_id: item.category_id,
        vendor: item.software_license_vendors?.name,
        vendor_id: item.vendor_id,
        license_type: item.license_type,
        total_seats: totalSeats,
        assigned_seats: assignedSeats,
        seat_utilization_pct: totalSeats && totalSeats > 0 ? Math.round((assignedSeats / totalSeats) * 100) : null,
        status: item.status,
        auto_renews: item.auto_renews,
        owner: item.employees_software_licenses_software_owner_idToemployees,
        discontinue_date: toDateStr(item.discontinue_date),
        days_left: expiry ? daysBetween(today, expiry) : null,
        yearly_cost: t ? Math.round(yearlyCost(t.billing_cycle, Number(t.cost), start, expiry) * 100) / 100 : 0,
        latest_term: t
          ? {
              term_id: t.term_id,
              term_number: t.term_number,
              billing_cycle: t.billing_cycle,
              cost: Number(t.cost),
              start_date: t.start_date,
              expiry_date: t.expiry_date,
            }
          : null,
      };
    });

    // Expiry filter: next 30, 60 or 90 days, or a date range
    const within = Number(query.expiry_within) || 0;
    const from = query.expiry_from?.slice(0, 10);
    const to = query.expiry_to?.slice(0, 10);
    if (within > 0) rows = rows.filter((r) => r.days_left !== null && r.days_left >= 0 && r.days_left <= within);
    if (from) rows = rows.filter((r) => r.latest_term?.expiry_date && toDateStr(r.latest_term.expiry_date)! >= from);
    if (to) rows = rows.filter((r) => r.latest_term?.expiry_date && toDateStr(r.latest_term.expiry_date)! <= to);

    rows.sort((a, b) => {
      const ea = toDateStr(a.latest_term?.expiry_date);
      const eb = toDateStr(b.latest_term?.expiry_date);
      if (ea && eb && ea !== eb) return ea < eb ? -1 : 1;
      if (ea && !eb) return -1;
      if (!ea && eb) return 1;
      return a.software_name.localeCompare(b.software_name);
    });
    return rows;
  }

  /** The four counters of BFD 3 (marker 1), within the user's scope. */
  private async registerSummary(scope: { ownerId?: number }) {
    const scopeWhere: any = scope.ownerId ? { software_owner_id: scope.ownerId } : {};
    const live = await this.prisma.software_licenses.findMany({
      where: { ...scopeWhere, status: { not: 'Discontinued' } },
      select: {
        status: true,
        total_seats: true,
        software_license_terms: { orderBy: { term_number: 'desc' }, take: 1, select: { billing_cycle: true, cost: true, start_date: true, expiry_date: true } },
        _count: { select: { software_license_assignments: { where: { status: 'Active' } } } },
      },
    });
    const [discontinued, toRecover] = await Promise.all([
      this.prisma.software_licenses.count({ where: { ...scopeWhere, status: 'Discontinued' } }),
      this.prisma.software_license_assignments.count({
        where: { is_flagged_to_recover: true, status: 'Active', ...(scope.ownerId ? { software_licenses: scopeWhere } : {}) },
      }),
    ]);
    const today = todayStr();
    let seatsUsed = 0;
    let seatsTotal = 0;
    let yearly = 0;
    let expiring30 = 0;
    for (const sw of live) {
      const used = sw._count.software_license_assignments;
      seatsUsed += used;
      if (sw.total_seats !== null) seatsTotal += sw.total_seats;
      const t = sw.software_license_terms[0];
      const expiry = toDateStr(t?.expiry_date);
      if (t && sw.status !== 'Expired') yearly += yearlyCost(t.billing_cycle, Number(t.cost), toDateStr(t.start_date), expiry);
      if (expiry && daysBetween(today, expiry) >= 0 && daysBetween(today, expiry) <= 30) expiring30 += 1;
    }
    const inUse = live.filter((s) => s.status !== 'Expired').length;
    return {
      activeLicenses: inUse,
      softwareInUse: inUse,
      seatsUsed,
      seatsTotal,
      expiringSoon: expiring30,
      expired: live.filter((s) => s.status === 'Expired').length,
      discontinued,
      licensesToRecover: toRecover,
      yearlyCost: Math.round(yearly),
      approxAnnualSpend: Math.round(yearly),
      approxMonthlySpend: Math.round(yearly / 12),
    };
  }

  // ---------------------------------------------------------------------------
  // 3. GET SINGLE SOFTWARE DETAILS
  // ---------------------------------------------------------------------------
  async getSoftwareById(softwareId: number) {
    const software = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        software_license_discontinue_reasons: true,
        software_licenses: {
          select: { software_id: true, software_code: true, software_name: true },
        },
        employees_software_licenses_software_owner_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            profile_picture: true,
            departments_employees_dep_idTodepartments: { select: { dep_id: true, name: true } },
          },
        },
        employees_software_licenses_created_byToemployees: {
          select: { emp_id: true, name: true },
        },
        software_license_terms: {
          orderBy: { term_number: 'desc' },
          include: {
            employees: { select: { emp_id: true, name: true } },
          },
        },
        software_license_assignments: {
          orderBy: [{ status: 'asc' }, { assigned_from: 'desc' }],
          include: {
            employees_software_license_assignments_emp_idToemployees: {
              select: {
                emp_id: true,
                name: true,
                email: true,
                profile_picture: true,
                departments_employees_dep_idTodepartments: { select: { dep_id: true, name: true } },
              },
            },
            employees_software_license_assignments_assigned_byToemployees: {
              select: { emp_id: true, name: true },
            },
            employees_software_license_assignments_revoked_byToemployees: {
              select: { emp_id: true, name: true },
            },
            employees_software_license_assignments_transferred_to_emp_idToemployees: {
              select: { emp_id: true, name: true },
            },
            software_license_revoke_reasons: true,
          },
        },
      },
    });

    if (!software) {
      throw new NotFoundException(`Software license with ID ${softwareId} not found`);
    }

    // Unified activity logs
    const logs = await this.prisma.activity_logs.findMany({
      where: {
        entity_type: 'SOFTWARE_LICENSE',
        entity_id: softwareId,
      },
      orderBy: { performed_at: 'desc' },
      include: {
        employees: {
          select: { emp_id: true, name: true, profile_picture: true },
        },
      },
    });

    // Unified attachments
    const termIds = software.software_license_terms.map((t) => t.term_id);
    let documents: any[] = [];
    if (termIds.length > 0) {
      const rawDocs = await this.prisma.attachments.findMany({
        where: {
          entity_type: 'LICENSE_TERM',
          entity_id: { in: termIds },
          deleted_at: null,
        },
        orderBy: { created_at: 'desc' },
        include: {
          employees_attachments_created_byToemployees: { select: { emp_id: true, name: true } },
        },
      });

      documents = rawDocs.map((d) => ({
        ...d,
        file_size_bytes: d.file_size_bytes.toString(),
        uploader: d.employees_attachments_created_byToemployees,
      }));
    }

    const activeAssignments = software.software_license_assignments.filter((a) => a.status === 'Active');
    const assignedSeats = activeAssignments.length;
    const totalSeats = software.total_seats;
    const availableSeats = totalSeats !== null ? Math.max(0, totalSeats - assignedSeats) : null;
    const seatUtilizationPct = totalSeats && totalSeats > 0 ? Math.round((assignedSeats / totalSeats) * 100) : null;

    const latestTerm = software.software_license_terms[0] || null;

    // Seat Use (BFD 5 marker 5): seats free for N+ days and seats to recover from deactivated employees.
    const seatSettings = await this.settingsService.getSettings();
    const unusedDays = seatSettings.unused_seat_flag_days ?? 90;
    const cutoff = new Date(Date.now() - unusedDays * 86_400_000);
    const freedRecently = software.software_license_assignments.filter(
      (a) => a.status !== 'Active' && a.revoked_on && new Date(a.revoked_on) > cutoff,
    ).length;
    const unusedLong = availableSeats !== null ? Math.max(0, availableSeats - freedRecently) : null;
    const toRecover = activeAssignments.filter((a) => a.is_flagged_to_recover).length;
    const firstTermStart = software.software_license_terms.length
      ? software.software_license_terms[software.software_license_terms.length - 1].start_date
      : null;

    // The License Key is never sent with the details; it is fetched on "Show" (getLicenseKey), which is logged.
    const { license_key: storedKey, ...softwareWithoutKey } = software;

    return {
      ...softwareWithoutKey,
      has_license_key: Boolean(storedKey),
      stats: {
        total_seats: totalSeats,
        assigned_seats: assignedSeats,
        available_seats: availableSeats,
        seat_utilization_pct: seatUtilizationPct,
        active_assignments_count: assignedSeats,
        total_terms_count: software.software_license_terms.length,
        documents_count: documents.length,
        unused_seats_long: unusedLong,
        unused_seat_flag_days: unusedDays,
        seats_to_recover: toRecover,
        first_term_start: firstTermStart,
      },
      current_term: latestTerm,
      documents,
      activity_logs: logs.map((l) => ({
        log_id: l.log_id.toString(),
        event: l.event,
        summary: l.summary,
        details: l.details,
        performed_at: l.performed_at,
        performer: l.employees,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // 4. UPDATE BASIC SOFTWARE METADATA
  // ---------------------------------------------------------------------------
  async updateSoftware(softwareId: number, dto: UpdateSoftwareLicenseDto, updatedBy: number, opts: { isAdmin?: boolean } = {}) {
    const existing = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      include: {
        software_license_vendors: { select: { name: true } },
        software_license_categories: { select: { name: true } },
        employees_software_licenses_software_owner_idToemployees: { select: { name: true } },
        software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Software with ID ${softwareId} not found`);
    }
    if (existing.status === 'Discontinued') bad('software_name', 'A discontinued software is read-only.');

    const data: any = {};
    const changes: Array<{ field: string; old: any; new: any }> = [];
    const change = (field: string, oldV: any, newV: any) => changes.push({ field, old: oldV ?? null, new: newV ?? null });

    if (dto.software_name !== undefined) {
      const name = dto.software_name.trim();
      if (name.length < 2 || name.length > 100) bad('software_name', 'Software Name must be 2 to 100 characters.');
      if (name !== existing.software_name) { data.software_name = name; change('Software Name', existing.software_name, name); }
    }
    if (dto.vendor_id && dto.vendor_id !== existing.vendor_id) {
      const v = await this.prisma.software_license_vendors.findUnique({ where: { vendor_id: dto.vendor_id } });
      if (!v) bad('vendor_id', 'Please fill this field.');
      if (!v.is_active) bad('vendor_id', 'This vendor is no longer in use. Please choose another.');
      data.vendor_id = dto.vendor_id; change('Vendor', existing.software_license_vendors?.name, v.name);
    }
    if (dto.category_id && dto.category_id !== existing.category_id) {
      const c = await this.prisma.software_license_categories.findUnique({ where: { category_id: dto.category_id } });
      if (!c) bad('category_id', 'Please fill this field.');
      if (!c.is_active) bad('category_id', 'This category is no longer in use. Please choose another.');
      data.category_id = dto.category_id; change('Category', existing.software_license_categories?.name, c.name);
    }
    let newOwnerId: number | null = null;
    if (dto.software_owner_id && dto.software_owner_id !== existing.software_owner_id) {
      const o = await this.prisma.employees.findFirst({
        where: { emp_id: dto.software_owner_id, status: 'Active', deleted_at: null },
        select: { name: true },
      });
      if (!o) bad('software_owner_id', 'Please choose an active employee as owner.');
      data.software_owner_id = dto.software_owner_id; newOwnerId = dto.software_owner_id;
      change('Software Owner', existing.employees_software_licenses_software_owner_idToemployees?.name, o.name);
    }
    if (dto.bought_from !== undefined) {
      const v = dto.bought_from?.trim().slice(0, 100) || null;
      if (v !== existing.bought_from) { data.bought_from = v; change('Bought from', existing.bought_from, v); }
    }
    if (dto.license_key !== undefined && (dto.license_key?.trim() || null) !== existing.license_key) {
      data.license_key = dto.license_key?.trim().slice(0, 500) || null;
      change('License Key', '(hidden)', '(changed)'); // the key itself is never written in the History
    }
    if (dto.auto_renews !== undefined && dto.auto_renews !== existing.auto_renews) {
      data.auto_renews = dto.auto_renews; change('Auto-renews', existing.auto_renews ? 'Yes' : 'No', dto.auto_renews ? 'Yes' : 'No');
    }

    const activeCount = await this.prisma.software_license_assignments.count({ where: { software_id: softwareId, status: 'Active' } });

    // License Type: Admin only, and only to a type that keeps the assignments valid.
    let type = existing.license_type;
    if (dto.license_type && normalizeLicenseType(dto.license_type) !== existing.license_type) {
      if (!opts.isAdmin) bad('license_type', 'Only the Admin can change the License Type.');
      type = normalizeLicenseType(dto.license_type);
      if (!(LICENSE_TYPES as readonly string[]).includes(type)) bad('license_type', 'Please fill this field.');
      if (needsExpiry(type) && !existing.software_license_terms[0]?.expiry_date) {
        bad('license_type', 'This type needs an Expiry Date. Correct the current term first.');
      }
      if (seatsCounted(type)) {
        const seats = dto.total_seats ?? existing.total_seats;
        if (seats === null || seats === undefined || seats < activeCount) {
          bad('total_seats', `Total Seats must be at least the ${activeCount} seats assigned today.`);
        }
        data.total_seats = seats;
      } else {
        data.total_seats = null;
      }
      data.license_type = type;
      change('License Type', existing.license_type, type);
    }

    // Fewer seats in the middle of a term: only down to Seats Used, with a reason. More seats use "Add Seats".
    if (dto.total_seats !== undefined && dto.total_seats !== null && seatsCounted(type) && data.license_type === undefined) {
      const current = existing.total_seats ?? 0;
      if (dto.total_seats > current) bad('total_seats', 'To add seats use "Add Seats", with the cost and the invoice.');
      if (dto.total_seats < current) {
        if (dto.total_seats < activeCount) bad('total_seats', `${activeCount} seats are assigned. Total Seats cannot be lower than ${activeCount}.`);
        if (!dto.reason || dto.reason.trim().length < 10) bad('reason', 'Please give the reason for reducing seats (at least 10 characters).');
        data.total_seats = dto.total_seats;
        change('Total Seats', current, dto.total_seats);
      }
    }

    if (!changes.length) {
      const { license_key: _k, ...same } = existing;
      return same;
    }

    const updated = await this.prisma.software_licenses.update({
      where: { software_id: softwareId },
      data: { ...data, updated_by: updatedBy, updated_at: new Date() },
    });
    if (data.total_seats !== undefined && existing.software_license_terms[0]) {
      await this.prisma.software_license_terms.update({
        where: { term_id: existing.software_license_terms[0].term_id },
        data: { total_seats: data.total_seats },
      });
    }

    await this.logActivity(
      softwareId,
      'SOFTWARE_UPDATED',
      `Changed ${changes.map((c) => c.field).join(', ')}`,
      { changes, reason: dto.reason?.trim() || null },
      updatedBy,
    );
    if (newOwnerId && newOwnerId !== updatedBy) {
      await this.notify([newOwnerId], 'license_owner_named', `You own ${updated.software_name}`,
        `You are now the Software Owner of ${updated.software_code} ${updated.software_name}.`, softwareId, updatedBy);
    }

    const { license_key: _key, ...updatedWithoutKey } = updated;
    return updatedWithoutKey;
  }

  // ---------------------------------------------------------------------------
  // 4b. ADD SEATS IN THE MIDDLE OF A TERM (BFD 5 Part 2)
  // ---------------------------------------------------------------------------
  async addSeats(softwareId: number, dto: AddSeatsDto, by: number) {
    const sw = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      include: { software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 } },
    });
    if (!sw) throw new NotFoundException('Software not found.');
    if (sw.status === 'Discontinued') bad('seats', 'A discontinued software is read-only.');
    if (sw.status === 'Expired') bad('seats', 'This software has expired. Record the renewal with the new number of seats.');
    if (!seatsCounted(sw.license_type)) bad('seats', 'This License Type has no seat limit.');
    const term = sw.software_license_terms[0];
    if (!term) bad('seats', 'This software has no current term.');

    const add = Number(dto.seats);
    const before = sw.total_seats ?? 0;
    if (!Number.isInteger(add) || add < 1) bad('seats', 'Please enter the number of seats added.');
    if (before + add > MAX_SEATS) bad('seats', 'Total Seats cannot be more than 10,000.');
    const cost = Number(dto.cost ?? 0);
    if (!Number.isFinite(cost) || cost < 0 || cost > MAX_COST || !hasTwoDecimalsAtMost(cost)) bad('cost', 'Please enter the amount paid for the added seats.');
    const on = (dto.added_on || '').slice(0, 10);
    if (!on) bad('added_on', 'Please fill this field.');
    if (on > todayStr()) bad('added_on', 'The date cannot be in the future.');
    const termStart = toDateStr(term.start_date)!;
    if (on < termStart) bad('added_on', `The date cannot be before the current term started (${fmtDate(termStart)}).`);
    await this.checkFiles(dto.attachment_ids);

    await this.prisma.$transaction([
      this.prisma.software_licenses.update({
        where: { software_id: softwareId },
        data: { total_seats: before + add, updated_by: by, updated_at: new Date() },
      }),
      this.prisma.software_license_terms.update({ where: { term_id: term.term_id }, data: { total_seats: before + add } }),
    ]);
    if (dto.attachment_ids?.length) {
      await this.prisma.attachments.updateMany({
        where: { attachment_id: { in: dto.attachment_ids } },
        data: { entity_type: 'LICENSE_TERM', entity_id: term.term_id },
      });
    }
    await this.logActivity(
      softwareId,
      'SEATS_ADDED',
      `Seats added: ${before} → ${before + add} (Term ${term.term_number})`,
      {
        old_total_seats: before,
        new_total_seats: before + add,
        seats_added: add,
        cost,
        added_on: on,
        invoice_order_no: dto.invoice_order_no?.trim() || null,
        remarks: dto.remarks?.trim() || null,
        term_number: term.term_number,
      },
      by,
    );
    return { success: true, total_seats: before + add };
  }

  // ---------------------------------------------------------------------------
  // 4c. CORRECT THE CURRENT TERM (dates or cost), only to fix a mistake, with a reason (BFD 5 Part 2, 15)
  // ---------------------------------------------------------------------------
  async correctCurrentTerm(softwareId: number, dto: CorrectTermDto, by: number) {
    const sw = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      include: { software_license_terms: { orderBy: { term_number: 'desc' }, take: 2 } },
    });
    if (!sw) throw new NotFoundException('Software not found.');
    if (sw.status === 'Discontinued') bad('reason', 'A discontinued software is read-only.');
    const [term, previous] = sw.software_license_terms;
    if (!term) bad('reason', 'This software has no current term.');
    const reason = (dto.reason || '').trim();
    if (reason.length < 10 || reason.length > 500) bad('reason', 'Please give the reason for the correction (10 to 500 characters).');

    const today = todayStr();
    const start = (dto.start_date ?? toDateStr(term.start_date)!).slice(0, 10);
    const purchase = (dto.purchase_date ?? toDateStr(term.purchase_date)!).slice(0, 10);
    const expiry = dto.expiry_date !== undefined ? (dto.expiry_date ? dto.expiry_date.slice(0, 10) : null) : toDateStr(term.expiry_date);
    const cycle = dto.billing_cycle !== undefined ? normalizeBillingCycle(dto.billing_cycle) : term.billing_cycle;
    const cost = dto.cost !== undefined ? Number(dto.cost) : Number(term.cost);

    if (purchase > today) bad('purchase_date', 'The purchase date cannot be in the future.');
    if (needsExpiry(sw.license_type) && !expiry) bad('expiry_date', 'Please fill this field.');
    if (expiry && expiry <= start) bad('expiry_date', 'The expiry date must be after the start date.');
    const prevStart = toDateStr(previous?.start_date);
    if (prevStart && start <= prevStart) bad('start_date', `Terms cannot overlap: the start must be after ${fmtDate(prevStart)}.`);
    if (cycle && !(BILLING_CYCLES as readonly string[]).includes(cycle)) bad('billing_cycle', 'Please fill this field.');
    if (mustBeFree(sw.license_type) ? cost !== 0 : !Number.isFinite(cost) || cost < 0 || cost > MAX_COST || !hasTwoDecimalsAtMost(cost)) {
      bad('cost', mustBeFree(sw.license_type) ? 'The cost must be 0 for Free and Trial software.' : 'Please enter the amount paid for one cycle.');
    }

    const changes: Array<{ field: string; old: any; new: any }> = [];
    const cmp = (field: string, oldV: any, newV: any) => { if (String(oldV ?? '') !== String(newV ?? '')) changes.push({ field, old: oldV ?? null, new: newV ?? null }); };
    cmp('Purchase Date', toDateStr(term.purchase_date), purchase);
    cmp('Start Date', toDateStr(term.start_date), start);
    cmp('Expiry Date', toDateStr(term.expiry_date), expiry);
    cmp('Billing Cycle', term.billing_cycle, cycle);
    cmp('Cost', Number(term.cost), cost);
    if (dto.invoice_order_no !== undefined) cmp('Invoice / Order No.', term.invoice_order_no, dto.invoice_order_no.trim() || null);
    if (!changes.length) return { success: true, changed: 0 };

    await this.prisma.software_license_terms.update({
      where: { term_id: term.term_id },
      data: {
        purchase_date: new Date(purchase),
        start_date: new Date(start),
        expiry_date: expiry ? new Date(expiry) : null,
        billing_cycle: cycle,
        cost,
        ...(dto.invoice_order_no !== undefined && { invoice_order_no: dto.invoice_order_no.trim() || null }),
      },
    });
    const settings = await this.settingsService.getSettings();
    await this.prisma.software_licenses.update({
      where: { software_id: softwareId },
      data: { status: this.statusFor(sw.license_type, expiry, settings.reminder_window_days ?? 30), updated_by: by, updated_at: new Date() },
    });
    await this.logActivity(softwareId, 'TERM_CORRECTED', `Term ${term.term_number} corrected: ${changes.map((c) => c.field).join(', ')}`, { term_number: term.term_number, changes, reason }, by);
    return { success: true, changed: changes.length };
  }

  // ---------------------------------------------------------------------------
  // 5. ASSIGN LICENSE TO EMPLOYEES
  // ---------------------------------------------------------------------------
  async assignLicense(softwareId: number, dto: AssignLicenseDto, assignedBy: number) {
    const software = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      include: {
        software_license_terms: { orderBy: { term_number: 'asc' }, take: 1, select: { start_date: true } },
      },
    });

    if (!software) {
      throw new NotFoundException(`Software with ID ${softwareId} not found`);
    }
    if (software.status === 'Discontinued') bad('assignments', 'A discontinued software cannot be assigned.');
    if (software.status === 'Expired') bad('assignments', 'This software has expired. No new seat can be given until a renewal is recorded.');

    // Assigned From: today or a past date, not before the Start Date of Term 1 (BFD 6 Part 1, marker 2).
    const from = (dto.assigned_from || '').slice(0, 10);
    if (!from) bad('assigned_from', 'Please fill this field.');
    if (from > todayStr()) bad('assigned_from', 'The Assigned From date cannot be in the future.');
    const term1Start = toDateStr(software.software_license_terms[0]?.start_date);
    if (term1Start && from < term1Start) bad('assigned_from', `The date cannot be before the Start Date of Term 1 (${fmtDate(term1Start)}).`);

    const wanted = Array.from(new Map((dto.assignments || []).map((a) => [Number(a.emp_id), a])).values());
    if (!wanted.length) bad('assignments', 'Please choose at least one employee.');
    for (const a of wanted) {
      if (a.login_account_id && a.login_account_id.trim().length > 100) bad('assignments', 'A Login / Account ID can be up to 100 characters.');
    }

    // Only active employees; anyone deactivated meanwhile is skipped and named (BFD 15).
    const people = await this.prisma.employees.findMany({
      where: { emp_id: { in: wanted.map((a) => Number(a.emp_id)) } },
      select: { emp_id: true, name: true, status: true, deleted_at: true },
    });
    const byId = new Map(people.map((p) => [p.emp_id, p]));
    const skipped: string[] = [];
    const toAssign = wanted.filter((a) => {
      const p = byId.get(Number(a.emp_id));
      const ok = p && p.status === 'Active' && !p.deleted_at;
      if (!ok) skipped.push(`${p?.name || `Emp #${a.emp_id}`} is no longer active`);
      return ok;
    });
    if (!toAssign.length) bad('assignments', `${skipped.join('. ')}.`);

    // The seat check and the save happen under a row lock, so two people cannot give the last seat twice.
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT software_id FROM software_licenses WHERE software_id = ${softwareId} FOR UPDATE`;
      const holders = await tx.software_license_assignments.findMany({
        where: { software_id: softwareId, status: 'Active' },
        select: { emp_id: true },
      });
      const holding = new Set(holders.map((h) => h.emp_id));
      const already = toAssign.filter((a) => holding.has(Number(a.emp_id)));
      if (already.length) {
        bad('assignments', `${already.map((a) => byId.get(Number(a.emp_id))?.name || a.emp_id).join(', ')} already ${already.length === 1 ? 'has' : 'have'} a seat of this software.`);
      }
      if (software.total_seats !== null && seatsCounted(software.license_type)) {
        const free = Math.max(0, software.total_seats - holders.length);
        if (toAssign.length > free) bad('assignments', `Only ${free} seat${free === 1 ? ' is' : 's are'} free.`);
      }
      await tx.software_license_assignments.createMany({
        data: toAssign.map((a) => ({
          software_id: softwareId,
          emp_id: Number(a.emp_id),
          login_account_id: a.login_account_id?.trim() || null,
          assigned_from: new Date(from),
          assigned_by: assignedBy,
          status: 'Active',
          remarks: a.remarks?.trim().slice(0, 500) || null,
          is_flagged_to_recover: false,
        })),
      });
      return holders.length + toAssign.length;
    });

    await this.logActivity(
      softwareId,
      'LICENSE_ASSIGNED',
      `Assigned to ${toAssign.map((a) => byId.get(Number(a.emp_id))?.name).join(', ')} from ${fmtDate(from)}`,
      {
        assigned_from: from,
        employees: toAssign.map((a) => ({ emp_id: Number(a.emp_id), name: byId.get(Number(a.emp_id))?.name, login: a.login_account_id?.trim() || null })),
        skipped,
      },
      assignedBy,
    );

    // BFD 14: the employee is told in-app and by email (login only, never the key).
    for (const a of toAssign) {
      await this.notify(
        [Number(a.emp_id)],
        'license_seat_assigned',
        `${software.software_name} has been given to you`,
        `You have a seat of ${software.software_name} from ${fmtDate(from)}.${a.login_account_id?.trim() ? ` Your login: ${a.login_account_id.trim()}.` : ''} See My Software.`,
        softwareId,
        assignedBy,
        true,
      );
    }
    // All seats used -> Software Owner and License Managers, in-app.
    if (software.total_seats !== null && seatsCounted(software.license_type) && created >= software.total_seats) {
      await this.notify(
        [software.software_owner_id, ...(await this.notifier.managerIds())],
        'license_seats_full',
        `All seats of ${software.software_name} are used`,
        `${software.software_code} ${software.software_name}: ${created} of ${software.total_seats} seats are assigned. Revoke a seat or add seats before the next assignment.`,
        softwareId,
        assignedBy,
      );
    }

    return { success: true, count: toAssign.length, skipped };
  }

  // ---------------------------------------------------------------------------
  // 6. REVOKE / TRANSFER LICENSE ASSIGNMENT
  // ---------------------------------------------------------------------------
  async revokeAssignment(assignmentId: number, dto: RevokeLicenseDto, revokedBy: number) {
    const assignment = await this.prisma.software_license_assignments.findUnique({
      where: { assignment_id: assignmentId },
      include: {
        software_licenses: true,
        employees_software_license_assignments_emp_idToemployees: {
          select: { emp_id: true, name: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    if (assignment.status === 'Revoked') {
      throw new BadRequestException('Assignment is already revoked');
    }

    // BFD 6 Part 2: today or a past date, not before the Assigned From date; a reason is required.
    const revokedOn = this.checkRevokeDate(dto.revoked_on, [toDateStr(assignment.assigned_from)!]);
    await this.checkRevokeReason(dto.revoke_reason_id);

    // Transfer: the new holder must be active and must not already hold a seat. Checked before anything changes.
    if (dto.transferred_to_emp_id) {
      const recipient = await this.prisma.employees.findFirst({
        where: { emp_id: dto.transferred_to_emp_id, status: 'Active', deleted_at: null },
        select: { emp_id: true },
      });
      if (!recipient) bad('transferred_to_emp_id', 'Please choose an active employee.');
      const holds = await this.prisma.software_license_assignments.findFirst({
        where: { software_id: assignment.software_id, emp_id: dto.transferred_to_emp_id, status: 'Active' },
      });
      if (holds) bad('transferred_to_emp_id', 'This employee already has a seat of this software.');
    }

    const revokedDate = new Date(revokedOn);

    // Update assignment to Revoked
    const updated = await this.prisma.software_license_assignments.update({
      where: { assignment_id: assignmentId },
      data: {
        status: 'Revoked',
        revoked_on: revokedDate,
        revoked_by: revokedBy,
        revoke_reason_id: dto.revoke_reason_id,
        revoke_remarks: dto.revoke_remarks?.trim() || null,
        is_flagged_to_recover: false,
        transferred_to_emp_id: dto.transferred_to_emp_id || null,
        updated_at: new Date(),
      },
    });

    // If transferring to another employee
    if (dto.transferred_to_emp_id) {
      const recipientId = dto.transferred_to_emp_id;

      // Check recipient does not already have an active seat
      const recipientExisting = await this.prisma.software_license_assignments.findFirst({
        where: {
          software_id: assignment.software_id,
          emp_id: recipientId,
          status: 'Active',
        },
      });

      if (recipientExisting) {
        throw new BadRequestException('Transfer target employee already holds an active seat');
      }

      const newAssignment = await this.prisma.software_license_assignments.create({
        data: {
          software_id: assignment.software_id,
          emp_id: recipientId,
          login_account_id: assignment.login_account_id,
          assigned_from: revokedDate,
          assigned_by: revokedBy,
          status: 'Active',
          remarks: `Transferred from ${assignment.employees_software_license_assignments_emp_idToemployees?.name || assignment.emp_id}`,
          is_flagged_to_recover: false,
        },
      });

      await this.logActivity(
        assignment.software_id,
        'LICENSE_TRANSFERRED',
        `Transferred license seat from ${assignment.employees_software_license_assignments_emp_idToemployees?.name} to employee ID ${recipientId}`,
        {
          from_emp_id: assignment.emp_id,
          to_emp_id: recipientId,
          reason_id: dto.revoke_reason_id,
        },
        revokedBy,
      );

      const sw = assignment.software_licenses;
      await this.notify([assignment.emp_id], 'license_seat_revoked', `${sw.software_name} has been moved to another user`,
        `Your seat of ${sw.software_name} ended on ${fmtDate(revokedOn)}.`, assignment.software_id, revokedBy, true);
      await this.notify([recipientId], 'license_seat_assigned', `${sw.software_name} has been given to you`,
        `You have a seat of ${sw.software_name} from ${fmtDate(revokedOn)}.${assignment.login_account_id ? ` Login: ${assignment.login_account_id}.` : ''} See My Software.`,
        assignment.software_id, revokedBy, true);

      return { revoked: updated, transferred: newAssignment };
    }

    await this.logActivity(
      assignment.software_id,
      'LICENSE_REVOKED',
      `Revoked license seat from ${assignment.employees_software_license_assignments_emp_idToemployees?.name}`,
      {
        emp_id: assignment.emp_id,
        reason_id: dto.revoke_reason_id,
        remarks: dto.revoke_remarks,
      },
      revokedBy,
    );

    await this.notify([assignment.emp_id], 'license_seat_revoked', `Your ${assignment.software_licenses.software_name} seat has ended`,
      `Your seat of ${assignment.software_licenses.software_name} ended on ${fmtDate(revokedOn)}.`, assignment.software_id, revokedBy, true);

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 6b. REVOKE SEVERAL SEATS AT ONCE (BFD 6 Part 2: one date and one reason)
  // ---------------------------------------------------------------------------
  async revokeMany(softwareId: number, dto: BulkRevokeLicenseDto, revokedBy: number) {
    const ids = Array.from(new Set((dto.assignment_ids || []).map(Number).filter(Boolean)));
    if (!ids.length) bad('assignment_ids', 'Please select at least one seat.');
    const rows = await this.prisma.software_license_assignments.findMany({
      where: { assignment_id: { in: ids }, software_id: softwareId, status: 'Active' },
      include: { employees_software_license_assignments_emp_idToemployees: { select: { name: true } } },
    });
    if (rows.length !== ids.length) bad('assignment_ids', 'Some of the selected seats are no longer active. Please reload.');

    const revokedOn = this.checkRevokeDate(dto.revoked_on, rows.map((r) => toDateStr(r.assigned_from)!));
    await this.checkRevokeReason(dto.revoke_reason_id);
    const remarks = dto.revoke_remarks?.trim().slice(0, 500) || null;

    await this.prisma.$transaction(async (tx) => {
      const n = await tx.software_license_assignments.updateMany({
        where: { assignment_id: { in: ids }, status: 'Active' },
        data: {
          status: 'Revoked',
          revoked_on: new Date(revokedOn),
          revoked_by: revokedBy,
          revoke_reason_id: dto.revoke_reason_id,
          revoke_remarks: remarks,
          is_flagged_to_recover: false,
          updated_at: new Date(),
        },
      });
      if (n.count !== ids.length) throw new ConflictException('Some of the selected seats were changed by someone else. Please reload.');
    });

    for (const r of rows) {
      await this.logActivity(
        softwareId,
        'LICENSE_REVOKED',
        `Revoked license seat from ${r.employees_software_license_assignments_emp_idToemployees?.name || r.emp_id}`,
        { emp_id: r.emp_id, reason_id: dto.revoke_reason_id, remarks, revoked_on: revokedOn, bulk: true },
        revokedBy,
      );
    }
    const swName = (await this.prisma.software_licenses.findUnique({ where: { software_id: softwareId }, select: { software_name: true } }))?.software_name || 'Software';
    for (const r of rows) {
      await this.notify([r.emp_id], 'license_seat_revoked', `Your ${swName} seat has ended`,
        `Your seat of ${swName} ended on ${fmtDate(revokedOn)}.`, softwareId, revokedBy, true);
    }
    return { success: true, count: rows.length };
  }

  /** Revoke Date: today or a past date, not before any Assigned From date. Returns 'YYYY-MM-DD'. */
  private checkRevokeDate(value: string, assignedFrom: string[]): string {
    const d = (value || '').slice(0, 10);
    if (!d) bad('revoked_on', 'Please fill this field.');
    if (d > todayStr()) bad('revoked_on', 'The revoke date cannot be in the future.');
    const latest = assignedFrom.sort().at(-1);
    if (latest && d < latest) bad('revoked_on', `The revoke date cannot be before the Assigned From date (${fmtDate(latest)}).`);
    return d;
  }

  private async checkRevokeReason(reasonId: number) {
    if (!reasonId) bad('revoke_reason_id', 'Please choose a reason.');
    const r = await this.prisma.master_lookup.findFirst({
      where: { lookup_id: reasonId, lookup_type: 'software_revoke_reason', deleted_at: null },
      select: { lookup_id: true },
    });
    if (!r) bad('revoke_reason_id', 'Please choose a reason.');
  }

  // ---------------------------------------------------------------------------
  // 7. RENEW SOFTWARE LICENSE (NEW TERM)
  // ---------------------------------------------------------------------------
  async renewLicense(softwareId: number, dto: RenewLicenseDto, renewedBy: number) {
    const software = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      include: {
        software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 },
        software_license_assignments: { where: { status: 'Active' }, select: { assignment_id: true } },
      },
    });

    if (!software) {
      throw new NotFoundException(`Software with ID ${softwareId} not found`);
    }

    // Renewing a Discontinued software is the Admin's "Reopen" (BFD 7 Part 3); the controller allows only the Admin.
    const reopening = software.status === 'Discontinued';

    const latestTerm = software.software_license_terms[0];
    const nextTermNumber = latestTerm ? latestTerm.term_number + 1 : 1;

    // Validate dates
    const start = (dto.start_date || '').slice(0, 10);
    if (!start) bad('start_date', 'Please fill this field.');
    const startDate = new Date(start);
    const expiryDate = dto.expiry_date ? new Date(dto.expiry_date.slice(0, 10)) : null;

    if (expiryDate && expiryDate <= startDate) {
      bad('expiry_date', 'The expiry date must be after the start date.');
    }
    if (dto.renewal_date && dto.renewal_date.slice(0, 10) > todayStr()) {
      bad('renewal_date', 'The renewal date cannot be in the future.');
    }
    // One term at a time: a new term cannot start before the current one started.
    const currentStart = toDateStr(latestTerm?.start_date);
    if (currentStart && start <= currentStart) {
      bad('start_date', `The new term must start after the current term started (${fmtDate(currentStart)}).`);
    }
    // Total Seats cannot go below the seats assigned today.
    const assignedNow = software.software_license_assignments.length;
    if (dto.total_seats !== undefined && dto.total_seats !== null && software.total_seats !== null && dto.total_seats < assignedNow) {
      bad('total_seats', `${assignedNow} seats are assigned. Total Seats cannot be lower than ${assignedNow}.`);
    }

    // Determine status
    const settings = await this.settingsService.getSettings();
    const reminderWindow = settings.reminder_window_days ?? 30;
    let newStatus = 'Active';

    if (expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const exp = new Date(expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        newStatus = 'Expired';
      } else if (diffDays <= reminderWindow) {
        newStatus = 'Expiring Soon';
      }
    }

    // Create Term
    const term = await this.prisma.software_license_terms.create({
      data: {
        software_id: softwareId,
        term_number: nextTermNumber,
        billing_cycle: normalizeBillingCycle(dto.billing_cycle) || latestTerm?.billing_cycle || 'Yearly',
        cost: dto.cost !== undefined ? dto.cost : (latestTerm?.cost || 0),
        total_seats: dto.total_seats !== undefined ? dto.total_seats : software.total_seats,
        // The Renewal Date (paid on) is kept as the term's purchase date.
        purchase_date: dto.renewal_date ? new Date(dto.renewal_date.slice(0, 10)) : startDate,
        start_date: startDate,
        expiry_date: expiryDate,
        invoice_order_no: dto.invoice_order_no?.trim() || null,
        expense_claim_no: dto.expense_claim_no?.trim() || null,
        remarks: dto.remarks?.trim() || null,
        recorded_by: renewedBy,
      },
    });

    // Update software master status and seats if changed
    await this.prisma.software_licenses.update({
      where: { software_id: softwareId },
      data: {
        status: newStatus,
        ...(dto.total_seats !== undefined && { total_seats: dto.total_seats }),
        // Reopen clears the discontinuation; the History keeps it.
        ...(reopening && {
          discontinue_date: null,
          discontinue_reason_id: null,
          discontinue_remarks: null,
          replaced_by_software_id: null,
        }),
        updated_by: renewedBy,
        updated_at: new Date(),
      },
    });

    if (reopening) {
      const endedOn = toDateStr(software.discontinue_date);
      const gap = endedOn ? Math.max(0, daysBetween(endedOn, start) - 1) : null;
      await this.logActivity(
        softwareId,
        'SOFTWARE_REOPENED',
        `Reopened with Term ${nextTermNumber}${endedOn ? ` after being discontinued on ${fmtDate(endedOn)}` : ''}${gap ? ` (${gap} day${gap === 1 ? '' : 's'} not covered)` : ''}`,
        { discontinued_on: endedOn, new_start: start, gap_days: gap },
        renewedBy,
      );
    }

    // Attach documents if provided
    if (dto.attachment_ids && dto.attachment_ids.length > 0) {
      await this.prisma.attachments.updateMany({
        where: { attachment_id: { in: dto.attachment_ids } },
        data: {
          entity_type: 'LICENSE_TERM',
          entity_id: term.term_id,
        },
      });
    }

    await this.logActivity(
      softwareId,
      'TERM_RENEWED',
      `Renewed license for Term ${nextTermNumber} (${term.billing_cycle}, Cost: ${term.cost})`,
      {
        term_number: nextTermNumber,
        cost: term.cost,
        start_date: term.start_date,
        expiry_date: term.expiry_date,
      },
      renewedBy,
    );

    const recipients = [
      software.software_owner_id,
      ...(await this.notifier.managerIds()),
      ...(await this.notifier.adminIds()),
      ...(await this.notifier.accountsIds()),
    ].filter((id) => id !== renewedBy);
    await this.notify(
      recipients,
      reopening ? 'license_reopened' : 'license_renewed',
      `${software.software_name} ${reopening ? 'reopened' : 'renewed'}`,
      `${software.software_code} ${software.software_name}: Term ${nextTermNumber} from ${fmtDate(start)}${term.expiry_date ? ` to ${fmtDate(toDateStr(term.expiry_date)!)}` : ''}.`,
      softwareId,
      renewedBy,
    );

    return term;
  }

  // ---------------------------------------------------------------------------
  // 8. DISCONTINUE SOFTWARE
  // ---------------------------------------------------------------------------
  async discontinueSoftware(softwareId: number, dto: DiscontinueLicenseDto, discontinuedBy: number) {
    const software = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      include: { software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 } },
    });

    if (!software) {
      throw new NotFoundException(`Software with ID ${softwareId} not found`);
    }
    if (software.status === 'Discontinued') bad('discontinue_date', 'This software is already discontinued.');

    // BFD 7 Part 3: today, a past date back to the current Start Date, or a future date up to the Expiry Date.
    const today = todayStr();
    const date = (dto.discontinue_date || '').slice(0, 10);
    if (!date) bad('discontinue_date', 'Please fill this field.');
    const term = software.software_license_terms[0];
    const termStart = toDateStr(term?.start_date);
    const termExpiry = toDateStr(term?.expiry_date);
    if (termStart && date < termStart) bad('discontinue_date', `The date cannot be before the current term started (${fmtDate(termStart)}).`);
    if (date > today) {
      if (!termExpiry) bad('discontinue_date', 'This software has no Expiry Date. Choose today or a past date.');
      if (date > termExpiry) bad('discontinue_date', `A future date can be up to the Expiry Date (${fmtDate(termExpiry)}).`);
    }

    if (!dto.discontinue_reason_id) bad('discontinue_reason_id', 'Please choose a reason.');
    const reason = await this.prisma.master_lookup.findFirst({
      where: { lookup_id: dto.discontinue_reason_id, lookup_type: 'software_discontinue_reason', deleted_at: null },
      select: { label: true },
    });
    if (!reason) bad('discontinue_reason_id', 'Please choose a reason.');
    const remarks = (dto.discontinue_remarks || '').trim();
    if (remarks.length < 10 || remarks.length > 500) bad('discontinue_remarks', 'Please write 10 to 500 characters.');
    if (dto.replaced_by_software_id && dto.replaced_by_software_id === softwareId) {
      bad('replaced_by_software_id', 'Please choose a different software.');
    }

    // Save the decision. A future date is applied by the daily check on that date.
    const updated = await this.prisma.software_licenses.update({
      where: { software_id: softwareId },
      data: {
        discontinue_date: new Date(date),
        discontinue_reason_id: dto.discontinue_reason_id,
        discontinue_remarks: remarks,
        replaced_by_software_id: dto.replaced_by_software_id || null,
        updated_by: discontinuedBy,
        updated_at: new Date(),
      },
    });

    if (date > today) {
      await this.logActivity(
        softwareId,
        'DISCONTINUE_SCHEDULED',
        `Discontinues on ${fmtDate(date)}: ${reason.label}`,
        { discontinue_date: date, reason: reason.label, remarks, replaced_by_software_id: dto.replaced_by_software_id || null },
        discontinuedBy,
      );
      return { ...updated, scheduled: true };
    }

    await this.applyDiscontinue(softwareId, discontinuedBy);
    return { ...updated, status: 'Discontinued', scheduled: false };
  }

  /** Makes a discontinuation take effect: every active seat is revoked with "Software discontinued". */
  private async applyDiscontinue(softwareId: number, by: number | null) {
    const sw = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      include: {
        software_license_discontinue_reasons: { select: { label: true } },
        software_license_assignments: { where: { status: 'Active' }, select: { emp_id: true } },
      },
    });
    if (!sw || sw.status === 'Discontinued') return;
    const effective = sw.discontinue_date ?? new Date(todayStr());
    const reasonId = await this.lookupId('software_revoke_reason', 'Software discontinued');

    await this.prisma.$transaction([
      this.prisma.software_licenses.update({
        where: { software_id: softwareId },
        data: { status: 'Discontinued', updated_by: by ?? undefined, updated_at: new Date() },
      }),
      this.prisma.software_license_assignments.updateMany({
        where: { software_id: softwareId, status: 'Active' },
        data: {
          status: 'Revoked',
          revoked_on: effective,
          revoked_by: by,
          revoke_reason_id: reasonId,
          revoke_remarks: 'Software discontinued',
          is_flagged_to_recover: false,
          updated_at: new Date(),
        },
      }),
    ]);

    await this.logActivity(
      softwareId,
      'SOFTWARE_DISCONTINUED',
      `Discontinued ${sw.software_name} on ${fmtDate(toDateStr(effective)!)}: ${sw.software_license_discontinue_reasons?.label || 'no reason'}`,
      {
        discontinue_date: toDateStr(effective),
        reason: sw.software_license_discontinue_reasons?.label || null,
        remarks: sw.discontinue_remarks,
        replaced_by_software_id: sw.replaced_by_software_id,
        seats_ended: sw.software_license_assignments.length,
      },
      by ?? undefined,
    );
    await this.notify(
      sw.software_license_assignments.map((a) => a.emp_id).concat(sw.software_owner_id, ...(await this.notifier.accountsIds())),
      'license_discontinued',
      `${sw.software_name} is discontinued`,
      `${sw.software_name} (${sw.software_code}) is no longer used from ${fmtDate(toDateStr(effective)!)}. Any seat on it has ended.`,
      softwareId,
      by,
      true,
    );
  }

  // ---------------------------------------------------------------------------
  // 9. EMPLOYEE SELF SERVICE: MY SOFTWARE
  // ---------------------------------------------------------------------------
  async getMySoftware(empId: number) {
    // Revoked seats stay on the list as "Ended" for 12 months, then only in the History (BFD 9).
    const yearAgo = new Date(Date.now() - 365 * 86_400_000);
    const assignments = await this.prisma.software_license_assignments.findMany({
      where: {
        emp_id: empId,
        OR: [{ status: 'Active' }, { status: 'Revoked', revoked_on: { gte: yearAgo } }],
      },
      include: {
        software_licenses: {
          include: {
            software_license_categories: true,
            software_license_vendors: true,
            employees_software_licenses_software_owner_idToemployees: {
              select: { emp_id: true, name: true, email: true },
            },
            software_license_terms: {
              orderBy: { term_number: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { assigned_from: 'desc' },
    });

    return assignments.map((a) => {
      const sw = a.software_licenses;
      const latestTerm = sw.software_license_terms[0] || null;

      return {
        assignment_id: a.assignment_id,
        software_id: sw.software_id,
        software_code: sw.software_code,
        software_name: sw.software_name,
        category: sw.software_license_categories?.name,
        vendor: sw.software_license_vendors?.name,
        license_type: sw.license_type,
        login_account_id: a.login_account_id,
        assignment_status: a.status === 'Active' ? 'In use' : 'Ended',
        revoked_on: a.revoked_on,
        assigned_from: a.assigned_from,
        remarks: a.remarks,
        status: sw.status,
        owner: sw.employees_software_licenses_software_owner_idToemployees,
        expiry_date: latestTerm?.expiry_date || null,
        days_remaining: latestTerm?.expiry_date
          ? Math.ceil(
              (new Date(latestTerm.expiry_date).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // 9b. MY TEAM (Reporting Manager): each team member's software, without costs or keys (BFD 9)
  // ---------------------------------------------------------------------------
  async getMyTeamSoftware(managerId: number) {
    const team = await this.prisma.employees.findMany({
      where: { reporting_manager: managerId, deleted_at: null, status: 'Active' },
      select: { emp_id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    if (!team.length) return { is_manager: false, members: [] };
    const seats = await this.prisma.software_license_assignments.findMany({
      where: { emp_id: { in: team.map((t) => t.emp_id) }, status: 'Active' },
      select: {
        emp_id: true,
        assigned_from: true,
        login_account_id: true,
        software_licenses: { select: { software_id: true, software_code: true, software_name: true, status: true, software_license_vendors: { select: { name: true } } } },
      },
      orderBy: { assigned_from: 'desc' },
    });
    return {
      is_manager: true,
      members: team.map((t) => ({
        emp_id: t.emp_id,
        name: t.name,
        email: t.email,
        software: seats
          .filter((s) => s.emp_id === t.emp_id)
          .map((s) => ({
            software_id: s.software_licenses.software_id,
            software_code: s.software_licenses.software_code,
            software_name: s.software_licenses.software_name,
            vendor: s.software_licenses.software_license_vendors?.name,
            status: s.software_licenses.status,
            login_account_id: s.login_account_id,
            assigned_from: toDateStr(s.assigned_from),
          })),
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // 10. RECOVERY BANNER: LICENSES TO RECOVER
  // ---------------------------------------------------------------------------
  async getLicensesToRecover(scope: { ownerId?: number } = {}) {
    const items = await this.prisma.software_license_assignments.findMany({
      where: {
        status: 'Active',
        is_flagged_to_recover: true,
        ...(scope.ownerId ? { software_licenses: { software_owner_id: scope.ownerId } } : {}),
      },
      include: {
        software_licenses: {
          select: {
            software_id: true,
            software_code: true,
            software_name: true,
            software_license_vendors: { select: { name: true } },
          },
        },
        employees_software_license_assignments_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            status: true,
            departments_employees_dep_idTodepartments: { select: { dep_id: true, name: true } },
          },
        },
      },
      orderBy: { flagged_at: 'desc' },
    });

    return items.map((i) => ({
      assignment_id: i.assignment_id,
      software_id: i.software_licenses.software_id,
      software_code: i.software_licenses.software_code,
      software_name: i.software_licenses.software_name,
      vendor: i.software_licenses.software_license_vendors?.name,
      login_account_id: i.login_account_id,
      assigned_from: i.assigned_from,
      flagged_at: i.flagged_at,
      employee: {
        emp_id: i.employees_software_license_assignments_emp_idToemployees.emp_id,
        name: i.employees_software_license_assignments_emp_idToemployees.name,
        email: i.employees_software_license_assignments_emp_idToemployees.email,
        status: i.employees_software_license_assignments_emp_idToemployees.status,
        department: i.employees_software_license_assignments_emp_idToemployees.departments_employees_dep_idTodepartments?.name,
      },
    }));
  }

  // ---------------------------------------------------------------------------
  // 10b. REMINDERS (BFD 7 Part 1, 6 Part 3, 14). Each one is sent once, so the hourly job is safe.
  // ---------------------------------------------------------------------------
  async sendReminders() {
    const settings = await this.settingsService.getSettings();
    const days: number[] = [...(settings.reminder_days?.length ? settings.reminder_days : [30, 15, 7, 1])].sort((a, b) => a - b);
    const today = todayStr();
    const isMonday = new Date(`${today}T00:00:00Z`).getUTCDay() === 1;
    const [admins, managers, accounts] = await Promise.all([this.notifier.adminIds(), this.notifier.managerIds(), this.notifier.accountsIds()]);

    const software = await this.prisma.software_licenses.findMany({
      where: { status: { in: ['Active', 'Expiring Soon', 'Expired', 'Trial'] } },
      include: {
        software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 },
        software_license_assignments: { where: { status: 'Active' }, select: { assignment_id: true } },
      },
    });

    for (const sw of software) {
      const term = sw.software_license_terms[0];
      const expiry = toDateStr(term?.expiry_date);
      if (!term || !expiry) continue; // Perpetual and Free never expire
      // Renewed early: the latest term starts later, so no reminder until it is the current one.
      if (toDateStr(term.start_date)! > today) continue;
      const left = daysBetween(today, expiry);
      const paid = Number(term.cost) > 0;
      const used = sw.software_license_assignments.length;
      const seatsText = sw.total_seats !== null ? `${used} of ${sw.total_seats} seats used, ${Math.max(0, sw.total_seats - used)} free` : `${used} seats assigned`;

      if (left >= 0) {
        // 30, 15, 7 and 1 day before (from Settings): only the nearest step, so a late start does not send them all.
        const step = days.find((d) => left <= d);
        if (step !== undefined && left <= (settings.reminder_window_days ?? 30)) {
          await this.notifier.notifyOnce({
            recipients: [sw.software_owner_id, ...managers, ...admins, ...(settings.remind_accounts && paid ? accounts : [])],
            kind: 'license_expiry_reminder',
            title: `${sw.software_name} expires in ${left} day${left === 1 ? '' : 's'}`,
            body: `${sw.software_code} ${sw.software_name} expires on ${fmtDate(expiry)}. ${seatsText}. Renew it or discontinue it.`,
            email: true,
            softwareId: sw.software_id,
            dedupeKey: `exp-${expiry}-${step}`,
          });
        }
        if (sw.license_type === 'Trial' && left <= 3) {
          await this.notifier.notifyOnce({
            recipients: [sw.software_owner_id, ...managers],
            kind: 'license_trial_ending',
            title: `Trial of ${sw.software_name} ends in ${left} day${left === 1 ? '' : 's'}`,
            body: `The trial of ${sw.software_code} ${sw.software_name} ends on ${fmtDate(expiry)}. Buy it or let it end.`,
            email: true,
            softwareId: sw.software_id,
            dedupeKey: `trial-${expiry}`,
          });
        }
      } else {
        // Expired: the day after, then every Monday until renewed or discontinued.
        const key = isMonday ? `expired-${expiry}-week-${today}` : `expired-${expiry}`;
        await this.notifier.notifyOnce({
          recipients: [sw.software_owner_id, ...managers, ...admins],
          kind: 'license_expired',
          title: `${sw.software_name} has expired`,
          body: `${sw.software_code} ${sw.software_name} expired on ${fmtDate(expiry)}. Record the renewal or discontinue it.`,
          email: true,
          softwareId: sw.software_id,
          dedupeKey: key,
        });
      }
    }

    // A seat to recover still open after N days -> the Admin (in-app).
    const recoverAfter = settings.recovery_reminder_days ?? 3;
    const cutoff = new Date(Date.now() - recoverAfter * 86_400_000);
    const open = await this.prisma.software_license_assignments.findMany({
      where: { status: 'Active', is_flagged_to_recover: true, flagged_at: { lte: cutoff } },
      select: {
        assignment_id: true,
        software_id: true,
        employees_software_license_assignments_emp_idToemployees: { select: { name: true } },
        software_licenses: { select: { software_name: true, software_code: true } },
      },
    });
    for (const a of open) {
      const who = a.employees_software_license_assignments_emp_idToemployees?.name || 'A deactivated employee';
      await this.notifier.notifyOnce({
        recipients: admins,
        kind: 'license_recover_overdue',
        title: `Seat still not recovered: ${a.software_licenses.software_name}`,
        body: `${who} still holds ${a.software_licenses.software_code} ${a.software_licenses.software_name} ${recoverAfter} days after deactivation.`,
        softwareId: a.software_id,
        dedupeKey: `recover-${a.assignment_id}`,
      });
    }

    // Every Monday: renewals due in the next 30 days -> Admin, License Managers, Accounts.
    if (isMonday && settings.weekly_renewal_summary !== false) {
      const due = software
        .map((sw) => ({ sw, expiry: toDateStr(sw.software_license_terms[0]?.expiry_date) }))
        .filter((x) => x.expiry && x.expiry >= today && daysBetween(today, x.expiry) <= 30)
        .sort((a, b) => a.expiry!.localeCompare(b.expiry!));
      if (due.length) {
        const list = due.slice(0, 6).map((x) => `${x.sw.software_name} (${fmtDate(x.expiry!)})`).join(', ');
        await this.notifier.notifyOnce({
          recipients: [...admins, ...managers, ...accounts],
          kind: 'license_weekly_summary',
          title: `${due.length} renewal${due.length === 1 ? '' : 's'} due in the next 30 days`,
          body: `${list}${due.length > 6 ? ` and ${due.length - 6} more` : ''}.`,
          email: true,
          softwareId: null,
          dedupeKey: `summary-${today}`,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 11. NIGHTLY/ON-DEMAND STATUS SYNC & RECOVERY DETECTION
  // ---------------------------------------------------------------------------
  async syncStatusesAndRecovery() {
    const settings = await this.settingsService.getSettings();
    const reminderWindow = settings.reminder_window_days ?? 30;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Update Expiring Soon / Expired licenses
    const allSoftware = await this.prisma.software_licenses.findMany({
      where: {
        status: { in: ['Active', 'Expiring Soon', 'Trial'] },
      },
      include: {
        software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 },
      },
    });

    for (const sw of allSoftware) {
      const latest = sw.software_license_terms[0];
      if (!latest || !latest.expiry_date) continue;

      const expDate = new Date(latest.expiry_date);
      expDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let targetStatus = sw.status;

      if (diffDays < 0) {
        targetStatus = 'Expired';
      } else if (diffDays <= reminderWindow) {
        targetStatus = 'Expiring Soon';
      } else if (sw.license_type === 'Trial') {
        targetStatus = 'Trial';
      } else {
        targetStatus = 'Active';
      }

      if (targetStatus !== sw.status) {
        await this.prisma.software_licenses.update({
          where: { software_id: sw.software_id },
          data: { status: targetStatus, updated_at: new Date() },
        });
        // Written by "System" (no performer) - BFD 8.
        await this.logActivity(sw.software_id, 'STATUS_CHANGED', `Status changed from ${sw.status} to ${targetStatus}`,
          { from: sw.status, to: targetStatus, on: todayStr() });
      }
    }

    // 2. Scan active assignments held by non-active employees
    const inactiveEmpAssignments = await this.prisma.software_license_assignments.findMany({
      where: {
        status: 'Active',
        is_flagged_to_recover: false,
        employees_software_license_assignments_emp_idToemployees: {
          status: 'Inactive',
        },
      },
      select: {
        assignment_id: true,
        software_id: true,
        login_account_id: true,
        employees_software_license_assignments_emp_idToemployees: { select: { name: true } },
        software_licenses: { select: { software_name: true, software_code: true, software_owner_id: true } },
      },
    });

    if (inactiveEmpAssignments.length > 0) {
      // An employee with seats is deactivated -> Software Owner and License Managers (in-app and email).
      const managers = await this.notifier.managerIds();
      for (const a of inactiveEmpAssignments) {
        const who = a.employees_software_license_assignments_emp_idToemployees?.name || 'An employee';
        await this.logActivity(a.software_id, 'FLAGGED_TO_RECOVER', `${who} is deactivated: seat to recover`, { assignment_id: a.assignment_id, on: todayStr() });
        await this.notify(
          [a.software_licenses.software_owner_id, ...managers],
          'license_seat_to_recover',
          `Recover ${a.software_licenses.software_name} from ${who}`,
          `${who} is deactivated but still holds ${a.software_licenses.software_code} ${a.software_licenses.software_name}${a.login_account_id ? ` (${a.login_account_id})` : ''}. Remove access in the vendor portal, then Revoke.`,
          a.software_id,
          null,
          true,
        );
      }
      await this.prisma.software_license_assignments.updateMany({
        where: {
          assignment_id: { in: inactiveEmpAssignments.map((a) => a.assignment_id) },
        },
        data: {
          is_flagged_to_recover: true,
          flagged_at: new Date(),
        },
      });
    }

    // 3. Discontinuations whose Effective Date has come (BFD 7 Part 3)
    const due = await this.prisma.software_licenses.findMany({
      where: { status: { not: 'Discontinued' }, discontinue_date: { lte: new Date(todayStr()) } },
      select: { software_id: true, updated_by: true },
    });
    for (const d of due) await this.applyDiscontinue(d.software_id, null);

    // 4. Software Owner left or deactivated: ownership moves to the Admin, who is told (BFD 15)
    const orphaned = await this.prisma.software_licenses.findMany({
      where: {
        status: { not: 'Discontinued' },
        employees_software_licenses_software_owner_idToemployees: {
          OR: [{ status: { not: 'Active' } }, { deleted_at: { not: null } }],
        },
      },
      select: {
        software_id: true,
        software_code: true,
        software_name: true,
        software_owner_id: true,
        employees_software_licenses_software_owner_idToemployees: { select: { name: true } },
      },
    });
    let ownersMoved = 0;
    if (orphaned.length) {
      const admins = await this.adminIds();
      const newOwner = admins[0];
      if (newOwner) {
        for (const sw of orphaned) {
          if (sw.software_owner_id === newOwner) continue;
          await this.prisma.software_licenses.update({
            where: { software_id: sw.software_id },
            data: { software_owner_id: newOwner, updated_at: new Date() },
          });
          const oldName = sw.employees_software_licenses_software_owner_idToemployees?.name || `Emp #${sw.software_owner_id}`;
          await this.logActivity(
            sw.software_id,
            'OWNER_CHANGED',
            `Software Owner ${oldName} is no longer active; ownership moved to the Admin`,
            { old_owner_id: sw.software_owner_id, new_owner_id: newOwner, by_system: true },
          );
          await this.notify(
            admins,
            'license_owner_moved',
            `New owner needed: ${sw.software_name}`,
            `${oldName}, the Software Owner of ${sw.software_code} ${sw.software_name}, is no longer active. Ownership moved to the Admin. Please name a new owner.`,
            sw.software_id,
          );
          ownersMoved += 1;
        }
      }
    }

    await this.sendReminders();

    return {
      syncedSoftwareCount: allSoftware.length,
      flaggedAssignmentsCount: inactiveEmpAssignments.length,
      discontinuedCount: due.length,
      ownersMoved,
    };
  }
}
