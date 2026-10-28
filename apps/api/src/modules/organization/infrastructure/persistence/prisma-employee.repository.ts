import { Injectable, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  EmployeeRepositoryPort,
  EmployeeListFilter,
} from '../../application/ports/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';
import {
  parseLimit,
  encodeCursor,
  decodeCursor,
} from '../../../../core/pagination/keyset-pagination';
import { PrismaClient, Prisma, employee_status } from '@prisma/client';
import { ConflictDomainError } from '../../domain/errors/organization.errors';
import { FileStoragePort, STORAGE_TOKENS } from '../../../storage/public-api';

@Injectable()
export class PrismaEmployeeRepository implements EmployeeRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(STORAGE_TOKENS.FileStoragePort)
    private readonly storage?: FileStoragePort,
  ) {}

  private getClient(tx?: unknown): PrismaClient {
    return (tx as PrismaClient) || this.prisma;
  }

  private getEmployeeIncludes() {
    return {
      departments_employees_dep_idTodepartments: {
        select: { dep_id: true, name: true },
      },
      roles_employees_role_idToroles: {
        select: { role_id: true, role_name: true },
      },
      employees_employees_reporting_managerToemployees: {
        select: { emp_id: true, name: true },
      },
      employee_departments_employee_departments_emp_idToemployees: {
        include: {
          departments: {
            select: { dep_id: true, name: true },
          },
        },
      },
      master_lookup_employees_gender_idTomaster_lookup: {
        select: { lookup_id: true, code: true, label: true },
      },
      master_lookup_employees_employment_type_idTomaster_lookup: {
        select: { lookup_id: true, code: true, label: true },
      },
      employee_pay_policies_employee_pay_policies_emp_idToemployees: true,
    };
  }

  private mapToEntity(record: any): Employee {
    const rawDepartments = record.employee_departments_employee_departments_emp_idToemployees || [];
    const departments = rawDepartments.map((ed: any) => ({
      dep_id: ed.dep_id,
      name: ed.departments?.name || '',
      is_primary: Boolean(ed.is_primary),
    }));

    return {
      emp_id: record.emp_id,
      name: record.name,
      email: record.email,
      mob: record.mob,
      dep_id: record.dep_id,
      role_id: record.role_id,
      reporting_manager: record.reporting_manager,
      profile_picture: record.profile_picture ?? null,
      profile_picture_url:
        record.profile_picture && this.storage
          ? this.storage.getSignedUrl(record.profile_picture)
          : null,
      status: record.status as 'Active' | 'Inactive',
      joining_date: record.joining_date,
      exit_date: record.exit_date,
      created_at: record.created_at,
      created_by: record.created_by,
      updated_at: record.updated_at,
      updated_by: record.updated_by,
      deleted_at: record.deleted_at,
      deleted_by: record.deleted_by,
      department: record.departments_employees_dep_idTodepartments
        ? {
            dep_id: record.departments_employees_dep_idTodepartments.dep_id,
            name: record.departments_employees_dep_idTodepartments.name,
          }
        : undefined,
      departments: departments.length > 0 ? departments : (record.departments_employees_dep_idTodepartments ? [{
        dep_id: record.departments_employees_dep_idTodepartments.dep_id,
        name: record.departments_employees_dep_idTodepartments.name,
        is_primary: true,
      }] : []),
      role: record.roles_employees_role_idToroles
        ? {
            role_id: record.roles_employees_role_idToroles.role_id,
            role_name: record.roles_employees_role_idToroles.role_name,
          }
        : undefined,
      manager: record.employees_employees_reporting_managerToemployees
        ? {
            emp_id: record.employees_employees_reporting_managerToemployees.emp_id,
            name: record.employees_employees_reporting_managerToemployees.name,
          }
        : null,
      gender_id: record.gender_id ?? null,
      gender: record.master_lookup_employees_gender_idTomaster_lookup
        ? {
            lookup_id: record.master_lookup_employees_gender_idTomaster_lookup.lookup_id,
            code: record.master_lookup_employees_gender_idTomaster_lookup.code,
            label: record.master_lookup_employees_gender_idTomaster_lookup.label,
          }
        : null,
      personal_email: record.personal_email ?? null,
      office_email: record.office_email ?? record.email ?? null,
      birth_date: record.birth_date ?? null,
      blood_group: record.blood_group ?? null,
      address: record.address ?? null,
      emergency_contact_name: record.emergency_contact_name ?? null,
      emergency_contact_number: record.emergency_contact_number ?? null,
      emergency_contact_relation: record.emergency_contact_relation ?? null,
      employment_type_id: record.employment_type_id ?? null,
      employment_type: record.master_lookup_employees_employment_type_idTomaster_lookup
        ? {
            lookup_id: record.master_lookup_employees_employment_type_idTomaster_lookup.lookup_id,
            code: record.master_lookup_employees_employment_type_idTomaster_lookup.code,
            label: record.master_lookup_employees_employment_type_idTomaster_lookup.label,
          }
        : null,
      salary: record.salary !== null && record.salary !== undefined ? Number(record.salary) : 0,
      pf: record.pf !== null && record.pf !== undefined ? Number(record.pf) : 0,
      termination_date: record.termination_date ?? null,
      deactivation_reason: record.deactivation_reason ?? null,
      deactivation_notes: record.deactivation_notes ?? null,
      deactivated_at: record.deactivated_at ?? null,
      deactivated_by: record.deactivated_by ?? null,
      pay_policy: (() => {
        const pp = record.employee_pay_policies_employee_pay_policies_emp_idToemployees;
        if (!pp) return null;
        return {
          salary_effective_from: pp.salary_effective_from ?? null,
          pf_applicable: Boolean(pp.pf_applicable),
          uan: pp.uan ?? null,
          employee_pf_pct: Number(pp.employee_pf_pct ?? 12),
          employer_pf_pct: Number(pp.employer_pf_pct ?? 12),
          ot_eligible: Boolean(pp.ot_eligible),
          ot_rate_type: pp.ot_rate_type ?? null,
          ot_rate: pp.ot_rate !== null && pp.ot_rate !== undefined ? Number(pp.ot_rate) : null,
          ot_multiplier: pp.ot_multiplier !== null && pp.ot_multiplier !== undefined ? Number(pp.ot_multiplier) : null,
          minimum_ot_per_day: Number(pp.minimum_ot_per_day ?? 0),
          ot_paid_as: pp.ot_paid_as ?? 'SALARY',
          payment_mode: pp.payment_mode ?? null,
          bank_name: pp.bank_name ?? null,
          account_number: pp.account_number ?? null,
          ifsc_code: pp.ifsc_code ?? null,
        };
      })(),
      ot_eligible: Boolean(record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.ot_eligible),
      ot_rate_type: record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.ot_rate_type ?? null,
      ot_rate: record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.ot_rate !== null && record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.ot_rate !== undefined ? Number(record.employee_pay_policies_employee_pay_policies_emp_idToemployees.ot_rate) : null,
      ot_multiplier: record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.ot_multiplier !== null && record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.ot_multiplier !== undefined ? Number(record.employee_pay_policies_employee_pay_policies_emp_idToemployees.ot_multiplier) : null,
      minimum_ot_per_day: Number(record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.minimum_ot_per_day ?? 0),
      ot_paid_as: record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.ot_paid_as ?? 'SALARY',
      pf_applicable: record.employee_pay_policies_employee_pay_policies_emp_idToemployees ? Boolean(record.employee_pay_policies_employee_pay_policies_emp_idToemployees.pf_applicable) : (Number(record.pf) > 0),
      uan: record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.uan ?? null,
      employee_pf_pct: Number(record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.employee_pf_pct ?? 12),
      employer_pf_pct: Number(record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.employer_pf_pct ?? 12),
      payment_mode: record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.payment_mode ?? null,
      bank_name: record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.bank_name ?? null,
      account_number: record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.account_number ?? null,
      ifsc_code: record.employee_pay_policies_employee_pay_policies_emp_idToemployees?.ifsc_code ?? null,
    };
  }

  async findMany(
    filter: EmployeeListFilter,
    tx?: unknown,
  ): Promise<{ items: Employee[]; next_cursor: string | null; stats?: { total: number; active: number; inactive: number } }> {
    const client = this.getClient(tx);
    const limit = parseLimit(filter.limit);

    const where: any = {
      deleted_at: null,
    };

    if (filter.dep_id) {
      where.OR = [
        { dep_id: filter.dep_id },
        {
          employee_departments_employee_departments_emp_idToemployees: {
            some: { dep_id: filter.dep_id },
          },
        },
      ];
    }

    if (filter.role_id) {
      where.role_id = filter.role_id;
    }

    if (filter.status) {
      where.status = filter.status as employee_status;
    }

    if (filter.q) {
      const qClean = filter.q.trim();
      const orConditions: any[] = [
        { name: { contains: qClean, mode: 'insensitive' } },
        { email: { contains: qClean, mode: 'insensitive' } },
        { mob: { contains: qClean, mode: 'insensitive' } },
      ];

      const empIdMatch = qClean.match(/^(?:emp-?)?0*(\d+)$/i);
      if (empIdMatch && empIdMatch[1]) {
        const idNum = parseInt(empIdMatch[1], 10);
        if (!isNaN(idNum)) {
          orConditions.push({ emp_id: idNum });
        }
      }

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: orConditions },
        ];
        delete where.OR;
      } else {
        where.OR = orConditions;
      }
    }

    const decoded = decodeCursor<{ id: number }>(filter.cursor);
    if (decoded?.id) {
      where.emp_id = { gt: decoded.id };
    }

    const [records, total_count, active_count, inactive_count] = await Promise.all([
      client.employees.findMany({
        where,
        take: limit + 1,
        orderBy: { emp_id: 'asc' },
        include: this.getEmployeeIncludes(),
      }),
      client.employees.count({ where: { deleted_at: null } }),
      client.employees.count({ where: { deleted_at: null, status: 'Active' } }),
      client.employees.count({ where: { deleted_at: null, status: 'Inactive' } }),
    ]);

    const hasNext = records.length > limit;
    const rawItems = hasNext ? records.slice(0, limit) : records;
    const items = rawItems.map((r) => this.mapToEntity(r));

    // Calculate document pending counts for items
    const empIds = items.map((e) => e.emp_id);
    if (empIds.length > 0) {
      try {
        const docCounts = await (client as any).$queryRaw<
          Array<{ emp_id: number; pending_count: bigint | number }>
        >`
          SELECT emp_id,
                 COUNT(*) FILTER (WHERE is_ticked = TRUE AND status = 'file_pending') as pending_count
          FROM employee_documents
          WHERE emp_id IN (${Prisma.join(empIds)})
          GROUP BY emp_id
        `;
        const pendingMap = new Map<number, number>();
        for (const dc of docCounts) {
          pendingMap.set(dc.emp_id, Number(dc.pending_count));
        }
        for (const item of items) {
          item.employee_code = `EMP-${String(item.emp_id).padStart(4, '0')}`;
          item.pending_documents_count = pendingMap.get(item.emp_id) ?? 0;
        }
      } catch (err) {
        for (const item of items) {
          item.employee_code = `EMP-${String(item.emp_id).padStart(4, '0')}`;
          item.pending_documents_count = 0;
        }
      }
    }

    const lastItem = items[items.length - 1];
    const next_cursor = hasNext && lastItem ? encodeCursor({ id: lastItem.emp_id }) : null;

    return {
      items,
      next_cursor,
      stats: {
        total: total_count,
        active: active_count,
        inactive: inactive_count,
      },
    };
  }

  async findActiveOptions(
    q?: string,
    tx?: unknown,
  ): Promise<Array<{ emp_id: number; name: string; email: string }>> {
    const client = this.getClient(tx);
    const where: any = {
      deleted_at: null,
      status: 'Active',
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    return client.employees.findMany({
      where,
      select: {
        emp_id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: number, tx?: unknown): Promise<Employee | null> {
    const client = this.getClient(tx);
    const record = await client.employees.findFirst({
      where: {
        emp_id: id,
        deleted_at: null,
      },
      include: this.getEmployeeIncludes(),
    });

    return record ? this.mapToEntity(record) : null;
  }

  async findByEmail(email: string, tx?: unknown): Promise<Employee | null> {
    const client = this.getClient(tx);
    const record = await client.employees.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        deleted_at: null,
      },
      include: this.getEmployeeIncludes(),
    });

    return record ? this.mapToEntity(record) : null;
  }

  async findByMobile(mobile: string, tx?: unknown): Promise<Employee | null> {
    const client = this.getClient(tx);
    const record = await client.employees.findFirst({
      where: {
        mob: mobile,
        deleted_at: null,
      },
      include: this.getEmployeeIncludes(),
    });

    return record ? this.mapToEntity(record) : null;
  }

  async create(
    data: {
      name: string;
      email: string;
      mob: string;
      dep_id: number;
      department_ids?: number[];
      role_id?: number | null;
      reporting_manager?: number | null;
      joining_date: Date;
      gender_id?: number | null;
      personal_email?: string | null;
      office_email?: string | null;
      birth_date?: Date | null;
      blood_group?: string | null;
      address?: string | null;
      emergency_contact_name?: string | null;
      emergency_contact_number?: string | null;
      emergency_contact_relation?: string | null;
      employment_type_id?: number | null;
      salary?: number;
      pf?: number;
      ot_eligible?: boolean;
      ot_rate_type?: 'FIXED' | 'MULTIPLIER' | null;
      ot_rate?: number | null;
      ot_multiplier?: number | null;
      minimum_ot_per_day?: number;
      ot_paid_as?: 'SALARY' | 'COMP_OFF';
      pf_applicable?: boolean;
      uan?: string | null;
      employee_pf_pct?: number;
      employer_pf_pct?: number;
      payment_mode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | null;
      bank_name?: string | null;
      account_number?: string | null;
      ifsc_code?: string | null;
      created_by: number;
    },
    tx?: unknown,
  ): Promise<Employee> {
    const client = this.getClient(tx);
    const created = await client.employees.create({
      data: {
        name: data.name,
        email: data.email,
        mob: data.mob,
        dep_id: data.dep_id,
        role_id: data.role_id ?? null,
        reporting_manager: data.reporting_manager || null,
        joining_date: data.joining_date,
        gender_id: data.gender_id ?? null,
        personal_email: data.personal_email ?? null,
        office_email: data.office_email ?? data.email,
        birth_date: data.birth_date ?? null,
        blood_group: data.blood_group ?? null,
        address: data.address ?? null,
        emergency_contact_name: data.emergency_contact_name ?? null,
        emergency_contact_number: data.emergency_contact_number ?? null,
        emergency_contact_relation: data.emergency_contact_relation ?? null,
        employment_type_id: data.employment_type_id ?? null,
        salary: data.salary ?? 0,
        pf: data.pf ?? 0,
        created_by: data.created_by,
        status: 'Active',
      },
      include: this.getEmployeeIncludes(),
    });

    // Sync employee_departments junction table
    const allDepIds = Array.from(new Set([data.dep_id, ...(data.department_ids || [])]));
    for (const dId of allDepIds) {
      await client.employee_departments.upsert({
        where: {
          emp_id_dep_id: { emp_id: created.emp_id, dep_id: dId },
        },
        create: {
          emp_id: created.emp_id,
          dep_id: dId,
          is_primary: dId === data.dep_id,
          created_by: data.created_by,
        },
        update: {
          is_primary: dId === data.dep_id,
        },
      });
    }

    // Provision or sync employee_pay_policies
    await client.employee_pay_policies.upsert({
      where: { emp_id: created.emp_id },
      create: {
        emp_id: created.emp_id,
        salary_effective_from: data.joining_date,
        pf_applicable: data.pf_applicable ?? (Number(data.pf) > 0),
        uan: data.uan ?? null,
        employee_pf_pct: data.employee_pf_pct ?? 12.00,
        employer_pf_pct: data.employer_pf_pct ?? 12.00,
        ot_eligible: data.ot_eligible ?? false,
        ot_rate_type: (data.ot_rate_type as any) ?? null,
        ot_rate: data.ot_rate ?? null,
        ot_multiplier: data.ot_multiplier ?? null,
        minimum_ot_per_day: data.minimum_ot_per_day ?? 0,
        ot_paid_as: (data.ot_paid_as as any) ?? 'SALARY',
        payment_mode: (data.payment_mode as any) ?? null,
        bank_name: data.bank_name ?? null,
        account_number: data.account_number ?? null,
        ifsc_code: data.ifsc_code ?? null,
        created_by: data.created_by,
      },
      update: {
        salary_effective_from: data.joining_date,
        pf_applicable: data.pf_applicable ?? (Number(data.pf) > 0),
        uan: data.uan ?? null,
        employee_pf_pct: data.employee_pf_pct ?? 12.00,
        employer_pf_pct: data.employer_pf_pct ?? 12.00,
        ot_eligible: data.ot_eligible ?? false,
        ot_rate_type: (data.ot_rate_type as any) ?? null,
        ot_rate: data.ot_rate ?? null,
        ot_multiplier: data.ot_multiplier ?? null,
        minimum_ot_per_day: data.minimum_ot_per_day ?? 0,
        ot_paid_as: (data.ot_paid_as as any) ?? 'SALARY',
        payment_mode: (data.payment_mode as any) ?? null,
        bank_name: data.bank_name ?? null,
        account_number: data.account_number ?? null,
        ifsc_code: data.ifsc_code ?? null,
        updated_by: data.created_by,
      },
    });

    // Refresh created with updated departments
    const refreshed = await client.employees.findUnique({
      where: { emp_id: created.emp_id },
      include: this.getEmployeeIncludes(),
    });

    return this.mapToEntity(refreshed ?? created);
  }

  async update(
    id: number,
    data: {
      name?: string;
      email?: string;
      mob?: string;
      dep_id?: number;
      department_ids?: number[];
      role_id?: number | null;
      reporting_manager?: number | null;
      joining_date?: Date;
      exit_date?: Date | null;
      status?: 'Active' | 'Inactive';
      profile_picture?: string | null;
      gender_id?: number | null;
      personal_email?: string | null;
      office_email?: string | null;
      birth_date?: Date | null;
      blood_group?: string | null;
      address?: string | null;
      emergency_contact_name?: string | null;
      emergency_contact_number?: string | null;
      emergency_contact_relation?: string | null;
      employment_type_id?: number | null;
      salary?: number;
      pf?: number;
      ot_eligible?: boolean;
      ot_rate_type?: 'FIXED' | 'MULTIPLIER' | null;
      ot_rate?: number | null;
      ot_multiplier?: number | null;
      minimum_ot_per_day?: number;
      ot_paid_as?: 'SALARY' | 'COMP_OFF';
      pf_applicable?: boolean;
      uan?: string | null;
      employee_pf_pct?: number;
      employer_pf_pct?: number;
      payment_mode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | null;
      bank_name?: string | null;
      account_number?: string | null;
      ifsc_code?: string | null;
      termination_date?: Date | null;
      deactivation_reason?: string | null;
      deactivation_notes?: string | null;
      updated_by: number;
    },
    tx?: unknown,
  ): Promise<Employee> {
    const client = this.getClient(tx);
    const updateData: any = {
      updated_by: data.updated_by,
      updated_at: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.mob !== undefined) updateData.mob = data.mob;
    if (data.dep_id !== undefined) updateData.dep_id = data.dep_id;
    if (data.role_id !== undefined) updateData.role_id = data.role_id;
    if (data.reporting_manager !== undefined) updateData.reporting_manager = data.reporting_manager;
    if (data.joining_date !== undefined) updateData.joining_date = data.joining_date;
    if (data.exit_date !== undefined) updateData.exit_date = data.exit_date;
    if (data.status !== undefined) updateData.status = data.status as employee_status;
    if (data.profile_picture !== undefined) updateData.profile_picture = data.profile_picture;
    if (data.gender_id !== undefined) updateData.gender_id = data.gender_id;
    if (data.personal_email !== undefined) updateData.personal_email = data.personal_email;
    if (data.office_email !== undefined) updateData.office_email = data.office_email;
    if (data.birth_date !== undefined) updateData.birth_date = data.birth_date;
    if (data.blood_group !== undefined) updateData.blood_group = data.blood_group;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.emergency_contact_name !== undefined) updateData.emergency_contact_name = data.emergency_contact_name;
    if (data.emergency_contact_number !== undefined) updateData.emergency_contact_number = data.emergency_contact_number;
    if (data.emergency_contact_relation !== undefined) updateData.emergency_contact_relation = data.emergency_contact_relation;
    if (data.employment_type_id !== undefined) updateData.employment_type_id = data.employment_type_id;
    if (data.salary !== undefined) updateData.salary = data.salary;
    if (data.pf !== undefined) updateData.pf = data.pf;
    if (data.termination_date !== undefined) updateData.termination_date = data.termination_date;
    if (data.deactivation_reason !== undefined) updateData.deactivation_reason = data.deactivation_reason;
    if (data.deactivation_notes !== undefined) updateData.deactivation_notes = data.deactivation_notes;

    try {
      const updated = await client.employees.update({
        where: { emp_id: id },
        data: updateData,
        include: this.getEmployeeIncludes(),
      });

      // Synchronize employee_departments if department_ids or dep_id updated
      if (data.department_ids !== undefined || data.dep_id !== undefined) {
        const primaryDepId = data.dep_id ?? updated.dep_id;
        const targetDepIds = Array.from(new Set([primaryDepId, ...(data.department_ids || [])]));

        await client.employee_departments.deleteMany({
          where: {
            emp_id: id,
            dep_id: { notIn: targetDepIds },
          },
        });

        for (const dId of targetDepIds) {
          await client.employee_departments.upsert({
            where: {
              emp_id_dep_id: { emp_id: id, dep_id: dId },
            },
            create: {
              emp_id: id,
              dep_id: dId,
              is_primary: dId === primaryDepId,
              created_by: data.updated_by,
            },
            update: {
              is_primary: dId === primaryDepId,
            },
          });
        }
      }

      // Synchronize employee_pay_policies if any policy fields updated
      const hasPolicyUpdates =
        data.ot_eligible !== undefined ||
        data.ot_rate_type !== undefined ||
        data.ot_rate !== undefined ||
        data.ot_multiplier !== undefined ||
        data.minimum_ot_per_day !== undefined ||
        data.ot_paid_as !== undefined ||
        data.pf_applicable !== undefined ||
        data.uan !== undefined ||
        data.employee_pf_pct !== undefined ||
        data.employer_pf_pct !== undefined ||
        data.payment_mode !== undefined ||
        data.bank_name !== undefined ||
        data.account_number !== undefined ||
        data.ifsc_code !== undefined;

      if (hasPolicyUpdates) {
        const policyData: any = {
          updated_by: data.updated_by,
          updated_at: new Date(),
        };
        if (data.ot_eligible !== undefined) policyData.ot_eligible = data.ot_eligible;
        if (data.ot_rate_type !== undefined) policyData.ot_rate_type = data.ot_rate_type as any;
        if (data.ot_rate !== undefined) policyData.ot_rate = data.ot_rate;
        if (data.ot_multiplier !== undefined) policyData.ot_multiplier = data.ot_multiplier;
        if (data.minimum_ot_per_day !== undefined) policyData.minimum_ot_per_day = data.minimum_ot_per_day;
        if (data.ot_paid_as !== undefined) policyData.ot_paid_as = data.ot_paid_as as any;
        if (data.pf_applicable !== undefined) policyData.pf_applicable = data.pf_applicable;
        if (data.uan !== undefined) policyData.uan = data.uan;
        if (data.employee_pf_pct !== undefined) policyData.employee_pf_pct = data.employee_pf_pct;
        if (data.employer_pf_pct !== undefined) policyData.employer_pf_pct = data.employer_pf_pct;
        if (data.payment_mode !== undefined) policyData.payment_mode = data.payment_mode as any;
        if (data.bank_name !== undefined) policyData.bank_name = data.bank_name;
        if (data.account_number !== undefined) policyData.account_number = data.account_number;
        if (data.ifsc_code !== undefined) policyData.ifsc_code = data.ifsc_code;

        await client.employee_pay_policies.upsert({
          where: { emp_id: id },
          create: {
            emp_id: id,
            salary_effective_from: data.joining_date ?? new Date(),
            pf_applicable: data.pf_applicable ?? (Number(data.pf) > 0),
            uan: data.uan ?? null,
            employee_pf_pct: data.employee_pf_pct ?? 12.00,
            employer_pf_pct: data.employer_pf_pct ?? 12.00,
            ot_eligible: data.ot_eligible ?? false,
            ot_rate_type: (data.ot_rate_type as any) ?? null,
            ot_rate: data.ot_rate ?? null,
            ot_multiplier: data.ot_multiplier ?? null,
            minimum_ot_per_day: data.minimum_ot_per_day ?? 0,
            ot_paid_as: (data.ot_paid_as as any) ?? 'SALARY',
            payment_mode: (data.payment_mode as any) ?? null,
            bank_name: data.bank_name ?? null,
            account_number: data.account_number ?? null,
            ifsc_code: data.ifsc_code ?? null,
            created_by: data.updated_by,
          },
          update: policyData,
        });
      }

      const refreshed = await client.employees.findUnique({
        where: { emp_id: id },
        include: this.getEmployeeIncludes(),
      });

      return this.mapToEntity(refreshed ?? updated);
    } catch (err: any) {
      if (err?.message?.includes('Hierarchy cycle detected')) {
        throw new ConflictDomainError(
          'REPORTING_CYCLE_DETECTED',
          'Cycle detected in reporting hierarchy',
          'reporting_manager',
        );
      }
      if (err?.message?.includes('Cannot modify or delete last remaining active administrator')) {
        throw new ConflictDomainError(
          'LAST_ADMIN_PROTECTION',
          'Cannot modify or delete last remaining active administrator',
        );
      }
      throw err;
    }
  }

  async deactivate(
    id: number,
    data: {
      termination_date: Date;
      reason: string;
      notes?: string;
      deactivated_by: number;
    },
    tx?: unknown,
  ): Promise<Employee> {
    const client = this.getClient(tx);
    const updated = await client.employees.update({
      where: { emp_id: id },
      data: {
        status: 'Inactive',
        termination_date: data.termination_date,
        exit_date: data.termination_date,
        deactivation_reason: data.reason,
        deactivation_notes: data.notes ?? null,
        deactivated_at: new Date(),
        deactivated_by: data.deactivated_by,
        updated_at: new Date(),
        updated_by: data.deactivated_by,
      },
      include: this.getEmployeeIncludes(),
    });

    return this.mapToEntity(updated);
  }

  async getDirectReports(
    empId: number,
    tx?: unknown,
  ): Promise<Array<{ emp_id: number; name: string; email: string }>> {
    const client = this.getClient(tx);
    return client.employees.findMany({
      where: {
        reporting_manager: empId,
        deleted_at: null,
        status: 'Active',
      },
      select: {
        emp_id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getHistory(
    empId: number,
    tx?: unknown,
  ): Promise<Array<{
    history_id: number;
    emp_id: number;
    event_type: string;
    title: string;
    department_ids: number[];
    departments?: Array<{ dep_id: number; name: string }>;
    role_id: number | null;
    role?: { role_id: number; role_name: string } | null;
    manager_id: number | null;
    manager?: { emp_id: number; name: string } | null;
    employment_type: string | null;
    salary: number | null;
    effective_date: Date;
    reason: string | null;
    notes: string | null;
    created_at: Date;
    created_by: number | null;
  }>> {
    const client = this.getClient(tx);
    const rows = await client.employee_history.findMany({
      where: { emp_id: empId },
      orderBy: [{ effective_date: 'desc' }, { created_at: 'desc' }],
      include: {
        roles: {
          select: { role_id: true, role_name: true },
        },
        employees_employee_history_manager_idToemployees: {
          select: { emp_id: true, name: true },
        },
      },
    });

    const allDepIds = Array.from(new Set(rows.flatMap((r) => r.department_ids || [])));
    const deps =
      allDepIds.length > 0
        ? await client.departments.findMany({
            where: { dep_id: { in: allDepIds } },
            select: { dep_id: true, name: true },
          })
        : [];
    const depMap = new Map(deps.map((d) => [d.dep_id, d]));

    return rows.map((r) => ({
      history_id: r.history_id,
      emp_id: r.emp_id,
      event_type: r.event_type,
      title: r.title,
      department_ids: r.department_ids,
      departments: (r.department_ids || []).map((dId) => depMap.get(dId)).filter(Boolean) as any,
      role_id: r.role_id,
      role: r.roles ? { role_id: r.roles.role_id, role_name: r.roles.role_name } : null,
      manager_id: r.manager_id,
      manager: r.employees_employee_history_manager_idToemployees
        ? {
            emp_id: r.employees_employee_history_manager_idToemployees.emp_id,
            name: r.employees_employee_history_manager_idToemployees.name,
          }
        : null,
      employment_type: r.employment_type,
      salary: r.salary !== null && r.salary !== undefined ? Number(r.salary) : null,
      effective_date: r.effective_date,
      reason: r.reason,
      notes: r.notes,
      created_at: r.created_at ?? new Date(),
      created_by: r.created_by,
    }));
  }

  async addHistory(
    data: {
      emp_id: number;
      event_type: string;
      title: string;
      department_ids?: number[];
      role_id?: number | null;
      manager_id?: number | null;
      employment_type?: string | null;
      salary?: number | null;
      effective_date: Date;
      reason?: string | null;
      notes?: string | null;
      created_by?: number | null;
    },
    tx?: unknown,
  ): Promise<void> {
    const client = this.getClient(tx);
    await client.employee_history.create({
      data: {
        emp_id: data.emp_id,
        event_type: data.event_type,
        title: data.title,
        department_ids: data.department_ids ?? [],
        role_id: data.role_id ?? null,
        manager_id: data.manager_id ?? null,
        employment_type: data.employment_type ?? null,
        salary: data.salary !== undefined && data.salary !== null ? data.salary : null,
        effective_date: data.effective_date,
        reason: data.reason ?? null,
        notes: data.notes ?? null,
        created_by: data.created_by ?? null,
      },
    });
  }


  async softDelete(id: number, deleted_by: number, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.employees.update({
      where: { emp_id: id },
      data: {
        deleted_at: new Date(),
        deleted_by,
        status: 'Inactive',
        exit_date: new Date(),
      },
    });
  }

  async countActiveAdmins(excludeEmpId?: number, tx?: unknown): Promise<number> {
    const client = this.getClient(tx);
    const where: any = {
      deleted_at: null,
      status: 'Active',
      roles_employees_role_idToroles: {
        is_admin: true,
        is_active: true,
        deleted_at: null,
      },
    };

    if (excludeEmpId) {
      where.emp_id = { not: excludeEmpId };
    }

    return client.employees.count({ where });
  }

  async checkReportingCycle(
    empId: number,
    prospectiveManagerId: number,
    tx?: unknown,
  ): Promise<boolean> {
    if (empId === prospectiveManagerId) {
      return true;
    }

    const client = this.getClient(tx);
    const result = await client.$queryRaw<Array<{ is_cycle: boolean }>>`
      WITH RECURSIVE manager_chain AS (
        SELECT emp_id, reporting_manager, 1 AS depth
        FROM employees
        WHERE emp_id = ${prospectiveManagerId} AND deleted_at IS NULL
        UNION ALL
        SELECT e.emp_id, e.reporting_manager, mc.depth + 1
        FROM employees e
        INNER JOIN manager_chain mc ON e.emp_id = mc.reporting_manager
        WHERE e.deleted_at IS NULL AND mc.depth < 100
      )
      SELECT EXISTS (
        SELECT 1 FROM manager_chain WHERE emp_id = ${empId}
      ) AS is_cycle;
    `;

    return Boolean(result[0]?.is_cycle);
  }
}
