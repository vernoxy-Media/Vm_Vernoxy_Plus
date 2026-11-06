import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useMessenger } from '@/features/messenger/MessengerContext';
import { Logo } from '@/shared/ui/Logo';
import { Avatar } from '@/shared/ui/Avatar';
import {
  Users,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  Building2,
  Clock,
  Calendar,
  CalendarClock,
  CheckSquare,
  FolderKanban,
  Banknote,
  CalendarOff,
  Receipt,
  AlertCircle,
  Laptop,
  History,
  ShieldCheck,
  Handshake,
  BookOpen,
  BookMarked,
  LayoutDashboard,
  Search,
  X,
  LifeBuoy,
  MessageCircle,
  BarChart3,
  Briefcase,
  BadgeCheck,
  UserPlus,
  FilePlus,
  Award,
  FileText,
  Clock3,
  type LucideIcon,
} from 'lucide-react';
import { useSalesRights } from '@/features/sales/hooks/useSalesRights';
import { usePayrollMe } from '@/features/payroll/hooks/use-payroll';
import { useFollowUpCounters } from '@/features/sales/hooks/useFollowUpCounters';

export interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavChild {
  name: string;
  path: string;
  idKey: string;
  badge?: number;
  isActive: (pathname: string, search: string) => boolean;
}

interface NavEntry {
  name: string;
  /** Where the entry goes; for an entry with children, the first child's path. */
  path: string;
  icon: LucideIcon;
  /** Keeps the element ids that already exist (nav-<idKey>). */
  idKey: string;
  badge?: number;
  isActive: (pathname: string, search: string) => boolean;
  children?: NavChild[];
}

