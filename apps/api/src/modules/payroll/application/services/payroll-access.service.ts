import { ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';

export interface PayrollViewer {
  empId: number;
  isAdmin: boolean;
  isAccounts: boolean;
  /** Has a team (Reporting Manager) and can decide their OT entries (BFD Section 9). */
  isManager: boolean;
}

export function requireEmpId(user: any): number {
  const id = Number(user?.emp_id ?? user?.sub);
  if (!Number.isInteger(id) || id <= 0) throw new HttpException('Please sign in again.', HttpStatus.UNAUTHORIZED);
  return id;
}

/** BFD Section 14: who can see and change what. */
@Injectable()
export class PayrollAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async viewer(empId: number): Promise<PayrollViewer> {
    const [row] = await this.prisma.$queryRaw<any[]>`
      SELECT
        EXISTS (SELECT 1 FROM employees e JOIN roles r ON r.role_id = e.role_id
                WHERE e.emp_id = ${empId} AND r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL) AS is_admin,
        EXISTS (SELECT 1 FROM payroll_settings s WHERE ${empId} = ANY(s.accounts_emp_ids)) AS is_accounts,
        EXISTS (SELECT 1 FROM employees t WHERE t.reporting_manager = ${empId} AND t.deleted_at IS NULL) AS is_manager;
    `;
    return { empId, isAdmin: Boolean(row?.is_admin), isAccounts: Boolean(row?.is_accounts), isManager: Boolean(row?.is_manager) };
  }

  /** Payroll menu, runs, adjustments, lock, slips, payment and reports: Admin and Accounts. */
  async assertPayroll(empId: number): Promise<PayrollViewer> {
    const v = await this.viewer(empId);
    if (!v.isAdmin && !v.isAccounts) throw new ForbiddenException('Only the Admin and Accounts can use Payroll.');
    return v;
  }

  async assertAdmin(empId: number): Promise<PayrollViewer> {
    const v = await this.viewer(empId);
    if (!v.isAdmin) throw new ForbiddenException('Only the Admin can do this.');
    return v;
  }

  async adminIds(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<Array<{ emp_id: number }>>`
      SELECT e.emp_id FROM employees e JOIN roles r ON r.role_id = e.role_id
      WHERE r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL;
    `;
    return rows.map((r) => Number(r.emp_id));
  }

  async accountsIds(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<Array<{ emp_id: number }>>`
      SELECT e.emp_id FROM payroll_settings s JOIN employees e ON e.emp_id = ANY(s.accounts_emp_ids)
      WHERE e.status = 'Active' AND e.deleted_at IS NULL;
    `;
    return Array.from(new Set(rows.map((r) => Number(r.emp_id))));
  }
}
