import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Avatar } from '@/shared/ui/Avatar';
import { User, LogOut, ChevronDown } from 'lucide-react';

export interface UserMenuProps {
  compact?: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({ compact = false }) => {
  const { user, logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!user) return null;

  const handleProfileClick = () => {
    setIsOpen(false);
    navigate('/');
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  const handleLogoutAll = async () => {
    setIsOpen(false);
    await logoutAll();
    navigate('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        id="top-nav-user-menu-button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-2.5 text-left shadow-sm transition hover:bg-slate-50 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <Avatar
          id="top-nav-user-avatar"
          name={user.name}
          src={user.profile_picture_url}
          size={34}
          className="shrink-0 rounded-lg"
        />
        {!compact && (
          <div className="hidden sm:block text-left">
            <div className="text-[13px] font-semibold leading-tight text-slate-900">{user.name}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-slate-500">
              {user.role?.role_name || 'Employee'}
            </div>
          </div>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          id="top-nav-user-menu-dropdown"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* User info header */}
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <Avatar name={user.name} src={user.profile_picture_url} size={40} className="shrink-0 rounded-xl" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email || user.role?.role_name || 'Employee'}</p>
              <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700 ring-1 ring-blue-100">{user.role?.role_name || 'Employee'}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            {/* Profile option */}
            <button
              type="button"
              id="user-menu-profile-option"
              onClick={handleProfileClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50/60 transition-colors cursor-pointer group"
            >
              <User className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <span>Profile</span>
            </button>

            {/* Logout option */}
            <button
              type="button"
              id="user-menu-logout-option"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 transition-colors cursor-pointer group"
            >
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
              <span>Log out</span>
            </button>

            {/* Logout all devices option */}
            <button
              type="button"
              id="user-menu-logout-all-option"
              onClick={handleLogoutAll}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50/40 transition-colors cursor-pointer group"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition-colors" />
              <span>Log out of all devices</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
