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
  UserCheck,
  Briefcase,
  Heart,
  UserX,
  Share2,
  Globe,
  CalendarClock,
  Layers,
  XCircle,
  UserPlus,
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
const SettingsEmploymentTypesSection = React.lazy(() =>
  import('./SettingsEmploymentTypesSection').then((m) => ({ default: m.SettingsEmploymentTypesSection }))
);
const SettingsGendersSection = React.lazy(() =>
  import('./SettingsGendersSection').then((m) => ({ default: m.SettingsGendersSection }))
);
const SettingsBloodGroupsSection = React.lazy(() =>
  import('./SettingsBloodGroupsSection').then((m) => ({ default: m.SettingsBloodGroupsSection }))
);
const SettingsDeactivationReasonsSection = React.lazy(() =>
  import('./SettingsDeactivationReasonsSection').then((m) => ({ default: m.SettingsDeactivationReasonsSection }))
);
const SettingsCandidateSourcesSection = React.lazy(() =>
  import('./SettingsCandidateSourcesSection').then((m) => ({ default: m.SettingsCandidateSourcesSection }))
);
const SettingsJobPortalsSection = React.lazy(() =>
  import('./SettingsJobPortalsSection').then((m) => ({ default: m.SettingsJobPortalsSection }))
);
const SettingsNoticePeriodsSection = React.lazy(() =>
  import('./SettingsNoticePeriodsSection').then((m) => ({ default: m.SettingsNoticePeriodsSection }))
);
const SettingsCandidateStagesSection = React.lazy(() =>
  import('./SettingsCandidateStagesSection').then((m) => ({ default: m.SettingsCandidateStagesSection }))
);
const SettingsRejectionReasonsSection = React.lazy(() =>
  import('./SettingsRejectionReasonsSection').then((m) => ({ default: m.SettingsRejectionReasonsSection }))
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

  // ── Employee ──────────────────────────────────────
  {
    id: 'employment-types',
    label: 'Employment Types',
    path: '/admin/settings/employment-types',
    icon: Briefcase,
    component: SettingsEmploymentTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Employee',
  },
  {
    id: 'genders',
    label: 'Genders',
    path: '/admin/settings/genders',
    icon: Users,
    component: SettingsGendersSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Employee',
  },
  {
    id: 'blood-groups',
    label: 'Blood Groups',
    path: '/admin/settings/blood-groups',
    icon: Heart,
    component: SettingsBloodGroupsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Employee',
  },
  {
    id: 'deactivation-reasons',
    label: 'Deactivation Reasons',
    path: '/admin/settings/deactivation-reasons',
    icon: UserX,
    component: SettingsDeactivationReasonsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Employee',
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

  // ── Recruitment ───────────────────────────────────
  {
    id: 'candidate-sources',
    label: 'Candidate Sources',
    path: '/admin/settings/candidate-sources',
    icon: Share2,
    component: SettingsCandidateSourcesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Recruitment',
  },
  {
    id: 'job-portals',
    label: 'Job Portals',
    path: '/admin/settings/job-portals',
    icon: Globe,
    component: SettingsJobPortalsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Recruitment',
  },
  {
    id: 'notice-periods',
    label: 'Notice Periods',
    path: '/admin/settings/notice-periods',
    icon: CalendarClock,
    component: SettingsNoticePeriodsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Recruitment',
  },
  {
    id: 'candidate-stages',
    label: 'Candidate Stages',
    path: '/admin/settings/candidate-stages',
    icon: Layers,
    component: SettingsCandidateStagesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Recruitment',
  },
  {
    id: 'rejection-reasons',
    label: 'Rejection Reasons',
    path: '/admin/settings/rejection-reasons',
    icon: XCircle,
    component: SettingsRejectionReasonsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Recruitment',
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
  { id: 'Employee', name: 'Employee', icon: UserCheck },
  { id: 'CRM', name: 'CRM', icon: Users },
  { id: 'Tasks', name: 'Tasks', icon: Tag },
  { id: 'Projects', name: 'Projects', icon: Shapes },
  { id: 'HR', name: 'HR', icon: Clock },
  { id: 'Recruitment', name: 'Recruitment', icon: UserPlus },
];
