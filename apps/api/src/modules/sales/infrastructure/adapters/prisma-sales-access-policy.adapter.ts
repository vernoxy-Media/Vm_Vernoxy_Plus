import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SalesAccessPolicyPort, SalesActor } from '../../application/ports/sales-access-policy.port';

/**
 * A "Sales User" is an active employee of the Sales department; the Admin is an
 * active employee whose role is an admin role (same rule the rest of the app uses).
 */
@Injectable()
export class PrismaSalesAccessPolicyAdapter implements SalesAccessPolicyPort {
  constructor(private readonly prisma: PrismaService) {}

  async getActor(empId: number): Promise<SalesActor | null> {
    const emp = await this.prisma.employees.findUnique({
      where: { emp_id: empId },
      select: {
        status: true,
        deleted_at: true,
        roles_employees_role_idToroles: { select: { is_admin: true } },
        departments_employees_dep_idTodepartments: { select: { name: true } },
      },
    });
    if (!emp || emp.deleted_at !== null || emp.status !== 'Active') return null;

    const isAdmin = emp.roles_employees_role_idToroles?.is_admin === true;
    const dept = emp.departments_employees_dep_idTodepartments?.name ?? '';
    return {
      emp_id: empId,
      is_admin: isAdmin,
      is_sales: dept.trim().toLowerCase().startsWith('sales'),
    };
  }
}
