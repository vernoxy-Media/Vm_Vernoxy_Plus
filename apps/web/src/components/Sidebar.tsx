import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import {
  Users,
  User,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Settings,
  Building2,
  Clock,
  Calendar,
  CalendarClock,
  CheckSquare,
  LayoutGrid,
  FolderKanban,
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
  const { user, logout, logoutAll } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLogoutAll = async () => {
    await logoutAll();
    navigate('/login');
  };

  if (!user) return null;

  // Base navigation items: Profile, My Tasks, Attendance, Companies, Employees, Settings
  const navItems = [
    { name: 'Profile', path: '/', icon: User },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'My Tasks', path: '/my-tasks', icon: CheckSquare },
    { name: 'Attendance', path: '/attendance', icon: Clock },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    ...(user.access?.can_manage_companies
      ? [{ name: 'Companies', path: '/companies', icon: Building2 }]
      : []),
    ...(user.access?.can_manage_organization
      ? [
          { name: 'Task Management', path: '/admin/tasks', icon: LayoutGrid },
          { name: 'Employees', path: '/admin/employees', icon: Users },
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
              className="hidden lg:flex p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* User Card Under Logo */}
        <div className="relative" ref={userMenuRef}>
          <div
            id="sidebar-user-card"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`flex items-center gap-3 p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/80 cursor-pointer transition-all shadow-xs ${
              isCollapsed && !isMobile ? 'justify-center p-2' : ''
            }`}
          >
            <Avatar
              id="sidebar-user-avatar"
              name={user.name}
              src={user.profile_picture_url}
              size={36}
              className="rounded-xl border border-slate-100 shrink-0"
            />
            {(!isCollapsed || isMobile) && (
              <div className="flex-1 min-w-0 text-left">
                <p id="sidebar-user-name" className="text-xs font-bold text-slate-900 truncate">
                  {user.name}
                </p>
                <p id="sidebar-user-role" className="text-xs text-slate-500 truncate">
                  {user.role?.role_name || 'Staff'}
                </p>
              </div>
            )}
            {(!isCollapsed || isMobile) && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isUserMenuOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </div>

          {/* User Card Dropdown Menu */}
          {isUserMenuOpen && (
            <div
              id="sidebar-user-menu"
              className="absolute left-0 right-0 mt-1.5 py-1 bg-white rounded-xl shadow-lg border border-slate-200 z-50 text-xs text-slate-700 animate-in fade-in"
              style={{ minWidth: isCollapsed && !isMobile ? '160px' : 'auto' }}
            >
              <button
                type="button"
                id="admin-logout-button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
                <span>Log out</span>
              </button>
              <button
                type="button"
                id="admin-logout-all-button"
                onClick={handleLogoutAll}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-rose-50 text-rose-600 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Log out of all devices</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="space-y-1.5 pt-2" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.name === 'Settings'
                ? location.pathname.startsWith('/admin/settings')
                : item.path === '/'
                ? location.pathname === '/'
                : item.path === '/attendance'
                ? location.pathname === '/attendance'
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
