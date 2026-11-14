import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';

/**
 * Who the current user is for Software License Management (BFD Section 13).
 * - Admin: roles.is_admin
 * - License Manager: named in License Settings (software_license_managers)
 * - Accounts: named as Accounts in Expense or Payroll settings
 * - Software Owner: owner of at least one software
 */
export interface LicenseViewer {
  empId: number;
  isAdmin: boolean;
  isManager: boolean;
  isAccounts: boolean;
  isOwner: boolean;
  /** Has active employees reporting to them (team view, BFD 9 and 12). */
  isReportingManager: boolean;
}

@Injectable()
export class LicenseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async viewer(empId: number): Promise<LicenseViewer> {
    if (!empId) throw new ForbiddenException('You are not signed in as an employee.');
    const [row] = await this.prisma.$queryRaw<any[]>`
      SELECT
        EXISTS (SELECT 1 FROM employees e JOIN roles r ON r.role_id = e.role_id
                WHERE e.emp_id = ${empId} AND r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL) AS is_admin,
        EXISTS (SELECT 1 FROM software_license_managers m WHERE m.emp_id = ${empId}) AS is_manager,
        EXISTS (SELECT 1 FROM expense_general_settings s WHERE ${empId} = ANY(s.accounts_emp_ids)) AS is_accounts,
        EXISTS (SELECT 1 FROM software_licenses sl WHERE sl.software_owner_id = ${empId}) AS is_owner,
        EXISTS (SELECT 1 FROM employees t WHERE t.reporting_manager = ${empId} AND t.status = 'Active' AND t.deleted_at IS NULL) AS is_rm;
    `;
    const isAccounts = Boolean(row?.is_accounts) || (await this.isPayrollAccounts(empId));
    return {
      empId,
      isAdmin: Boolean(row?.is_admin),
      isManager: Boolean(row?.is_manager),
      isAccounts,
      isOwner: Boolean(row?.is_owner),
      isReportingManager: Boolean(row?.is_rm),
    };
  }

  /** Accounts named in Payroll Settings. Safe if the payroll migration has not been applied yet. */
  private async isPayrollAccounts(empId: number): Promise<boolean> {
    try {
      const [r] = await this.prisma.$queryRaw<any[]>`
        SELECT EXISTS (SELECT 1 FROM payroll_settings s WHERE ${empId} = ANY(s.accounts_emp_ids)) AS ok;
      `;
      return Boolean(r?.ok);
    } catch {
      return false;
    }
  }

  /** Flags the web uses to show or hide screens and buttons. */
  flags(v: LicenseViewer) {
    return {
      is_admin: v.isAdmin,
      is_license_manager: v.isManager,
      is_accounts: v.isAccounts,
      is_software_owner: v.isOwner,
      can_manage: this.canManage(v),
      can_view_register: this.canViewAll(v) || v.isOwner,
      can_view_all: this.canViewAll(v),
      can_view_keys: this.canManage(v),
      can_view_reports: this.canViewAll(v) || v.isOwner || v.isReportingManager,
      /** 'all' | 'owner' (own software) | 'team' (team assignments only, no costs) */
      report_scope: this.canViewAll(v) ? 'all' : v.isOwner ? 'owner' : v.isReportingManager ? 'team' : null,
      can_view_team: v.isReportingManager,
      can_view_settings: this.canManage(v),
      can_edit_settings: v.isAdmin,
      can_reopen: v.isAdmin,
    };
  }

  /** Add, edit, assign, revoke, transfer, renew, discontinue, see keys. */
  canManage(v: LicenseViewer) {
    return v.isAdmin || v.isManager;
  }

  /** Sees every software, its costs and History. */
  canViewAll(v: LicenseViewer) {
    return v.isAdmin || v.isManager || v.isAccounts;
  }

  assertManage(v: LicenseViewer) {
    if (!this.canManage(v)) throw new ForbiddenException('Only the Admin or a License Manager can do this.');
  }

  assertAdmin(v: LicenseViewer) {
    if (!v.isAdmin) throw new ForbiddenException('Only the Admin can do this.');
  }

  assertViewAll(v: LicenseViewer) {
    if (!this.canViewAll(v)) throw new ForbiddenException('You do not have access to this screen.');
  }

  /** Register list: everyone with rights sees all; a Software Owner sees only their own software. */
  assertRegister(v: LicenseViewer): { ownerId?: number } {
    if (this.canViewAll(v)) return {};
    if (v.isOwner) return { ownerId: v.empId };
    throw new ForbiddenException('You do not have access to the Software Licenses register.');
  }

  /** Software Details: Admin, License Managers, Accounts and the Software Owner of that software. */
  async assertViewSoftware(v: LicenseViewer, softwareId: number) {
    if (this.canViewAll(v)) return;
    const sw = await this.prisma.software_licenses.findUnique({
      where: { software_id: softwareId },
      select: { software_owner_id: true },
    });
    if (!sw) throw new NotFoundException('Software not found.');
    if (sw.software_owner_id !== v.empId) throw new ForbiddenException('You do not have access to this software.');
  }
}
