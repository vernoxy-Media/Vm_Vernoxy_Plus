import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';

export interface ExpenseViewer {
  empId: number;
  isAdmin: boolean;
  isAccounts: boolean;
  /** Departments this employee approves for as an Authorised Approver. */
  approverDeptIds: number[];
}

/**
 * Roles of BFD 1 "Who uses it": Admin (role is_admin), Accounts (named in
 * Expense Settings), Authorised Approver (per department), Employee.
 */
@Injectable()
export class ExpenseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async viewer(empId: number): Promise<ExpenseViewer> {
    const [row] = await this.prisma.$queryRaw<any[]>`
      SELECT
        EXISTS (SELECT 1 FROM employees e JOIN roles r ON r.role_id = e.role_id
                WHERE e.emp_id = ${empId} AND r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL) AS is_admin,
        EXISTS (SELECT 1 FROM expense_general_settings s WHERE ${empId} = ANY(s.accounts_emp_ids)) AS is_accounts,
        COALESCE((SELECT array_agg(department_id) FROM expense_authorised_approvers
                  WHERE approver_emp_id = ${empId} AND deleted_at IS NULL), '{}') AS dept_ids;
    `;
    return {
      empId,
      isAdmin: Boolean(row?.is_admin),
      isAccounts: Boolean(row?.is_accounts),
      approverDeptIds: (row?.dept_ids || []).map(Number),
    };
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
      SELECT e.emp_id FROM expense_general_settings s
      JOIN employees e ON e.emp_id = ANY(s.accounts_emp_ids)
      WHERE e.status = 'Active' AND e.deleted_at IS NULL;
    `;
    return Array.from(new Set(rows.map((r) => Number(r.emp_id))));
  }

  /** Accounts or Admin: pay claims back and see every report (BFD 1, 8). */
  assertFinance(v: ExpenseViewer) {
    if (!v.isAdmin && !v.isAccounts) throw new ForbiddenException('Only Accounts or the Admin can do this.');
  }

  assertAdmin(v: ExpenseViewer) {
    if (!v.isAdmin) throw new ForbiddenException('Only the Admin can do this.');
  }

  /** Anyone who uses the Expense Claims screen (BFD 6). */
  canUseClaims(v: ExpenseViewer) {
    return v.isAdmin || v.isAccounts || v.approverDeptIds.length > 0;
  }
}
