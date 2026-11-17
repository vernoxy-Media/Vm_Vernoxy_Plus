import React from 'react';
import {
  Building2,
  ShieldCheck,
  Factory,
  Users,
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
  Receipt,
  AlertCircle,
  Laptop,
  BookOpen,
  Award,
  MapPin,
  Compass,
  Map as MapIcon,
  PhoneOff,
  Trash2,
  Building,
  Palette,
  LucideIcon,
  Code,
  Server,
  Cloud,
  Database,
  Flag,
  Bug,
  Handshake,
  GitBranch,
  FileCheck2,
  Banknote,
} from 'lucide-react';
import type { MeResponseDto } from '@vernoxy-pulse/api-client';

const SettingsIndustriesSection = React.lazy(() =>
  import('./sections/SettingsIndustriesSection').then((m) => ({ default: m.SettingsIndustriesSection }))
);
const SettingsCustomerTypesSection = React.lazy(() =>
  import('./sections/SettingsCustomerTypesSection').then((m) => ({ default: m.SettingsCustomerTypesSection }))
);
const SettingsTaskTypesSection = React.lazy(() =>
  import('./sections/SettingsTaskTypesSection').then((m) => ({ default: m.SettingsTaskTypesSection }))
);
const SettingsTaskPrioritiesSection = React.lazy(() =>
  import('./sections/SettingsTaskMastersSections').then((m) => ({ default: m.SettingsTaskPrioritiesSection }))
);
const SettingsTaskSourcesSection = React.lazy(() =>
  import('./sections/SettingsTaskMastersSections').then((m) => ({ default: m.SettingsTaskSourcesSection }))
);
const SettingsTaskStagesSection = React.lazy(() =>
  import('./sections/SettingsTaskMastersSections').then((m) => ({ default: m.SettingsTaskStagesSection }))
);
const SettingsBreakTypesSection = React.lazy(() =>
  import('./sections/SettingsBreakTypesSection').then((m) => ({ default: m.SettingsBreakTypesSection }))
);
const SettingsProjectCategoriesSection = React.lazy(() =>
  import('./sections/SettingsProjectCategoriesSection').then((m) => ({ default: m.SettingsProjectCategoriesSection }))
);
const SettingsProjectStatusesSection = React.lazy(() =>
  import('./sections/SettingsProjectStatusesSection').then((m) => ({ default: m.SettingsProjectStatusesSection }))
);
const SettingsProjectTypesSection = React.lazy(() =>
  import('./sections/SettingsProjectTypesSection').then((m) => ({ default: m.SettingsProjectTypesSection }))
);
const SettingsLeadSourcesSection = React.lazy(() =>
  import('./sections/SettingsLeadSourcesSection').then((m) => ({ default: m.SettingsLeadSourcesSection }))
);
const SettingsLostReasonsSection = React.lazy(() =>
  import('./sections/SettingsLostReasonsSection').then((m) => ({ default: m.SettingsLostReasonsSection }))
);
const SettingsPersonDepartmentsSection = React.lazy(() =>
  import('./sections/SettingsPersonDepartmentsSection').then((m) => ({ default: m.SettingsPersonDepartmentsSection }))
);
const SettingsRequestTypesSection = React.lazy(() =>
  import('./sections/SettingsRequestTypesSection').then((m) => ({ default: m.SettingsRequestTypesSection }))
);
const SettingsAttendanceReasonsSection = React.lazy(() =>
  import('./sections/SettingsAttendanceReasonsSection').then((m) => ({ default: m.SettingsAttendanceReasonsSection }))
);
const SettingsShiftTypesSection = React.lazy(() =>
  import('./sections/SettingsShiftTypesSection').then((m) => ({ default: m.SettingsShiftTypesSection }))
);
const SettingsLeaveTypesSection = React.lazy(() =>
  import('./sections/SettingsLeaveTypesSection').then((m) => ({ default: m.SettingsLeaveTypesSection }))
);
const SettingsExpenseSettingsSection = React.lazy(() =>
  import('./sections/SettingsExpenseSettingsSection').then((m) => ({ default: m.SettingsExpenseSettingsSection }))
);
const SettingsComplaintSettingsSection = React.lazy(() =>
  import('./sections/SettingsComplaintSettingsSection').then((m) => ({ default: m.SettingsComplaintSettingsSection }))
);
const SettingsLicenseSection = React.lazy(() =>
  import('./sections/SettingsLicenseSection').then((m) => ({ default: m.SettingsLicenseSection }))
);
const SettingsPayrollSection = React.lazy(() =>
  import('./sections/SettingsPayrollSection').then((m) => ({ default: m.SettingsPayrollSection }))
);
const SalarySlipTemplatePage = React.lazy(() =>
  import('@/features/document-templates/pages/SalarySlipTemplatePage').then((m) => ({ default: m.SalarySlipTemplatePage }))
);
const QuotationTemplatePage = React.lazy(() =>
  import('@/features/document-templates/pages/QuotationTemplatePage').then((m) => ({ default: m.QuotationTemplatePage }))
);
const SettingsClientLoginsSection = React.lazy(() =>
  import('./sections/SettingsClientLoginsSection').then((m) => ({ default: m.SettingsClientLoginsSection }))
);
const SettingsResetDataSection = React.lazy(() =>
  import('./sections/SettingsResetDataSection').then((m) => ({ default: m.SettingsResetDataSection }))
);
const SettingsKnowledgeBaseSection = React.lazy(() =>
  import('./sections/SettingsKnowledgeBaseSection').then((m) => ({ default: m.SettingsKnowledgeBaseSection }))
);
const SettingsPerformanceSection = React.lazy(() =>
  import('./sections/SettingsPerformanceSection').then((m) => ({ default: m.SettingsPerformanceSection }))
);
const SettingsEmploymentTypesSection = React.lazy(() =>
  import('./sections/SettingsEmploymentTypesSection').then((m) => ({ default: m.SettingsEmploymentTypesSection }))
);
const SettingsGendersSection = React.lazy(() =>
  import('./sections/SettingsGendersSection').then((m) => ({ default: m.SettingsGendersSection }))
);
const SettingsBloodGroupsSection = React.lazy(() =>
  import('./sections/SettingsBloodGroupsSection').then((m) => ({ default: m.SettingsBloodGroupsSection }))
);
const SettingsEmployeeDocumentsSection = React.lazy(() =>
  import('./sections/SettingsEmployeeDocumentsSection').then((m) => ({ default: m.SettingsEmployeeDocumentsSection }))
);
const SettingsDeactivationReasonsSection = React.lazy(() =>
  import('./sections/SettingsDeactivationReasonsSection').then((m) => ({ default: m.SettingsDeactivationReasonsSection }))
);
const SettingsCandidateSourcesSection = React.lazy(() =>
  import('./sections/SettingsCandidateSourcesSection').then((m) => ({ default: m.SettingsCandidateSourcesSection }))
);
const SettingsLeaveAppliesToSection = React.lazy(() =>
  import('./sections/SettingsLeaveAppliesToSection').then((m) => ({ default: m.SettingsLeaveAppliesToSection }))
);
const SettingsLeaveColoursSection = React.lazy(() =>
  import('./sections/SettingsLeaveColoursSection').then((m) => ({ default: m.SettingsLeaveColoursSection }))
);
const SettingsJobPortalsSection = React.lazy(() =>
  import('./sections/SettingsJobPortalsSection').then((m) => ({ default: m.SettingsJobPortalsSection }))
);
const SettingsNoticePeriodsSection = React.lazy(() =>
  import('./sections/SettingsNoticePeriodsSection').then((m) => ({ default: m.SettingsNoticePeriodsSection }))
);
const SettingsProbationPeriodsSection = React.lazy(() =>
  import('./sections/SettingsProbationPeriodsSection').then((m) => ({ default: m.SettingsProbationPeriodsSection }))
);
const SettingsCandidateStagesSection = React.lazy(() =>
  import('./sections/SettingsCandidateStagesSection').then((m) => ({ default: m.SettingsCandidateStagesSection }))
);
const SettingsRejectionReasonsSection = React.lazy(() =>
  import('./sections/SettingsRejectionReasonsSection').then((m) => ({ default: m.SettingsRejectionReasonsSection }))
);

