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
        className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100/80 transition-colors text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <Avatar
          id="top-nav-user-avatar"
          name={user.name}
          src={user.profile_picture_url}
          size={32}
          className="rounded-lg border border-slate-200/80 shrink-0"
        />
        {!compact && (
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">{user.name}</div>
            <div className="text-[11px] text-slate-400 leading-tight">
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
          className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-100 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.08))' }}
        >
          {/* User info header */}
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {user.email || user.role?.role_name || 'Employee'}
            </p>
          </div>

          <div className="space-y-0.5">
            {/* Profile option */}
            <button
              type="button"
              id="user-menu-profile-option"
              onClick={handleProfileClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/60 transition-colors cursor-pointer group"
            >
              <User className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <span>Profile</span>
            </button>

            {/* Logout option */}
            <button
              type="button"
              id="user-menu-logout-option"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-semibold text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 transition-colors cursor-pointer group"
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
