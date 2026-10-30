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
} from '../../presentation/dto/license.dto';
import { LicenseSettingsService } from './license-settings.service';

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

  // ---------------------------------------------------------------------------
  // 1. CREATE SOFTWARE LICENSE & INITIAL TERM
  // ---------------------------------------------------------------------------
  async createSoftware(dto: CreateSoftwareLicenseDto, creatorId: number) {
    let vendorId = dto.vendor_id;

    if (!vendorId && dto.vendor_name) {
      const vendor = await this.settingsService.createVendor({
        name: dto.vendor_name,
        is_active: true,
      });
      vendorId = vendor.vendor_id;
    }

    if (!vendorId) {
      throw new BadRequestException('Vendor is required (specify vendor_id or vendor_name)');
    }

    const code = await this.generateSoftwareCode();
    const settings = await this.settingsService.getSettings();
    const reminderWindow = settings.reminder_window_days ?? 30;

    // Determine status
    let status = 'Active';
    if (dto.license_type === 'Trial') {
      status = 'Trial';
    } else if (dto.expiry_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(dto.expiry_date);
      expDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        status = 'Expired';
      } else if (diffDays <= reminderWindow) {
        status = 'Expiring Soon';
      }
    }

    const normalizedType = normalizeLicenseType(dto.license_type);

    // Create software
    const software = await this.prisma.software_licenses.create({
      data: {
        software_code: code,
        software_name: dto.software_name.trim(),
        vendor_id: vendorId,
        category_id: dto.category_id,
        license_type: normalizedType,
        total_seats: dto.total_seats ?? null,
        software_owner_id: dto.software_owner_id,
        bought_from: dto.bought_from?.trim() || null,
        license_key: dto.license_key?.trim() || null,
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
    const normalizedCycle =
      normalizeBillingCycle(dto.billing_cycle) ||
      (normalizedType.startsWith('Perpetual') ? 'One-time' : 'Yearly');

    const term = await this.prisma.software_license_terms.create({
      data: {
        software_id: software.software_id,
        term_number: 1,
        billing_cycle: normalizedCycle,
        cost: dto.cost !== undefined ? dto.cost : 0,
        total_seats: dto.total_seats ?? null,
        purchase_date: dto.purchase_date ? new Date(dto.purchase_date) : new Date(dto.start_date),
        start_date: new Date(dto.start_date),
        expiry_date: dto.expiry_date ? new Date(dto.expiry_date) : null,
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

    return { ...software, initial_term: term };
  }

  // ---------------------------------------------------------------------------
  // 2. LIST SOFTWARE WITH METRICS AND FILTERING
  // ---------------------------------------------------------------------------
  async getSoftwareList(query: QuerySoftwareLicenseDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { software_name: { contains: q, mode: 'insensitive' } },
        { software_code: { contains: q, mode: 'insensitive' } },
        { software_license_vendors: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (query.category_id) {
      where.category_id = query.category_id;
    }
    if (query.vendor_id) {
      where.vendor_id = query.vendor_id;
    }
    if (query.status && query.status !== 'All') {
      where.status = query.status;
    }
    if (query.license_type && query.license_type !== 'All') {
      where.license_type = query.license_type;
    }

    const [items, totalCount] = await Promise.all([
      this.prisma.software_licenses.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ software_id: 'desc' }],
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
          software_license_assignments: {
            where: { status: 'Active' },
            select: { assignment_id: true, emp_id: true },
          },
        },
      }),
      this.prisma.software_licenses.count({ where }),
    ]);

    // Format list items
    const rows = items.map((item) => {
      const latestTerm = item.software_license_terms[0] || null;
      const assignedSeats = item.software_license_assignments.length;
      const totalSeats = item.total_seats;
      const seatUtilizationPct = totalSeats && totalSeats > 0 ? Math.round((assignedSeats / totalSeats) * 100) : null;

      return {
        software_id: item.software_id,
        software_code: item.software_code,
        software_name: item.software_name,
        category: item.software_license_categories?.name,
        category_id: item.category_id,
        vendor: item.software_license_vendors?.name,
        vendor_id: item.vendor_id,
        license_type: item.license_type,
        total_seats: item.total_seats,
        assigned_seats: assignedSeats,
        seat_utilization_pct: seatUtilizationPct,
        status: item.status,
        auto_renews: item.auto_renews,
        owner: item.employees_software_licenses_software_owner_idToemployees,
        latest_term: latestTerm
          ? {
              term_id: latestTerm.term_id,
              term_number: latestTerm.term_number,
              billing_cycle: latestTerm.billing_cycle,
              cost: Number(latestTerm.cost),
              start_date: latestTerm.start_date,
              expiry_date: latestTerm.expiry_date,
            }
          : null,
      };
    });

    // Compute Summary Counters
    const [
      activeCount,
      expiringCount,
      expiredCount,
      discontinuedCount,
      recoveryAssignmentsCount,
      allActiveTerms,
    ] = await Promise.all([
      this.prisma.software_licenses.count({ where: { status: 'Active' } }),
      this.prisma.software_licenses.count({ where: { status: 'Expiring Soon' } }),
      this.prisma.software_licenses.count({ where: { status: 'Expired' } }),
      this.prisma.software_licenses.count({ where: { status: 'Discontinued' } }),
      this.prisma.software_license_assignments.count({
        where: { is_flagged_to_recover: true, status: 'Active' },
      }),
      this.prisma.software_license_terms.findMany({
        where: {
          software_licenses: {
            status: { in: ['Active', 'Expiring Soon'] },
          },
        },
        select: {
          cost: true,
          billing_cycle: true,
        },
      }),
    ]);

    let totalMonthlySpend = 0;
    for (const term of allActiveTerms) {
      const cost = Number(term.cost || 0);
      const cycle = (term.billing_cycle || '').toLowerCase();
      if (cycle === 'monthly') {
        totalMonthlySpend += cost;
      } else if (cycle === 'quarterly') {
        totalMonthlySpend += cost / 3;
      } else if (cycle === 'half-yearly') {
        totalMonthlySpend += cost / 6;
      } else if (cycle === 'annual' || cycle === 'yearly') {
        totalMonthlySpend += cost / 12;
      } else if (cycle === 'biennial') {
        totalMonthlySpend += cost / 24;
      }
    }

    return {
      items: rows,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        activeLicenses: activeCount,
        expiringSoon: expiringCount,
        expired: expiredCount,
        discontinued: discontinuedCount,
        licensesToRecover: recoveryAssignmentsCount,
        approxMonthlySpend: Math.round(totalMonthlySpend),
        approxAnnualSpend: Math.round(totalMonthlySpend * 12),
      },
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

    return {
      ...software,
      stats: {
        total_seats: totalSeats,
        assigned_seats: assignedSeats,
        available_seats: availableSeats,
        seat_utilization_pct: seatUtilizationPct,
        active_assignments_count: assignedSeats,
        total_terms_count: software.software_license_terms.length,
        documents_count: documents.length,
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
  async updateSoftware(softwareId: number, dto: UpdateSoftwareLicenseDto, updatedBy: number) {
    const existing = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
    });
    if (!existing) {
      throw new NotFoundException(`Software with ID ${softwareId} not found`);
    }

    if (dto.total_seats !== undefined && dto.total_seats !== null) {
      const activeCount = await this.prisma.software_license_assignments.count({
        where: { software_id: softwareId, status: 'Active' },
      });
      if (dto.total_seats < activeCount) {
        throw new BadRequestException(
          `Cannot reduce total seats to ${dto.total_seats} because ${activeCount} seats are currently assigned. Revoke excess assignments first.`,
        );
      }
    }

    const updated = await this.prisma.software_licenses.update({
      where: { software_id: softwareId },
      data: {
        ...(dto.software_name && { software_name: dto.software_name.trim() }),
        ...(dto.vendor_id && { vendor_id: dto.vendor_id }),
        ...(dto.category_id && { category_id: dto.category_id }),
        ...(dto.license_type && { license_type: normalizeLicenseType(dto.license_type) }),
        ...(dto.total_seats !== undefined && { total_seats: dto.total_seats }),
        ...(dto.software_owner_id && { software_owner_id: dto.software_owner_id }),
        ...(dto.bought_from !== undefined && { bought_from: dto.bought_from?.trim() || null }),
        ...(dto.license_key !== undefined && { license_key: dto.license_key?.trim() || null }),
        ...(dto.auto_renews !== undefined && { auto_renews: dto.auto_renews }),
        updated_by: updatedBy,
        updated_at: new Date(),
      },
    });

    await this.logActivity(
      softwareId,
      'SOFTWARE_UPDATED',
      `Updated software details for ${updated.software_name}`,
      dto,
      updatedBy,
    );

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 5. ASSIGN LICENSE TO EMPLOYEES
  // ---------------------------------------------------------------------------
  async assignLicense(softwareId: number, dto: AssignLicenseDto, assignedBy: number) {
    const software = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      include: {
        software_license_assignments: { where: { status: 'Active' } },
      },
    });

    if (!software) {
      throw new NotFoundException(`Software with ID ${softwareId} not found`);
    }

    if (software.status === 'Discontinued') {
      throw new BadRequestException('Cannot assign seats for discontinued software');
    }

    if (software.status === 'Expired') {
      throw new BadRequestException('Cannot assign seats for expired software. Please renew first.');
    }

    // Capacity validation
    if (software.total_seats !== null) {
      const activeSeats = software.software_license_assignments.length;
      const requestedSeats = dto.assignments.length;
      if (activeSeats + requestedSeats > software.total_seats) {
        throw new BadRequestException(
          `Seat limit exceeded! Available seats: ${Math.max(0, software.total_seats - activeSeats)}, Requested: ${requestedSeats}`,
        );
      }
    }

    // Check existing active assignments
    const existingActiveEmpIds = new Set(
      software.software_license_assignments.map((a) => a.emp_id),
    );

    const newAssignmentsData: any[] = [];

    for (const item of dto.assignments) {
      if (existingActiveEmpIds.has(item.emp_id)) {
        throw new ConflictException(
          `Employee ID ${item.emp_id} is already actively assigned to this software`,
        );
      }

      newAssignmentsData.push({
        software_id: softwareId,
        emp_id: item.emp_id,
        login_account_id: item.login_account_id?.trim() || null,
        assigned_from: new Date(dto.assigned_from),
        assigned_by: assignedBy,
        status: 'Active',
        remarks: item.remarks?.trim() || null,
        is_flagged_to_recover: false,
      });
    }

    await this.prisma.software_license_assignments.createMany({
      data: newAssignmentsData,
    });

    await this.logActivity(
      softwareId,
      'LICENSE_ASSIGNED',
      `Assigned ${dto.assignments.length} seat(s) to employees`,
      { count: dto.assignments.length, emp_ids: dto.assignments.map((a) => a.emp_id) },
      assignedBy,
    );

    return { success: true, count: dto.assignments.length };
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

    const revokedDate = new Date(dto.revoked_on);

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

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 7. RENEW SOFTWARE LICENSE (NEW TERM)
  // ---------------------------------------------------------------------------
  async renewLicense(softwareId: number, dto: RenewLicenseDto, renewedBy: number) {
    const software = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      include: {
        software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 },
      },
    });

    if (!software) {
      throw new NotFoundException(`Software with ID ${softwareId} not found`);
    }

    if (software.status === 'Discontinued') {
      throw new BadRequestException('Cannot renew a discontinued software license');
    }

    const latestTerm = software.software_license_terms[0];
    const nextTermNumber = latestTerm ? latestTerm.term_number + 1 : 1;

    // Validate dates
    const startDate = new Date(dto.start_date);
    const expiryDate = dto.expiry_date ? new Date(dto.expiry_date) : null;

    if (expiryDate && expiryDate <= startDate) {
      throw new BadRequestException('Expiry date must be after start date');
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
        purchase_date: startDate,
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
        updated_by: renewedBy,
        updated_at: new Date(),
      },
    });

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

    return term;
  }

  // ---------------------------------------------------------------------------
  // 8. DISCONTINUE SOFTWARE
  // ---------------------------------------------------------------------------
  async discontinueSoftware(softwareId: number, dto: DiscontinueLicenseDto, discontinuedBy: number) {
    const software = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
    });

    if (!software) {
      throw new NotFoundException(`Software with ID ${softwareId} not found`);
    }

    const discontinueDate = new Date(dto.discontinue_date);

    // Update software status
    const updated = await this.prisma.software_licenses.update({
      where: { software_id: softwareId },
      data: {
        status: 'Discontinued',
        discontinue_date: discontinueDate,
        discontinue_reason_id: dto.discontinue_reason_id,
        discontinue_remarks: dto.discontinue_remarks?.trim() || null,
        replaced_by_software_id: dto.replaced_by_software_id || null,
        updated_by: discontinuedBy,
        updated_at: new Date(),
      },
    });

    // Automatically revoke active assignments with remarks
    await this.prisma.software_license_assignments.updateMany({
      where: { software_id: softwareId, status: 'Active' },
      data: {
        status: 'Revoked',
        revoked_on: discontinueDate,
        revoked_by: discontinuedBy,
        revoke_remarks: 'Software discontinued across organization',
        is_flagged_to_recover: false,
        updated_at: new Date(),
      },
    });

    await this.logActivity(
      softwareId,
      'SOFTWARE_DISCONTINUED',
      `Discontinued software license: ${software.software_name}`,
      {
        discontinue_date: dto.discontinue_date,
        reason_id: dto.discontinue_reason_id,
        replaced_by_software_id: dto.replaced_by_software_id,
      },
      discontinuedBy,
    );

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 9. EMPLOYEE SELF SERVICE: MY SOFTWARE
  // ---------------------------------------------------------------------------
  async getMySoftware(empId: number) {
    const assignments = await this.prisma.software_license_assignments.findMany({
      where: {
        emp_id: empId,
        status: 'Active',
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
        license_key: sw.license_key,
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
  // 10. RECOVERY BANNER: LICENSES TO RECOVER
  // ---------------------------------------------------------------------------
  async getLicensesToRecover() {
    const items = await this.prisma.software_license_assignments.findMany({
      where: {
        status: 'Active',
        is_flagged_to_recover: true,
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
      select: { assignment_id: true },
    });

    if (inactiveEmpAssignments.length > 0) {
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

    return {
      syncedSoftwareCount: allSoftware.length,
      flaggedAssignmentsCount: inactiveEmpAssignments.length,
    };
  }
}