interface NavGroup {
  label: string;
  entries: NavEntry[];
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const starts = (...prefixes: string[]) => (pathname: string) => prefixes.some((p) => pathname.startsWith(p));
const exact = (...paths: string[]) => (pathname: string) => paths.includes(pathname);

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, onToggleCollapse, isMobile = false, onCloseMobile }) => {
  const { user } = useAuth();
  const { totalUnread: messengerUnread } = useMessenger();
  const location = useLocation();
  const { canAccessSales, isAdmin, canImport, canExport } = useSalesRights();
  const { data: payrollMe } = usePayrollMe();
  const { totalDueCount } = useFollowUpCounters();
  /** Sub-menus the person opened or closed by hand; the rest follow the current page. */
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  /** Tab and sub-menu picked by hand; null/undefined means follow the current page. */
  const [tabChoice, setTabChoice] = useState<'common' | 'admin' | null>(null);
  /** The tab that was showing on the page before this one. */
  const lastTab = useRef<'common' | 'admin'>('common');
  const [drillChoice, setDrillChoice] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setTabChoice(null);
    setDrillChoice(undefined);
  }, [location.pathname]);

  if (!user) return null;

  const compact = isCollapsed && !isMobile;
  const searching = query.trim().length > 0;
  const needle = query.trim().toLowerCase();
  const isOrgAdmin = Boolean(user.access?.can_manage_organization);
  const showAdmin = isOrgAdmin || isAdmin || Boolean(user.access?.can_manage_companies);
  const followUpBadge = totalDueCount > 0 ? totalDueCount : undefined;

  const entry = (name: string, path: string, icon: LucideIcon, isActive: NavEntry['isActive'], idKey = slug(name), badge?: number): NavEntry => ({ name, path, icon, idKey, badge, isActive });
  const child = (name: string, path: string, isActive: NavChild['isActive'], idKey = slug(name), badge?: number): NavChild => ({ name, path, isActive, idKey, badge });
  const parent = (name: string, icon: LucideIcon, idKey: string, children: NavChild[]): NavEntry => ({
    name,
    path: children[0].path,
    icon,
    idKey,
    children,
    isActive: (p, q) => children.some((c) => c.isActive(p, q)),
  });

  // Admin pages that open inside a shared hub page, told apart by ?tab=
  const tabParam = (q: string) => new URLSearchParams(q).get('tab') ?? '';
  const leaveAdmin = (p: string, q: string) => p === '/leave' && tabParam(q) === 'requests';
  const expenseAdmin = (p: string, q: string) => p.startsWith('/expense') && ['claims', 'reports'].includes(tabParam(q));
  const complaintAdmin = (p: string, q: string) => p.startsWith('/complaints') && ['manage', 'reports'].includes(tabParam(q));
  const taskAdmin = (p: string, q: string) => p.startsWith('/my-tasks') && tabParam(q) === 'management';
  /** The same hub, but only the person's own side of it, when an admin is also looking at the admin side. */
  const own = (base: NavEntry['isActive'], adminSide: NavEntry['isActive']): NavEntry['isActive'] =>
    isOrgAdmin ? (p, q) => base(p, q) && !adminSide(p, q) : base;

  // The sales screens, in the order the Sales team uses them
  const salesChildren: NavChild[] = [
    child('Company Database', '/sales/companies', starts('/sales/companies'), 'sales-companies'),
    child('Lead Pipeline', '/sales/leads', starts('/sales/leads'), 'sales-leads'),
    child('Follow-ups', '/sales/follow-ups', starts('/sales/follow-ups'), 'sales-follow-ups', followUpBadge),
    child('Clients', '/sales/clients', starts('/sales/clients'), 'sales-clients'),
    child('Reports', '/sales/reports', starts('/sales/reports'), 'sales-reports'),
  ];
  const salesExtras: NavChild[] = [
    ...(canImport || canExport || isAdmin ? [child('Import & Export', '/sales/history', starts('/sales/history', '/sales/import'), 'sales-history')] : []),
    ...(isAdmin ? [child('Permissions', '/sales/rights', starts('/sales/rights'), 'sales-permissions')] : []),
  ];

  const common: NavEntry[] = [
    entry('Dashboard', '/', LayoutDashboard, exact('/'), 'dashboard'),
    entry('Attendance', '/attendance', Clock, starts('/attendance')),
    entry('Tasks', '/my-tasks', CheckSquare, own(starts('/my-tasks', '/tasks'), taskAdmin), 'my-tasks'),
    entry('Projects', '/projects', FolderKanban, starts('/projects')),
    entry('Leaves', '/leave', CalendarOff, own(starts('/leave'), leaveAdmin), 'leave'),
    entry('Performance', '/performance', Award, starts('/performance'), 'performance'),
    entry('Calendar', '/calendar', Calendar, starts('/calendar')),
    entry('Messenger', '/messenger', MessageCircle, starts('/messenger'), 'messenger', messengerUnread > 0 ? messengerUnread : undefined),
    entry('Knowledge Base', '/knowledge-base', BookOpen, (p) => p.startsWith('/knowledge-base') && p !== '/knowledge-base/new'),
    entry('Expenses', '/expense', Receipt, own(starts('/expense', '/expenses'), expenseAdmin)),
    entry('Complaints', '/complaints', AlertCircle, own(starts('/complaints', '/complaint'), complaintAdmin)),
    entry('Licenses', '/licenses', Laptop, starts('/licenses', '/my-software')),
    entry('Salary Slips', '/salary-slips', FileText, starts('/salary-slips'), 'salary-slips'),
    // Payroll BFD 14: Accounts run payroll (admins find it under Finance); Reporting Managers approve OT.
    ...(payrollMe?.can_use_payroll && !isOrgAdmin ? [entry('Payroll', '/admin/payroll', Banknote, starts('/admin/payroll'), 'payroll-accounts')] : []),
    ...(payrollMe?.can_approve_ot && !payrollMe?.can_use_payroll ? [entry('OT Approvals', '/payroll/ot-approvals', Clock3, starts('/payroll/ot-approvals'), 'ot-approvals')] : []),
    entry('Support', '/support', LifeBuoy, starts('/support')),
  ];

  const groups: NavGroup[] = [{ label: 'Common', entries: common }];

  // Sales people see the sales screens as their own group; admins get them inside Admin
  if (canAccessSales && !showAdmin) {
    groups.push({
      label: 'Sales',
      entries: [...salesChildren, ...salesExtras].map((c) => entry(c.name, c.path, salesIcon(c.idKey), c.isActive, c.idKey, c.badge)),
    });
  }

  if (showAdmin) {
    const admin: NavEntry[] = [];
    if (isOrgAdmin) {
      admin.push(
        parent('People', Users, 'people', [
          child('All Employees', '/admin/employees', (p) => p.startsWith('/admin/employees') && p !== '/admin/employees/new', 'employees'),
          child('Add Employee', '/admin/employees/new', exact('/admin/employees/new'), 'add-employee'),
          child('Department', '/departments', starts('/departments', '/admin/departments'), 'departments'),
          child('Recruitment', '/recruitment', starts('/recruitment', '/admin/recruitment'), 'recruitment'),
        ]),
        parent('Time & Leave', CalendarClock, 'time-leave', [
          child('Attendance Management', '/admin/attendance-settings', starts('/admin/attendance-settings'), 'attendance-management'),
          child('Leave Management', '/admin/leave', (p, q) => p.startsWith('/admin/leave') || leaveAdmin(p, q), 'leave-management'),
        ]),
        parent('Work', FolderKanban, 'work', [
          child('Task Management', '/admin/tasks', (p, q) => p.startsWith('/admin/tasks') || taskAdmin(p, q), 'task-management'),
          child('Project Management', '/projects', starts('/projects'), 'projects'),
        ]),
      );
    }
    if (canAccessSales) admin.push(parent('Sales', Handshake, 'sales', [...salesChildren, ...salesExtras]));
    if (isOrgAdmin) {
      admin.push(
        parent('Knowledge Base Admin', BookMarked, 'knowledge-base-management', [
          child('Add Category', '/admin/settings/knowledge-base', starts('/admin/settings/knowledge-base'), 'kb-add-category'),
          child('Create Article', '/knowledge-base/new', exact('/knowledge-base/new'), 'kb-create-article'),
        ]),
        parent('Finance', Banknote, 'finance', [
          child('Expense Management', '/admin/expense', (p, q) => p.startsWith('/admin/expense') || expenseAdmin(p, q), 'expense-management'),
          child('Salary & Payroll', '/admin/payroll', starts('/admin/payroll'), 'payroll'),
        ]),
        entry('Complaint Management', '/admin/complaints', AlertCircle, (p, q) => p.startsWith('/admin/complaint') || complaintAdmin(p, q), 'complaint-management'),
        entry('Settings', '/admin/settings/employment-types', Settings, (p) => p.startsWith('/admin/settings') && !p.startsWith('/admin/settings/knowledge-base'), 'settings'),
      );
    }
    if (user.access?.can_manage_companies) admin.push(entry('Companies (legacy)', '/companies', Building2, starts('/companies'), 'companies'));
    groups.push({ label: 'Admin', entries: admin });
  }

  const adminGroup = groups.find((g) => g.label === 'Admin');
  const baseGroups = groups.filter((g) => g.label !== 'Admin');
  const hasTabs = Boolean(adminGroup) && !compact;
  const adminActive = adminGroup?.entries.some((e) => e.isActive(location.pathname, location.search)) ?? false;
  const commonActive = baseGroups.some((g) => g.entries.some((e) => e.isActive(location.pathname, location.search)));
  // A page that lives in both tabs (Projects) stays in the tab the person clicked it from.
  const followPage: 'common' | 'admin' =
    lastTab.current === 'common' && commonActive ? 'common' : lastTab.current === 'admin' && adminActive ? 'admin' : adminActive ? 'admin' : 'common';
  const tab: 'common' | 'admin' = hasTabs ? (tabChoice ?? followPage) : 'common';
  lastTab.current = tab;
  const autoDrill = adminGroup?.entries.find((e) => e.children && e.isActive(location.pathname, location.search))?.idKey ?? null;
  const drillKey = drillChoice === undefined ? autoDrill : drillChoice;
  const drilled = tab === 'admin' && !searching ? adminGroup?.entries.find((e) => e.idKey === drillKey && e.children) : undefined;
  const showAdminHome = hasTabs && tab === 'admin' && !searching && !drilled;
  /** One group per tab; the search and the narrow sidebar look through everything. */
  const shownGroups = hasTabs && !searching ? (tab === 'admin' ? [] : baseGroups) : groups;

  const rowBase = `group relative flex items-center rounded-lg text-[14px] transition-colors duration-150 ${compact ? 'h-10 justify-center' : 'h-10 gap-3 px-3'}`;
  const rowOn = 'bg-blue-50 font-semibold text-blue-700';
  const rowOff = 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900';

  const iconTile = (Icon: LucideIcon, active: boolean) => (
    <>
      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-blue-600" aria-hidden="true" />}
      <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={active ? 2.25 : 2} />
    </>
  );

  const badge = (value: number, floating?: boolean) => (
    <span
      className={`flex items-center justify-center rounded-full bg-rose-500 font-bold text-white shadow-sm shadow-rose-500/30 ${
        floating ? 'absolute right-1 top-1 h-4 min-w-4 px-1 text-[10px]' : 'h-5 min-w-5 px-1.5 text-[11px]'
      }`}
    >
      {value > 99 ? '99+' : value}
    </span>
  );

  /** What the search keeps: an entry whose name fits, or whose sub-pages fit. */
  const visibleGroups = shownGroups
    .map((g) => ({
      ...g,
      entries: g.entries
        .map((e) => {
          if (!searching) return e;
          if (e.name.toLowerCase().includes(needle)) return e;
          const kids = e.children?.filter((c) => c.name.toLowerCase().includes(needle));
          return kids && kids.length > 0 ? { ...e, children: kids } : null;
        })
        .filter((e): e is NavEntry => e !== null),
    }))
    .filter((g) => g.entries.length > 0);

  const linkId = (key: string) => `${isMobile ? 'mobile-nav-' : 'nav-'}${key}`;

  const renderEntry = (item: NavEntry) => {
    const active = item.isActive(location.pathname, location.search);

    // In the narrow sidebar a sub-menu is just its icon; it opens the first page
    if (!item.children || compact) {
      return (
        <li key={item.idKey}>
          <Link
            to={item.path}
            id={linkId(item.idKey)}
            onClick={isMobile ? onCloseMobile : undefined}
            title={item.name}
            aria-current={active ? 'page' : undefined}
            className={`${rowBase} ${active ? rowOn : rowOff}`}
          >
            {iconTile(item.icon, active)}
            {!compact && <span className="flex-1 truncate">{item.name}</span>}
            {item.badge !== undefined && badge(item.badge, compact)}
          </Link>
        </li>
      );
    }

    const open = searching || (toggled[item.idKey] ?? active);
    const childBadge = item.children.reduce((n, c) => n + (c.badge ?? 0), 0);
    return (
      <li key={item.idKey}>
        <button
          type="button"
          id={linkId(item.idKey)}
          onClick={() => setToggled((t) => ({ ...t, [item.idKey]: !open }))}
          aria-expanded={open}
          className={`${rowBase} w-full ${active && !open ? rowOn : rowOff}`}
        >
          {iconTile(item.icon, active)}
          <span className="flex-1 truncate text-left">{item.name}</span>
          {!open && childBadge > 0 && badge(childBadge)}
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <ul className="ml-[21px] mt-0.5 space-y-0.5 border-l border-slate-200 pl-2.5">
            {item.children.map((c) => {
              const childActive = c.isActive(location.pathname, location.search);
              return (
                <li key={c.idKey}>
                  <Link
                    to={c.path}
                    id={linkId(c.idKey)}
                    onClick={isMobile ? onCloseMobile : undefined}
                    aria-current={childActive ? 'page' : undefined}
                    className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[13.5px] transition-colors ${
                      childActive ? 'font-semibold text-blue-700' : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.badge !== undefined && badge(c.badge)}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  const tile = (Icon: LucideIcon, active: boolean, size = 'h-9 w-9') => (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-xl transition ${
        active ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-700 group-hover:ring-1 group-hover:ring-slate-200'
      }`}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
    </span>
  );

  const rowShell = (active: boolean) =>
    `group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors duration-150 ${active ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-slate-50'}`;

  const renderModule = (item: NavEntry) => {
    const active = item.isActive(location.pathname, location.search);
    const childBadge = item.children?.reduce((n, c) => n + (c.badge ?? 0), 0) ?? 0;
    const count = item.badge ?? childBadge;
    const inner = (
      <>
        {tile(item.icon, active)}
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[14px] font-semibold ${active ? 'text-blue-700' : 'text-slate-800'}`}>{item.name}</span>
          {item.children && <span className="block text-[11.5px] text-slate-400">{item.children.length} pages</span>}
        </span>
        {count > 0 && badge(count)}
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
      </>
    );
    return (
      <li key={item.idKey}>
        {item.children ? (
          <button type="button" id={linkId(item.idKey)} onClick={() => setDrillChoice(item.idKey)} className={rowShell(active)}>
            {inner}
          </button>
        ) : (
          <Link to={item.path} id={linkId(item.idKey)} onClick={isMobile ? onCloseMobile : undefined} aria-current={active ? 'page' : undefined} className={rowShell(active)}>
            {inner}
          </Link>
        )}
      </li>
    );
  };

  const renderDrilled = (item: NavEntry) => {
    const ModuleIcon = item.icon;
    return (
      <div className="animate-in fade-in slide-in-from-right-2 duration-200">
        <button
          type="button"
          id={linkId(`${item.idKey}-back`)}
          onClick={() => setDrillChoice(null)}
          className="mb-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" /> All admin
        </button>
        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-3 ring-1 ring-blue-100">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
            <ModuleIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-slate-900">{item.name}</p>
            <p className="text-[11.5px] text-slate-500">{item.children?.length} pages</p>
          </div>
        </div>
        <ul className="space-y-1">
          {item.children?.map((c) => {
            const on = c.isActive(location.pathname, location.search);
            return (
              <li key={c.idKey}>
                <Link to={c.path} id={linkId(c.idKey)} onClick={isMobile ? onCloseMobile : undefined} aria-current={on ? 'page' : undefined} className={rowShell(on)}>
                  {tile(childIcon(c.idKey, item.icon), on, 'h-8 w-8')}
                  <span className={`flex-1 truncate text-[13.5px] ${on ? 'font-semibold text-blue-700' : 'font-medium text-slate-700'}`}>{c.name}</span>
                  {c.badge !== undefined && badge(c.badge)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

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

      {/* Tabs: everyday pages vs. admin tools */}
      {hasTabs && (
        <div className="shrink-0 px-3 pt-3">
          <div role="tablist" aria-label="Menu sections" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {([['common', 'Menu', LayoutDashboard], ['admin', 'Admin', ShieldCheck]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={linkId(`tab-${key}`)}
                aria-selected={tab === key}
                onClick={() => {
                  setTabChoice(key);
                  setDrillChoice(undefined);
                }}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition ${
                  tab === key && !searching ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search: 20+ pages are quicker to find by name */}
      {!compact && (
        <div className="shrink-0 px-3 pb-1 pt-3">
          <label className="relative block">
            <span className="sr-only">Search menu</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
              placeholder="Search menu"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-[13px] text-slate-800 placeholder:text-slate-400 transition focus:border-blue-300 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 [&::-webkit-search-cancel-button]:hidden"
            />
            {searching && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
        </div>
      )}

      {/* Navigation */}
      <div
        className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? 'px-2' : 'px-3'}`}
      >
        {showAdminHome && adminGroup && (
          <nav aria-label="Admin" className="animate-in fade-in duration-200">
            <p className="mb-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Admin tools</p>
            <ul className="space-y-1">{adminGroup.entries.map(renderModule)}</ul>
          </nav>
        )}
        {drilled && renderDrilled(drilled)}
        {visibleGroups.map((group) => {
          return (
            <nav key={group.label} aria-label={group.label}>
              {compact ? (
                <div className="mx-auto mb-2 h-px w-6 bg-slate-200 first:hidden" aria-hidden />
              ) : (
                <p className="mb-1 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{group.label}</p>
              )}
              <ul className="space-y-0.5">{group.entries.map(renderEntry)}</ul>
            </nav>
          );
        })}
        {searching && visibleGroups.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-slate-400">Nothing matches "{query}"</p>}
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

/** Icons for the pages inside a sub-menu; falls back to the sub-menu's own icon. */
function childIcon(idKey: string, fallback: LucideIcon): LucideIcon {
  const map: Record<string, LucideIcon> = {
    employees: Users,
    'add-employee': UserPlus,
    departments: Building2,
    recruitment: Briefcase,
    'attendance-management': Clock,
    'leave-management': CalendarOff,
    'task-management': CheckSquare,
    projects: FolderKanban,
    'kb-add-category': BookMarked,
    'kb-create-article': FilePlus,
    'expense-management': Receipt,
    payroll: Banknote,
  };
  return map[idKey] ?? (idKey.startsWith('sales-') ? salesIcon(idKey) : fallback);
}

/** Icons for the sales entries when they are shown as a plain list. */
function salesIcon(idKey: string): LucideIcon {
  switch (idKey) {
    case 'sales-companies':
      return Building2;
    case 'sales-leads':
      return Handshake;
    case 'sales-follow-ups':
      return CalendarClock;
    case 'sales-reports':
      return BarChart3;
    case 'sales-clients':
      return BadgeCheck;
    case 'sales-permissions':
      return ShieldCheck;
    case 'sales-history':
      return History;
    default:
      return Briefcase;
  }
}
