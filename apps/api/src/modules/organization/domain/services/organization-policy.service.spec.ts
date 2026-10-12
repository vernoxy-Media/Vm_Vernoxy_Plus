import { OrganizationPolicyService } from './organization-policy.service';
import { ConflictDomainError, UnprocessableDomainError } from '../errors/organization.errors';

describe('OrganizationPolicyService', () => {
  describe('validateSelfModification', () => {
    it('allows self-modification for harmless fields (e.g. name update)', () => {
      expect(() =>
        OrganizationPolicyService.validateSelfModification(1, 1, {}),
      ).not.toThrow();
    });

    it('blocks self-deletion for the acting administrator', () => {
      expect(() =>
        OrganizationPolicyService.validateSelfModification(1, 1, { is_delete: true }),
      ).toThrow(ConflictDomainError);
    });

    it('blocks self-demotion or department transfer for the acting administrator', () => {
      expect(() =>
        OrganizationPolicyService.validateSelfModification(1, 1, { dep_id: 2 }),
      ).toThrow(ConflictDomainError);

      expect(() =>
        OrganizationPolicyService.validateSelfModification(1, 1, { role_id: 3 }),
      ).toThrow(ConflictDomainError);
    });

    it('blocks self-deactivation for the acting administrator', () => {
      expect(() =>
        OrganizationPolicyService.validateSelfModification(1, 1, { status: 'Inactive' }),
      ).toThrow(ConflictDomainError);
    });

    it('permits modifying other employees freely', () => {
      expect(() =>
        OrganizationPolicyService.validateSelfModification(1, 2, {
          dep_id: 2,
          role_id: 3,
          status: 'Inactive',
          is_delete: true,
        }),
      ).not.toThrow();
    });
  });

  describe('validateRoleBelongsToDepartment', () => {
    it('passes when role dep_id matches employee dep_id', () => {
      expect(() =>
        OrganizationPolicyService.validateRoleBelongsToDepartment(5, 5),
      ).not.toThrow();
    });

    it('throws UnprocessableDomainError with code ROLE_NOT_IN_DEPARTMENT when mismatch', () => {
      expect(() =>
        OrganizationPolicyService.validateRoleBelongsToDepartment(5, 6),
      ).toThrow(UnprocessableDomainError);
    });
  });

  describe('validateLastAdminDemotion', () => {
    it('blocks deactivating the last active administrator (activeAdminCount <= 1)', () => {
      expect(() =>
        OrganizationPolicyService.validateLastAdminDemotion(
          true,
          'Active',
          1,
          'Inactive',
          true,
        ),
      ).toThrow(ConflictDomainError);
    });

    it('blocks demoting the last active administrator (activeAdminCount <= 1)', () => {
      expect(() =>
        OrganizationPolicyService.validateLastAdminDemotion(
          true,
          'Active',
          1,
          'Active',
          false,
        ),
      ).toThrow(ConflictDomainError);
    });

    it('allows deactivating or demoting an admin when there are other active admins', () => {
      expect(() =>
        OrganizationPolicyService.validateLastAdminDemotion(
          true,
          'Active',
          2,
          'Inactive',
          true,
        ),
      ).not.toThrow();

      expect(() =>
        OrganizationPolicyService.validateLastAdminDemotion(
          true,
          'Active',
          2,
          'Active',
          false,
        ),
      ).not.toThrow();
    });
  });
});
