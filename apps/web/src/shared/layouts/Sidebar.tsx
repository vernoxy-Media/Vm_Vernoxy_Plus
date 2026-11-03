import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Logo } from '@/shared/ui/Logo';
import { Avatar } from '@/shared/ui/Avatar';
import {
  Users,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  Building2,
  Clock,
  Calendar,
  CalendarClock,
  CheckSquare,
  FolderKanban,
  UserPlus,
  Banknote,
  CalendarOff,
  Receipt,
  AlertCircle,
  Laptop,
  History,
  ShieldCheck,
  Handshake,
  type LucideIcon,
} from 'lucide-react';
import { useSalesRights } from '@/features/sales/hooks/useSalesRights';
import { useFollowUpCounters } from '@/features/sales/hooks/useFollowUpCounters';

export interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavEntry {
  name: string;
  path: string;
  icon: LucideIcon;
  /** idPrefix keeps the element ids that already exist. */
  idKey: string;
  badge?: number;
  isActive: (pathname: string) => boolean;
}

interface NavGroup {
  label: string;
  entries: NavEntry[];
}

const slug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
const starts = (...prefixes: string[]) => (pathname: string) => prefixes.some((p) => pathname.startsWith(p));

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, onToggleCollapse, isMobile = false, onCloseMobile }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { canAccessSales, isAdmin } = useSalesRights();
  const { totalDueCount } = useFollowUpCounters();

  if (!user) return null;

  const compact = isCollapsed && !isMobile;

  const entry = (name: string, path: string, icon: LucideIcon, isActive: NavEntry['isActive'], idKey = slug(name), badge?: number): NavEntry => ({
    name,
    path,
    icon,
    idKey,
    badge,
    isActive,
  });

  const groups: NavGroup[] = [
    {
      label: 'Workspace',
      entries: [
        entry('Projects', '/projects', FolderKanban, starts('/projects')),
        entry('My Tasks', '/my-tasks', CheckSquare, starts('/my-tasks', '/admin/tasks')),
        entry('Calendar', '/calendar', Calendar, starts('/calendar')),
      ],
    },
    ...(canAccessSales
      ? [
          {
            label: 'Sales CRM',
            entries: [
              entry('Companies', '/sales/companies', Building2, starts('/sales/companies'), 'sales-companies'),
              entry('Leads', '/sales/leads', Handshake, starts('/sales/leads', '/sales/clients'), 'sales-leads'),
              entry('Follow-ups', '/sales/follow-ups', CalendarClock, starts('/sales/follow-ups'), 'sales-follow-ups', totalDueCount > 0 ? totalDueCount : undefined),
              entry('History', '/sales/history', History, starts('/sales/history', '/sales/import'), 'sales-history'),
              ...(isAdmin ? [entry('Permissions', '/sales/rights', ShieldCheck, starts('/sales/rights'), 'sales-permissions')] : []),
            ],
          },
        ]
      : []),
    {
      label: 'My work',
      entries: [
        entry('Attendance', '/attendance', Clock, (p) => p === '/attendance'),
        entry('Leave', '/leave', CalendarOff, starts('/leave', '/admin/leave')),
        entry('Expenses', '/expense', Receipt, starts('/expense', '/expenses', '/admin/expense', '/admin/expenses')),
        entry('Complaints', '/complaints', AlertCircle, starts('/complaints', '/admin/complaint')),
        entry('Licenses', '/licenses', Laptop, starts('/licenses', '/my-software')),
      ],
    },
    ...(user.access?.can_manage_companies || user.access?.can_manage_organization
      ? [
          {
            label: 'Manage',
            entries: [
              ...(user.access?.can_manage_companies ? [entry('Companies', '/companies', Building2, starts('/companies'), 'companies')] : []),
              ...(user.access?.can_manage_organization
                ? [
                    entry('Employees', '/admin/employees', Users, starts('/admin/employees')),
                    entry('Recruitment', '/admin/recruitment', UserPlus, starts('/admin/recruitment')),
                    entry('Payroll', '/admin/payroll', Banknote, starts('/admin/payroll')),
                    entry('Attendance Settings', '/admin/attendance-settings', CalendarClock, starts('/admin/attendance-settings')),
                    entry('Settings', '/admin/settings/departments', Settings, starts('/admin/settings')),
                  ]
                : []),
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Brand */}
      <div className={`flex h-16 shrink-0 items-center gap-2 border-b border-slate-100 ${compact ? 'justify-center px-2' : 'justify-between px-4'}`}>
        <Link to="/" onClick={isMobile ? onCloseMobile : undefined} className="flex min-w-0 items-center gap-3" aria-label="Vernoxy Pulse home">
          <Logo size={34} />
          {!compact && <span className="truncate text-[17px] font-bold tracking-tight text-slate-900">Vernoxy Pulse</span>}
        </Link>

        {!isMobile && onToggleCollapse && !compact && (
          <button
            type="button"
            id="sidebar-collapse-button"
            onClick={onToggleCollapse}
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:flex"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div
        className={`min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent,black_14px,black_calc(100%-24px),transparent)] ${compact ? 'px-2' : 'px-3'}`}
      >
        {groups.map((group) => (
          <nav key={group.label} aria-label={group.label}>
            {compact ? (
              <div className="mx-auto mb-2 h-px w-6 bg-slate-200 first:hidden" aria-hidden />
            ) : (
              <div className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{group.label}</div>
            )}
            <ul className="space-y-0.5">
              {group.entries.map((item) => {
                const Icon = item.icon;
                const active = item.isActive(location.pathname);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      id={`${isMobile ? 'mobile-nav-' : 'nav-'}${item.idKey}`}
                      onClick={isMobile ? onCloseMobile : undefined}
                      title={item.name}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center rounded-xl text-[14px] transition-all duration-150 ${
                        compact ? 'h-11 justify-center' : 'h-11 gap-3 pl-1.5 pr-3'
                      } ${active ? 'bg-blue-50/80 font-semibold text-slate-900 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 ${
                          active
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                            : 'bg-transparent text-slate-400 group-hover:bg-white group-hover:text-slate-700 group-hover:shadow-2xs'
                        }`}
                      >
                        <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.25 : 2} />
                      </span>
                      {!compact && <span className="flex-1 truncate">{item.name}</span>}
                      {item.badge !== undefined && (
                        <span
                          className={`flex items-center justify-center rounded-full bg-rose-500 font-bold text-white shadow-sm shadow-rose-500/30 ${
                            compact ? 'absolute right-1 top-1 h-4 min-w-4 px-1 text-[10px]' : 'h-5 min-w-5 px-1.5 text-[11px]'
                          }`}
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>

      {/* Signed-in person */}
      <div className={`shrink-0 border-t border-slate-100 ${compact ? 'p-2' : 'p-3'}`}>
        {compact ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar name={user.name} src={user.profile_picture_url} size={36} />
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100">
            <Avatar name={user.name} src={user.profile_picture_url} size={36} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight text-slate-900">{user.name}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">{user.role?.role_name || 'Employee'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
