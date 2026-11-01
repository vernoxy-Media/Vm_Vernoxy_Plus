import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  Users,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  Building2,
  Clock,
  CheckSquare,
  FolderKanban,
  Banknote,
  CalendarOff,
  Receipt,
  AlertCircle,
  BookOpen,
  UserPlus,
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

  const isOrgAdmin = Boolean(user.access?.can_manage_organization);

  // Exact ordered navigation items:
  // Employees, Department, Attendance, Leave, Task, Project, Knowledge Base, Expense, Salary & Payroll, Complaint management, Support, Settings
  const navItems = [
    ...(isOrgAdmin
      ? [
        { name: 'Employees', path: '/admin/employees', icon: Users },
        { name: 'Department', path: '/departments', icon: Building2 },
      ]
      : []),
    { name: 'Attendance', path: '/attendance', icon: Clock },
    { name: 'Leave', path: '/leave', icon: CalendarOff },
    { name: 'Task', path: '/my-tasks', icon: CheckSquare },
    { name: 'Project', path: '/projects', icon: FolderKanban },
    { name: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen },
    { name: 'Expense', path: '/expense', icon: Receipt },
    ...(isOrgAdmin
      ? [{ name: 'Salary & Payroll', path: '/admin/payroll', icon: Banknote }]
      : []),
    { name: 'Complaint Management', path: '/complaints', icon: AlertCircle },
    ...(isOrgAdmin
      ? [{ name: 'Recruitment', path: '/recruitment', icon: UserPlus }]
      : []),
    ...(isOrgAdmin
      ? [{ name: 'Settings', path: '/admin/settings/roles', icon: Settings }]
      : []),
  ];

  return (
    <div className="flex flex-col h-full justify-between p-3.5 select-none relative z-10">
      <div className="space-y-4">
        {/* Sidebar Header: Logo is NEVER cropped */}
        {isCollapsed && !isMobile ? (
          <div className="flex flex-col items-center gap-2 pt-1 pb-1 w-full">
            <Link
              to="/"
              className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#5B4CF8] to-[#6C63FF] text-white flex items-center justify-center font-extrabold text-base shadow-sm shadow-indigo-500/30 shrink-0 hover:scale-105 transition-transform"
              title="Vernoxy Pulse"
            >
              V
            </Link>
            {onToggleCollapse && (
              <button
                type="button"
                id="sidebar-collapse-button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-[#F4F4FF] transition-colors cursor-pointer mt-1"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <ChevronsRight className="w-4 h-4 text-slate-400 stroke-[1.75]" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between px-1.5 pt-1 pb-1">
            <Link
              to="/"
              onClick={isMobile ? onCloseMobile : undefined}
              className="flex items-center gap-2.5 group shrink-0"
            >
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#5B4CF8] to-[#6C63FF] text-white flex items-center justify-center font-extrabold text-base shadow-sm shadow-indigo-500/30 shrink-0 group-hover:scale-105 transition-transform">
                V
              </div>
              <span className="font-extrabold text-[#1E293B] text-[15px] tracking-tight truncate">
                Vernoxy Pulse
              </span>
            </Link>

            {!isMobile && onToggleCollapse && (
              <button
                type="button"
                id="sidebar-collapse-button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-[#F4F4FF] transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="w-4 h-4 text-slate-400 stroke-[1.75]" />
              </button>
            )}
          </div>
        )}

        {/* Navigation list: Height 46px, Radius 14px, Hover #F4F4FF, Active #5B4CF8 -> #6C63FF */}
        <nav className="space-y-1 relative z-10" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.name === 'Settings'
                ? location.pathname.startsWith('/admin/settings')
                : item.name === 'Department'
                  ? location.pathname.startsWith('/departments') ||
                  location.pathname.startsWith('/admin/departments') ||
                  location.pathname.startsWith('/admin/settings/departments')
                  : item.name === 'Employees'
                    ? location.pathname.startsWith('/admin/employees') || location.pathname.startsWith('/employees')
                    : item.name === 'Salary & Payroll'
                      ? location.pathname.startsWith('/admin/payroll') || location.pathname.startsWith('/payroll')
                      : item.name === 'Attendance'
                        ? location.pathname === '/attendance'
                        : item.name === 'Leave'
                          ? location.pathname.startsWith('/leave') || location.pathname.startsWith('/admin/leave')
                          : item.name === 'Task'
                            ? location.pathname.startsWith('/my-tasks') ||
                            location.pathname.startsWith('/tasks') ||
                            location.pathname.startsWith('/admin/tasks')
                            : item.name === 'Project'
                              ? location.pathname.startsWith('/projects')
                              : item.name === 'Knowledge Base'
                                ? location.pathname.startsWith('/knowledge-base')
                                : item.name === 'Expense'
                                  ? location.pathname.startsWith('/expense') ||
                                  location.pathname.startsWith('/expenses') ||
                                  location.pathname.startsWith('/admin/expense') ||
                                  location.pathname.startsWith('/admin/expenses')
                                  : item.name === 'Complaint Management'
                                    ? location.pathname.startsWith('/complaints') || location.pathname.startsWith('/admin/complaint')
                                    : item.name === 'Recruitment'
                                      ? location.pathname.startsWith('/recruitment') || location.pathname.startsWith('/admin/recruitment')
                                      : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                id={
                  isMobile
                    ? `mobile-nav-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                    : `nav-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                }
                onClick={isMobile ? onCloseMobile : undefined}
                title={item.name}
                className={`flex items-center gap-3 px-3 h-[46px] rounded-[14px] text-xs font-semibold transition-all duration-150 ${isActive
                    ? 'bg-gradient-to-r from-[#5B4CF8] to-[#6C63FF] text-white shadow-md shadow-indigo-500/20'
                    : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F4F4FF]'
                  } ${isCollapsed && !isMobile ? 'justify-center px-2' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-[#94A3B8] group-hover:text-slate-600'
                    }`}
                  strokeWidth={1.75}
                />
                {(!isCollapsed || isMobile) && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Decorative Layered Lavender Waves inside bottom of sidebar (occupying around 18% of height) */}
      <div className="absolute bottom-0 left-0 right-0 h-[18%] min-h-[110px] pointer-events-none overflow-hidden rounded-b-[28px] z-0">
        <svg
          viewBox="0 0 260 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 left-0 w-full h-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,45 C65,15 155,75 260,32 L260,120 L0,120 Z"
            fill="#E9E4FF"
            opacity="0.25"
          />
          <path
            d="M0,65 C75,35 175,85 260,54 L260,120 L0,120 Z"
            fill="#D8CCFF"
            opacity="0.25"
          />
          <path
            d="M0,82 C95,55 195,95 260,72 L260,120 L0,120 Z"
            fill="#C4B5FD"
            opacity="0.25"
          />
        </svg>
      </div>
    </div>
  );
};
