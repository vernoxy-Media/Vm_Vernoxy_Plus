import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SalesRights, SalesRightsRepositoryPort, SalesUserRights } from '../../application/ports/sales-rights.repository.port';

const SALES_OR_ADMIN = {
  deleted_at: null,
  status: 'Active' as const,
  OR: [
    { roles_employees_role_idToroles: { is_admin: true } },
    { departments_employees_dep_idTodepartments: { name: { startsWith: 'Sales', mode: 'insensitive' as const } } },
  ],
};

@Injectable()
export class PrismaSalesRightsRepository implements SalesRightsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async get(empId: number): Promise<SalesRights> {
    const r = await this.prisma.sales_user_rights.findUnique({ where: { emp_id: empId }, select: { can_import: true, can_export: true } });
    return { can_import: r?.can_import === true, can_export: r?.can_export === true };
  }

  async listUsers(): Promise<SalesUserRights[]> {
    const users = await this.prisma.employees.findMany({
      where: SALES_OR_ADMIN,
      orderBy: { name: 'asc' },
      select: { emp_id: true, name: true, roles_employees_role_idToroles: { select: { is_admin: true } } },
    });
    const rights = await this.prisma.sales_user_rights.findMany({ where: { emp_id: { in: users.map((u) => u.emp_id) } } });
    const by = new Map(rights.map((r) => [r.emp_id, r]));
    return users.map((u) => {
      const isAdmin = u.roles_employees_role_idToroles?.is_admin === true;
      const r = by.get(u.emp_id);
      return { emp_id: u.emp_id, name: u.name, is_admin: isAdmin, can_import: isAdmin || r?.can_import === true, can_export: isAdmin || r?.can_export === true };
    });
  }

  async set(empId: number, rights: Partial<SalesRights>, actorEmpId: number): Promise<SalesUserRights | null> {
    const emp = await this.prisma.employees.findFirst({ where: { emp_id: empId, ...SALES_OR_ADMIN }, select: { emp_id: true } });
    if (!emp) return null;
    await this.prisma.sales_user_rights.upsert({
      where: { emp_id: empId },
      create: { emp_id: empId, can_import: rights.can_import === true, can_export: rights.can_export === true, created_by: actorEmpId },
      update: {
        ...(rights.can_import !== undefined ? { can_import: rights.can_import } : {}),
        ...(rights.can_export !== undefined ? { can_export: rights.can_export } : {}),
        updated_at: new Date(),
        updated_by: actorEmpId,
      },
    });
    return (await this.listUsers()).find((u) => u.emp_id === empId) ?? null;
  }
}
