import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Logo } from '@/shared/ui/Logo';
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
  BookOpen,
} from 'lucide-react';

export interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // Base navigation items: Projects, My Tasks, Attendance, Leave, Companies, Employees, Recruitment, Settings
  const navItems = [
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'My Tasks', path: '/my-tasks', icon: CheckSquare },
    { name: 'Attendance', path: '/attendance', icon: Clock },
    { name: 'Leave', path: '/leave', icon: CalendarOff },
    { name: 'Expenses', path: '/expense', icon: Receipt },
    { name: 'Complaints', path: '/complaints', icon: AlertCircle },
    { name: 'Licenses', path: '/licenses', icon: Laptop },
    { name: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    ...(user.access?.can_manage_companies
      ? [{ name: 'Companies', path: '/companies', icon: Building2 }]
      : []),
    ...(user.access?.can_manage_organization
      ? [
          { name: 'Employees', path: '/admin/employees', icon: Users },
          { name: 'Recruitment', path: '/admin/recruitment', icon: UserPlus },
          { name: 'Payroll', path: '/admin/payroll', icon: Banknote },
          { name: 'Attendance Settings', path: '/admin/attendance-settings', icon: CalendarClock },
          { name: 'Settings', path: '/admin/settings/departments', icon: Settings },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="space-y-4">
        {/* Logo & Product Name & Collapse Button */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <Link
            to="/"
            onClick={isMobile ? onCloseMobile : undefined}
            className="flex items-center gap-3 overflow-hidden"
          >
            <Logo size={36} />
            {(!isCollapsed || isMobile) && (
              <span className="font-bold text-slate-900 text-lg tracking-tight truncate">
                Vernoxy Pulse
              </span>
            )}
          </Link>

          {!isMobile && onToggleCollapse && (
            <button
              type="button"
              id="sidebar-collapse-button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="space-y-1.5 pt-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.name === 'Settings'
                ? location.pathname.startsWith('/admin/settings')
                : item.path === '/'
                ? location.pathname === '/'
                : item.path === '/attendance'
                ? location.pathname === '/attendance'
                : item.path === '/leave'
                ? location.pathname.startsWith('/leave') || location.pathname.startsWith('/admin/leave')
                : item.path === '/expense'
                ? location.pathname.startsWith('/expense') || location.pathname.startsWith('/expenses') || location.pathname.startsWith('/admin/expense') || location.pathname.startsWith('/admin/expenses')
                : item.path === '/my-tasks'
                ? location.pathname.startsWith('/my-tasks') || location.pathname.startsWith('/admin/tasks')
                : item.path === '/complaints'
                ? location.pathname.startsWith('/complaints') || location.pathname.startsWith('/admin/complaint')
                : item.path === '/licenses'
                ? location.pathname.startsWith('/licenses') || location.pathname.startsWith('/my-software')
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                id={isMobile ? `mobile-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}` : `nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={isMobile ? onCloseMobile : undefined}
                title={item.name}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs shadow-blue-100/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                } ${isCollapsed && !isMobile ? 'justify-center px-2' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                {(!isCollapsed || isMobile) && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Collapse hint for collapsed state */}
      {isCollapsed && !isMobile && onToggleCollapse && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 text-slate-400 hover:text-slate-700"
            title="Expand sidebar"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