const SettingsServiceFitSection = React.lazy(() =>
  import('./sections/SettingsServiceFitSection').then((m) => ({ default: m.SettingsServiceFitSection }))
);
const SettingsContactDesignationSection = React.lazy(() =>
  import('./sections/SettingsContactDesignationSection').then((m) => ({ default: m.SettingsContactDesignationSection }))
);
const SettingsNatureOfBusinessSection = React.lazy(() =>
  import('./sections/SettingsNatureOfBusinessSection').then((m) => ({ default: m.SettingsNatureOfBusinessSection }))
);
const SettingsGidcNamesSection = React.lazy(() =>
  import('./sections/SettingsGidcNamesSection').then((m) => ({ default: m.SettingsGidcNamesSection }))
);
const SettingsGidcAreasSection = React.lazy(() =>
  import('./sections/SettingsGidcAreasSection').then((m) => ({ default: m.SettingsGidcAreasSection }))
);

const SettingsCitiesSection = React.lazy(() =>
  import('./sections/SettingsCitiesSection').then((m) => ({ default: m.SettingsCitiesSection }))
);
const SettingsStatesSection = React.lazy(() =>
  import('./sections/SettingsStatesSection').then((m) => ({ default: m.SettingsStatesSection }))
);
const SettingsCountriesSection = React.lazy(() =>
  import('./sections/SettingsCountriesSection').then((m) => ({ default: m.SettingsCountriesSection }))
);

