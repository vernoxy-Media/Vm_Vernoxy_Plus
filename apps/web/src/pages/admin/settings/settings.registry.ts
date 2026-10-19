import React from 'react';
import { Building2, ShieldCheck, Factory, Users, CalendarDays, LucideIcon } from 'lucide-react';
import type { MeResponseDto } from '@vernoxy-pulse/api-client';

const SettingsDepartmentsSection = React.lazy(() =>
  import('./SettingsDepartmentsSection').then((m) => ({ default: m.SettingsDepartmentsSection }))
);
const SettingsRolesSection = React.lazy(() =>
  import('./SettingsRolesSection').then((m) => ({ default: m.SettingsRolesSection }))
);
const SettingsIndustriesSection = React.lazy(() =>
  import('./SettingsIndustriesSection').then((m) => ({ default: m.SettingsIndustriesSection }))
);
const SettingsCustomerTypesSection = React.lazy(() =>
  import('./SettingsCustomerTypesSection').then((m) => ({ default: m.SettingsCustomerTypesSection }))
);
const SettingsHrPolicySection = React.lazy(() =>
  import('./SettingsHrPolicySection').then((m) => ({ default: m.SettingsHrPolicySection }))
);

export interface SettingsSectionConfig {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  component: React.ComponentType;
  isVisible: (user: MeResponseDto | null) => boolean;
}

export const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  {
    id: 'departments',
    label: 'Departments',
    path: '/admin/settings/departments',
    icon: Building2,
    component: SettingsDepartmentsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
  },
  {
    id: 'roles',
    label: 'Roles',
    path: '/admin/settings/roles',
    icon: ShieldCheck,
    component: SettingsRolesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
  },
  {
    id: 'industries',
    label: 'Industries',
    path: '/admin/settings/industries',
    icon: Factory,
    component: SettingsIndustriesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
  },
  {
    id: 'customer-types',
    label: 'Customer types',
    path: '/admin/settings/customer-types',
    icon: Users,
    component: SettingsCustomerTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
  },
  {
    id: 'hr-policy',
    label: 'HR Policy',
    path: '/admin/settings/hr-policy',
    icon: CalendarDays,
    component: SettingsHrPolicySection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
  },
];

export function getVisibleSettingsSections(user: MeResponseDto | null): SettingsSectionConfig[] {
  return SETTINGS_SECTIONS.filter((section) => section.isVisible(user));
}

export function getSettingsSectionByPath(pathname: string): SettingsSectionConfig | undefined {
  return SETTINGS_SECTIONS.find(
    (section) => section.path === pathname || pathname.startsWith(section.path),
  );
}
