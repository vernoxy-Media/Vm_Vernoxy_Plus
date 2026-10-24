import React from 'react';
import {
  Building2,
  ShieldCheck,
  Factory,
  Users,
  CalendarDays,
  Tag,
  Coffee,
  LayoutGrid,
  Activity,
  Shapes,
  Antenna,
  ThumbsDown,
  UserSquare,
  ClipboardCheck,
  HelpCircle,
  Clock,
  CalendarOff,
  LucideIcon,
} from 'lucide-react';
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
const SettingsTaskTypesSection = React.lazy(() =>
  import('./SettingsTaskTypesSection').then((m) => ({ default: m.SettingsTaskTypesSection }))
);
const SettingsBreakTypesSection = React.lazy(() =>
  import('./SettingsBreakTypesSection').then((m) => ({ default: m.SettingsBreakTypesSection }))
);
const SettingsProjectCategoriesSection = React.lazy(() =>
  import('./SettingsProjectCategoriesSection').then((m) => ({ default: m.SettingsProjectCategoriesSection }))
);
const SettingsProjectStatusesSection = React.lazy(() =>
  import('./SettingsProjectStatusesSection').then((m) => ({ default: m.SettingsProjectStatusesSection }))
);
const SettingsProjectTypesSection = React.lazy(() =>
  import('./SettingsProjectTypesSection').then((m) => ({ default: m.SettingsProjectTypesSection }))
);
const SettingsLeadSourcesSection = React.lazy(() =>
  import('./SettingsLeadSourcesSection').then((m) => ({ default: m.SettingsLeadSourcesSection }))
);
const SettingsLostReasonsSection = React.lazy(() =>
  import('./SettingsLostReasonsSection').then((m) => ({ default: m.SettingsLostReasonsSection }))
);
const SettingsPersonDepartmentsSection = React.lazy(() =>
  import('./SettingsPersonDepartmentsSection').then((m) => ({ default: m.SettingsPersonDepartmentsSection }))
);
const SettingsRequestTypesSection = React.lazy(() =>
  import('./SettingsRequestTypesSection').then((m) => ({ default: m.SettingsRequestTypesSection }))
);
const SettingsAttendanceReasonsSection = React.lazy(() =>
  import('./SettingsAttendanceReasonsSection').then((m) => ({ default: m.SettingsAttendanceReasonsSection }))
);
const SettingsShiftTypesSection = React.lazy(() =>
  import('./SettingsShiftTypesSection').then((m) => ({ default: m.SettingsShiftTypesSection }))
);
const SettingsLeaveTypesSection = React.lazy(() =>
  import('./SettingsLeaveTypesSection').then((m) => ({ default: m.SettingsLeaveTypesSection }))
);

export interface SettingsSectionConfig {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  component: React.ComponentType;
  isVisible: (user: MeResponseDto | null) => boolean;
  group?: string;
}

export const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  // ── Organization ──────────────────────────────────
  {
    id: 'departments',
    label: 'Departments',
    path: '/admin/settings/departments',
    icon: Building2,
    component: SettingsDepartmentsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Organization',
  },
  {
    id: 'roles',
    label: 'Roles',
    path: '/admin/settings/roles',
    icon: ShieldCheck,
    component: SettingsRolesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Organization',
  },
  {
    id: 'hr-policy',
    label: 'HR Policy',
    path: '/admin/settings/hr-policy',
    icon: CalendarDays,
    component: SettingsHrPolicySection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Organization',
  },

  // ── CRM ───────────────────────────────────────────
  {
    id: 'industries',
    label: 'Industries',
    path: '/admin/settings/industries',
    icon: Factory,
    component: SettingsIndustriesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'CRM',
  },
  {
    id: 'customer-types',
    label: 'Customer Types',
    path: '/admin/settings/customer-types',
    icon: Users,
    component: SettingsCustomerTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'CRM',
  },
  {
    id: 'lead-sources',
    label: 'Lead Sources',
    path: '/admin/settings/lead-sources',
    icon: Antenna,
    component: SettingsLeadSourcesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'CRM',
  },
  {
    id: 'lost-reasons',
    label: 'Lost Reasons',
    path: '/admin/settings/lost-reasons',
    icon: ThumbsDown,
    component: SettingsLostReasonsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'CRM',
  },
  {
    id: 'person-departments',
    label: 'Person Departments',
    path: '/admin/settings/person-departments',
    icon: UserSquare,
    component: SettingsPersonDepartmentsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'CRM',
  },

  // ── Tasks ─────────────────────────────────────────
  {
    id: 'task-types',
    label: 'Task Types',
    path: '/admin/settings/task-types',
    icon: Tag,
    component: SettingsTaskTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Tasks',
  },

  // ── Projects ──────────────────────────────────────
  {
    id: 'project-categories',
    label: 'Project Categories',
    path: '/admin/settings/project-categories',
    icon: LayoutGrid,
    component: SettingsProjectCategoriesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Projects',
  },
  {
    id: 'project-statuses',
    label: 'Project Statuses',
    path: '/admin/settings/project-statuses',
    icon: Activity,
    component: SettingsProjectStatusesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Projects',
  },
  {
    id: 'project-types',
    label: 'Project Types',
    path: '/admin/settings/project-types',
    icon: Shapes,
    component: SettingsProjectTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Projects',
  },

  // ── HR / Attendance ───────────────────────────────
  {
    id: 'request-types',
    label: 'Request Types',
    path: '/admin/settings/request-types',
    icon: ClipboardCheck,
    component: SettingsRequestTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
  },
  {
    id: 'attendance-reasons',
    label: 'Regularization Reasons',
    path: '/admin/settings/attendance-reasons',
    icon: HelpCircle,
    component: SettingsAttendanceReasonsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
  },
  {
    id: 'break-types',
    label: 'Break Types',
    path: '/admin/settings/break-types',
    icon: Coffee,
    component: SettingsBreakTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
  },
  {
    id: 'shift-types',
    label: 'Shift Types',
    path: '/admin/settings/shift-types',
    icon: Clock,
    component: SettingsShiftTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
  },
  {
    id: 'leave-types',
    label: 'Leave Types',
    path: '/admin/settings/leave-types',
    icon: CalendarOff,
    component: SettingsLeaveTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
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

export function getSettingsSectionGroups(user: MeResponseDto | null): Record<string, SettingsSectionConfig[]> {
  const visible = getVisibleSettingsSections(user);
  return visible.reduce<Record<string, SettingsSectionConfig[]>>((acc, section) => {
    const group = section.group || 'General';
    if (!acc[group]) acc[group] = [];
    acc[group].push(section);
    return acc;
  }, {});
}

export interface SettingsMainGroup {
  id: string;
  name: string;
  icon: LucideIcon;
}

export const SETTINGS_MAIN_GROUPS: SettingsMainGroup[] = [
  { id: 'Organization', name: 'Organization', icon: Building2 },
  { id: 'CRM', name: 'CRM', icon: Users },
  { id: 'Tasks', name: 'Tasks', icon: Tag },
  { id: 'Projects', name: 'Projects', icon: Shapes },
  { id: 'HR', name: 'HR', icon: Clock },
];