const SettingsCallNotReceivedReasonsSection = React.lazy(() =>
  import('./sections/SettingsCallNotReceivedReasonsSection').then((m) => ({ default: m.SettingsCallNotReceivedReasonsSection }))
);

const SettingsBugPrioritiesSection = React.lazy(() =>
  import('./sections/SettingsBugMastersSections').then((m) => ({ default: m.SettingsBugPrioritiesSection }))
);
const SettingsBugTypesSection = React.lazy(() =>
  import('./sections/SettingsBugMastersSections').then((m) => ({ default: m.SettingsBugTypesSection }))
);

const SettingsTechFrontendSection = React.lazy(() =>
  import('./sections/SettingsTechStackSections').then((m) => ({ default: m.SettingsTechFrontendSection }))
);
const SettingsTechBackendSection = React.lazy(() =>
  import('./sections/SettingsTechStackSections').then((m) => ({ default: m.SettingsTechBackendSection }))
);
const SettingsTechCloudSection = React.lazy(() =>
  import('./sections/SettingsTechStackSections').then((m) => ({ default: m.SettingsTechCloudSection }))
);
const SettingsTechDatabaseSection = React.lazy(() =>
  import('./sections/SettingsTechStackSections').then((m) => ({ default: m.SettingsTechDatabaseSection }))
);

export interface SettingsSectionConfig {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  component: React.ComponentType;
  isVisible: (user: MeResponseDto | null) => boolean;
  group?: string;
  /** A heading inside a big group (Sales has three), so its screens are not one long row of tabs. */
  subgroup?: string;
}

