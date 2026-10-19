import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  employeeCreateSchema,
  employeeEditSchema,
} from './employee-form.schema';
import {
  SETTINGS_SECTIONS,
  getVisibleSettingsSections,
  getSettingsSectionByPath,
} from './settings/settings.registry';

describe('Employee Form Validation Schema', () => {
  it('validates complete employee create payload successfully', () => {
    const validData = {
      name: 'John Doe',
      email: 'john.doe@vernoxy.com',
      mob: '+1234567890',
      dep_id: 1,
      role_id: 2,
      joining_date: '2026-10-12',
      password: 'password123',
      confirm_password: 'password123',
      must_change_password: false,
    };

    const result = employeeCreateSchema.safeParse(validData);
    assert.strictEqual(result.success, true);
  });

  it('allows mobile number to be omitted or empty', () => {
    const validWithoutMob = {
      name: 'Jane Smith',
      email: 'jane.smith@vernoxy.com',
      dep_id: 1,
      role_id: 2,
      joining_date: '2026-10-12',
      password: 'secret',
      confirm_password: 'secret',
      must_change_password: true,
    };

    const res1 = employeeCreateSchema.safeParse(validWithoutMob);
    assert.strictEqual(res1.success, true);

    const res2 = employeeCreateSchema.safeParse({ ...validWithoutMob, mob: '' });
    assert.strictEqual(res2.success, true);
  });

  it('allows role to be omitted or empty in create and edit schema', () => {
    const withoutRole = {
      name: 'No Role User',
      email: 'norole@vernoxy.com',
      dep_id: 1,
      joining_date: '2026-10-12',
      password: 'password123',
      confirm_password: 'password123',
    };

    const res1 = employeeCreateSchema.safeParse(withoutRole);
    assert.strictEqual(res1.success, true);
    if (res1.success) {
      assert.strictEqual(res1.data.role_id, undefined);
    }

    const res2 = employeeCreateSchema.safeParse({ ...withoutRole, role_id: '' });
    assert.strictEqual(res2.success, true);
    if (res2.success) {
      assert.strictEqual(res2.data.role_id, undefined);
    }

    const resEdit = employeeEditSchema.safeParse({
      name: 'No Role Edit',
      dep_id: 1,
      joining_date: '2026-10-12',
      role_id: '',
    });
    assert.strictEqual(resEdit.success, true);
  });

  it('rejects password shorter than 6 characters', () => {
    const shortPassword = {
      name: 'Bob Ross',
      email: 'bob@vernoxy.com',
      dep_id: 1,
      role_id: 2,
      joining_date: '2026-10-12',
      password: '12345',
      confirm_password: '12345',
    };

    const result = employeeCreateSchema.safeParse(shortPassword);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      const pwdError = result.error.errors.find((e) => e.path.includes('password'));
      assert.ok(pwdError);
      assert.strictEqual(pwdError?.message, 'Password must be at least 6 characters');
    }
  });

  it('rejects mismatched password and confirm password', () => {
    const mismatched = {
      name: 'Alice Wonder',
      email: 'alice@vernoxy.com',
      dep_id: 1,
      role_id: 2,
      joining_date: '2026-10-12',
      password: 'validPassword1',
      confirm_password: 'validPassword2',
    };

    const result = employeeCreateSchema.safeParse(mismatched);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      const confirmError = result.error.errors.find((e) => e.path.includes('confirm_password'));
      assert.ok(confirmError);
      assert.strictEqual(confirmError?.message, 'Passwords do not match');
    }
  });

  it('rejects invalid email address', () => {
    const invalidEmail = {
      name: 'Test User',
      email: 'not-an-email',
      dep_id: 1,
      role_id: 2,
      joining_date: '2026-10-12',
      password: 'secretPassword',
      confirm_password: 'secretPassword',
    };

    const result = employeeCreateSchema.safeParse(invalidEmail);
    assert.strictEqual(result.success, false);
  });

  it('validates edit schema without email or password', () => {
    const validEdit = {
      name: 'Updated Name',
      dep_id: 3,
      role_id: 5,
      joining_date: '2026-01-01',
      status: 'Active' as const,
    };

    const result = employeeEditSchema.safeParse(validEdit);
    assert.strictEqual(result.success, true);
  });
});

describe('Settings Master Data Registry', () => {
  it('registers all general settings sections', () => {
    const ids = SETTINGS_SECTIONS.map((s) => s.id);
    assert.ok(ids.includes('departments'));
    assert.ok(ids.includes('roles'));
    assert.ok(ids.includes('industries'));
    assert.ok(ids.includes('customer-types'));
    assert.ok(ids.includes('hr-policy'));
  });

  it('visibility predicate shows sections only when user has can_manage_organization', () => {
    const adminUser: any = {
      emp_id: 1,
      access: { can_manage_organization: true },
    };
    const regularUser: any = {
      emp_id: 2,
      access: { can_manage_organization: false },
    };

    const adminSections = getVisibleSettingsSections(adminUser);
    assert.strictEqual(adminSections.length, SETTINGS_SECTIONS.length);

    const nonAdminSections = getVisibleSettingsSections(regularUser);
    assert.strictEqual(nonAdminSections.length, 0);

    const nullUserSections = getVisibleSettingsSections(null);
    assert.strictEqual(nullUserSections.length, 0);
  });

  it('resolves section config by path and nested subpaths', () => {
    const dept = getSettingsSectionByPath('/admin/settings/departments');
    assert.strictEqual(dept?.id, 'departments');

    const role = getSettingsSectionByPath('/admin/settings/roles?dep_id=2&new=1');
    assert.strictEqual(role?.id, 'roles');

    const unknown = getSettingsSectionByPath('/admin/settings/unknown');
    assert.strictEqual(unknown, undefined);
  });
});

describe('Dependent Role Select Logic', () => {
  it('defines expected dependent state behavior', () => {
    // When department is not selected, role is disabled and prompt placeholder is shown
    const isRoleDisabled = (depId: number | '' | undefined) => !depId;
    assert.strictEqual(isRoleDisabled(''), true);
    assert.strictEqual(isRoleDisabled(undefined), true);
    assert.strictEqual(isRoleDisabled(1), false);

    // When department changes, roleId is cleared
    const onDepartmentChange = (newDepId: number | '', _prevRoleId: number | '') => {
      return {
        depId: newDepId,
        roleId: '' as const, // Clears the role
      };
    };

    const updated = onDepartmentChange(3, 10);
    assert.strictEqual(updated.depId, 3);
    assert.strictEqual(updated.roleId, '');
  });
});
