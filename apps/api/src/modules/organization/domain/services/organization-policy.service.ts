import { ConflictDomainError, UnprocessableDomainError } from '../errors/organization.errors';

export class OrganizationPolicyService {
  /**
   * Prevents self-modification by the acting administrator for critical fields:
   * an admin cannot change their own role, department or status, or delete themselves.
   */
  static validateSelfModification(
    actingAdminId: number,
    targetEmployeeId: number,
    updates?: {
      dep_id?: number;
      role_id?: number | null;
      status?: string;
      is_delete?: boolean;
    },
  ): void {
    if (actingAdminId === targetEmployeeId) {
      if (updates?.is_delete) {
        throw new ConflictDomainError(
          'SELF_MODIFICATION_FORBIDDEN',
          'Administrators cannot delete their own account',
        );
      }
      if (updates?.dep_id !== undefined || updates?.role_id !== undefined) {
        throw new ConflictDomainError(
          'SELF_MODIFICATION_FORBIDDEN',
          'Administrators cannot modify their own department or role',
        );
      }
      if (updates?.status !== undefined) {
        throw new ConflictDomainError(
          'SELF_MODIFICATION_FORBIDDEN',
          'Administrators cannot change their own active status',
        );
      }
    }
  }

  /**
   * Validates that the role actually belongs to the given department.
   */
  static validateRoleBelongsToDepartment(roleDepId: number, employeeDepId: number): void {
    if (roleDepId !== employeeDepId) {
      throw new UnprocessableDomainError(
        'ROLE_NOT_IN_DEPARTMENT',
        `Role does not belong to the selected department (role dep_id: ${roleDepId}, requested dep_id: ${employeeDepId})`,
        'role_id',
      );
    }
  }

  /**
   * Pure policy function to check last-admin protection before updating or deactivating/deleting.
   */
  static validateLastAdminDemotion(
    isTargetAdmin: boolean,
    targetStatus: string,
    activeAdminCount: number,
    proposedStatus?: string,
    proposedIsAdmin?: boolean,
  ): void {
    if (isTargetAdmin && targetStatus === 'Active') {
      const willDemote = proposedIsAdmin === false;
      const willDeactivate = proposedStatus === 'Inactive';

      if ((willDemote || willDeactivate) && activeAdminCount <= 1) {
        throw new ConflictDomainError(
          'LAST_ADMIN',
          'Operation rejected: cannot deactivate or demote the last remaining active administrator',
        );
      }
    }
  }
}