export const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
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
    // Standard document checklist (from the database, table employee_document_checklist)
    id: 'employee-documents',
    label: 'Employee Documents',
    path: '/admin/settings/employee-documents',
    icon: FileCheck2,
    component: SettingsEmployeeDocumentsSection,
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

  // ── Sales (master data used by Companies, Leads, Follow-ups and the filters) ──
  {
    id: 'industries',
    label: 'Industries',
    path: '/admin/settings/industries',
    icon: Factory,
    component: SettingsIndustriesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Companies & contacts',
  },
  {
    id: 'customer-types',
    label: 'Customer Types',
    path: '/admin/settings/customer-types',
    icon: Users,
    component: SettingsCustomerTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Companies & contacts',
  },
  {
    id: 'service-fit',
    label: 'Service Fits',
    path: '/admin/settings/service-fit',
    icon: Briefcase,
    component: SettingsServiceFitSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Leads & follow-ups',
  },
  {
    id: 'designation',
    label: 'Contact Designations',
    path: '/admin/settings/designation',
    icon: UserSquare,
    component: SettingsContactDesignationSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Companies & contacts',
  },
  {
    id: 'nature-of-business',
    label: 'Nature of Business',
    path: '/admin/settings/nature-of-business',
    icon: Building2,
    component: SettingsNatureOfBusinessSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Companies & contacts',
  },
  {
    id: 'gidc-name',
    label: 'GIDC Names',
    path: '/admin/settings/gidc-name',
    icon: MapPin,
    component: SettingsGidcNamesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Locations',
  },
  {
    id: 'gidc-phase',
    label: 'GIDC Areas / Phases',
    path: '/admin/settings/gidc-phase',
    icon: Compass,
    component: SettingsGidcAreasSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Locations',
  },
  {
    id: 'city',
    label: 'Cities',
    path: '/admin/settings/city',
    icon: MapPin,
    component: SettingsCitiesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Locations',
  },
  {
    id: 'state',
    label: 'States',
    path: '/admin/settings/state',
    icon: MapIcon,
    component: SettingsStatesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Locations',
  },
  {
    id: 'country',
    label: 'Countries',
    path: '/admin/settings/country',
    icon: Globe,
    component: SettingsCountriesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Locations',
  },
  {
    id: 'call-not-received-reasons',
    label: 'Call Not Received Reasons',
    path: '/admin/settings/call-not-received-reasons',
    icon: PhoneOff,
    component: SettingsCallNotReceivedReasonsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Leads & follow-ups',
  },
  {
    id: 'lead-sources',
    label: 'Lead Sources',
    path: '/admin/settings/lead-sources',
    icon: Antenna,
    component: SettingsLeadSourcesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Leads & follow-ups',
  },
  {
    id: 'lost-reasons',
    label: 'Lost Reasons',
    path: '/admin/settings/lost-reasons',
    icon: ThumbsDown,
    component: SettingsLostReasonsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Leads & follow-ups',
  },
  {
    id: 'person-departments',
    label: 'Person Departments',
    path: '/admin/settings/person-departments',
    icon: UserSquare,
    component: SettingsPersonDepartmentsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Sales',
    subgroup: 'Companies & contacts',
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
  {
    id: 'task-priorities',
    label: 'Task Priorities',
    path: '/admin/settings/task-priorities',
    icon: Flag,
    component: SettingsTaskPrioritiesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Tasks',
  },
  {
    id: 'task-sources',
    label: 'Task Sources',
    path: '/admin/settings/task-sources',
    icon: GitBranch,
    component: SettingsTaskSourcesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Tasks',
  },
  {
    id: 'task-stages',
    label: 'Task Stages',
    path: '/admin/settings/task-stages',
    icon: Layers,
    component: SettingsTaskStagesSection,
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
  {
    id: 'bug-priorities',
    label: 'Bug Priorities',
    path: '/admin/settings/bug-priorities',
    icon: Flag,
    component: SettingsBugPrioritiesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Projects',
  },
  {
    id: 'bug-types',
    label: 'Bug Types',
    path: '/admin/settings/bug-types',
    icon: Bug,
    component: SettingsBugTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Projects',
  },
  {
    id: 'tech-frontend',
    label: 'Front-End Technologies',
    path: '/admin/settings/tech-frontend',
    icon: Code,
    component: SettingsTechFrontendSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Projects',
  },
  {
    id: 'tech-backend',
    label: 'Back-End Technologies',
    path: '/admin/settings/tech-backend',
    icon: Server,
    component: SettingsTechBackendSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Projects',
  },
  {
    id: 'tech-cloud',
    label: 'Cloud Platforms',
    path: '/admin/settings/tech-cloud',
    icon: Cloud,
    component: SettingsTechCloudSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Projects',
  },
  {
    id: 'tech-database',
    label: 'Databases',
    path: '/admin/settings/tech-database',
    icon: Database,
    component: SettingsTechDatabaseSection,
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
    label: 'Leave Settings',
    path: '/admin/settings/leave-types',
    icon: CalendarOff,
    component: SettingsLeaveTypesSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
  },
  {
    id: 'leave-applies-to',
    label: 'Leave Applies To',
    path: '/admin/settings/leave-applies-to',
    icon: Users,
    component: SettingsLeaveAppliesToSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
  },
  {
    id: 'leave-colours',
    label: 'Leave Calendar Colours',
    path: '/admin/settings/leave-colours',
    icon: Palette,
    component: SettingsLeaveColoursSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
  },
  {
    id: 'expense-settings',
    label: 'Expense Settings',
    path: '/admin/settings/expense-settings',
    icon: Receipt,
    component: SettingsExpenseSettingsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
  },
  {
    id: 'complaint-settings',
    label: 'Complaint Settings',
    path: '/admin/settings/complaint-settings',
    icon: AlertCircle,
    component: SettingsComplaintSettingsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
  },
  {
    id: 'license-settings',
    label: 'License Settings',
    path: '/admin/settings/license-settings',
    icon: Laptop,
    component: SettingsLicenseSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
  },
  {
    id: 'payroll-settings',
    label: 'Payroll Settings',
    path: '/admin/settings/payroll-settings',
    icon: Banknote,
    component: SettingsPayrollSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'HR',
  },
  {
    id: 'salary-slip-template',
    label: 'Salary Slip Template',
    path: '/admin/settings/salary-slip-template',
    icon: Receipt,
    component: SalarySlipTemplatePage,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Templates',
  },
  {
    id: 'quotation-template',
    label: 'Quotation Template',
    path: '/admin/settings/quotation-template',
    icon: Layers,
    component: QuotationTemplatePage,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Templates',
  },
  // ── Knowledge Base ─────────────────────────────────
  {
    id: 'knowledge-base-categories',
    label: 'Categories',
    path: '/admin/settings/knowledge-base-categories',
    icon: BookOpen,
    component: SettingsKnowledgeBaseSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Knowledge Base',
  },

  // ── Client portal ──────────────────────────────────
  {
    id: 'client-logins',
    label: 'Client logins',
    path: '/admin/settings/client-logins',
    icon: Building,
    component: SettingsClientLoginsSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Clients',
  },

  // ── Test data (QA) ─────────────────────────────────
  {
    id: 'reset-data',
    label: 'Reset data',
    path: '/admin/settings/reset-data',
    icon: Trash2,
    component: SettingsResetDataSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Test data',
  },

  // ── Performance Management ─────────────────────────
  {
    id: 'performance-cycles',
    label: 'Cycle Master',
    path: '/admin/settings/performance-cycles',
    icon: Award,
    component: SettingsPerformanceSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Performance',
  },
  {
    id: 'performance-forms',
    label: 'Question Master',
    path: '/admin/settings/performance-forms',
    icon: ClipboardCheck,
    component: SettingsPerformanceSection,
    isVisible: (user) => Boolean(user?.access?.can_manage_organization),
    group: 'Performance',
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
    id: 'probation-periods',
    label: 'Probation Periods',
    path: '/admin/settings/probation-periods',
    icon: ShieldCheck,
    component: SettingsProbationPeriodsSection,
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
  { id: 'Employee', name: 'Employee', icon: UserCheck },
  { id: 'Sales', name: 'Sales', icon: Handshake },
  { id: 'Tasks', name: 'Tasks', icon: Tag },
  { id: 'Projects', name: 'Projects', icon: Shapes },
  { id: 'HR', name: 'HR', icon: Clock },
  { id: 'Recruitment', name: 'Recruitment', icon: UserPlus },
  { id: 'Knowledge Base', name: 'Knowledge Base', icon: BookOpen },
  { id: 'Performance', name: 'Performance', icon: Award },
  { id: 'Clients', name: 'Clients', icon: Building },
  { id: 'Templates', name: 'Templates', icon: Receipt },
  { id: 'Test data', name: 'Test data', icon: Trash2 },
];
