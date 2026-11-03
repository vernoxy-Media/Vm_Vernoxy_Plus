import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Sidebar } from './Sidebar';
import { UserMenu } from './UserMenu';
import { Menu, X, ShieldAlert, Calendar } from 'lucide-react';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

export interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  headerBackAction?: () => void;
  breadcrumb?: {
    parent: string;
    parentPath?: string;
    current: string;
  };
  fluid?: boolean;
  requireAdmin?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  fluid = true,
  requireAdmin = false,
}) => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) return null;

  // Access control check for administrative areas
  if (requireAdmin && !user.access?.can_manage_organization) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FC] px-4 font-sans">
        <div className="max-w-md w-full rounded-[22px] bg-white p-8 shadow-floating-card border border-[#EDF2F7] text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
            <ShieldAlert className="h-7 w-7 stroke-[1.75]" />
          </div>
          <h1 className="text-xl font-bold text-[#1E293B] mb-2">Access Denied</h1>
          <p className="text-sm text-[#64748B] mb-6">
            Organization management requires administrator privileges. Your current role does not have permission to access this area.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-[14px] bg-gradient-to-r from-[#5B4CF8] to-[#6C63FF] text-sm font-semibold text-white hover:from-[#4E3FE3] hover:to-[#5E55EC] transition-all duration-150 shadow-sm"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen dashboard-canvas-bg text-[#1E293B] font-sans relative overflow-x-hidden flex">
      {/* 2% Monochrome noise texture (Linear / Vercel style) */}
      <div className="noise-overlay" aria-hidden="true" />

      {/* Desktop Floating Left Sidebar (Background #FCFCFD, Border #D4DCE6, Radius 28px, Shadow 0 16px 45px rgba(15,23,42,.10)) */}
      <aside
        aria-label="Desktop Navigation"
        className={`hidden lg:flex flex-col fixed top-3 bottom-3 left-3 bg-[#FCFCFD] rounded-[28px] border border-[#D4DCE6] shadow-floating-sidebar z-30 transition-all duration-200 overflow-hidden ${
          isCollapsed ? 'w-[5rem]' : 'w-[260px]'
        }`}
      >
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </aside>

      {/* Mobile Top Header with Frosted Glass Backdrop Blur (20px) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/75 backdrop-blur-[20px] border-b border-[#D4DCE6] z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="mobile-menu-button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5 stroke-[1.75]" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5B4CF8] to-[#6C63FF] text-white flex items-center justify-center font-extrabold text-base shadow-sm">
              V
            </div>
            <span className="font-bold text-[#1E293B] text-base">Vernoxy Pulse</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link
            to="/calendar"
            id="desktop-header-calendar-btn"
            title="Calendar"
            aria-label="Calendar"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Calendar className="w-5 h-5 stroke-[1.75]" />
          </Link>
          <UserMenu compact />
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 animate-in fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <aside
        aria-label="Mobile Navigation"
        className={`lg:hidden fixed top-0 bottom-0 left-0 w-72 bg-[#FCFCFD] z-50 shadow-2xl transition-transform duration-200 transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5 stroke-[1.75]" />
          </button>
        </div>
        <Sidebar
          isMobile={true}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen relative z-10 transition-all duration-200 ${
          isCollapsed ? 'lg:pl-[5.75rem]' : 'lg:pl-[17.5rem]'
        }`}
      >
        {/* Frosted Glass Header: Background rgba(255,255,255,.75), Backdrop Blur 20px, crisp bottom border #D4DCE6 */}
        <header className="hidden lg:flex items-center justify-end h-16 px-6 lg:px-8 bg-white/75 backdrop-blur-[20px] border-b border-[#D4DCE6] sticky top-0 z-20 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link
              to="/calendar"
              id="desktop-header-calendar-btn"
              title="Calendar"
              aria-label="Calendar"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/80 transition-colors cursor-pointer"
            >
              <Calendar className="w-5 h-5 stroke-[1.75]" />
            </Link>
            <div className="h-5 w-px bg-slate-200/80 mx-1" />
            <UserMenu />
          </div>
        </header>

        <main
          className={`flex-1 min-w-0 w-full overflow-x-hidden px-4 sm:px-6 lg:px-8 pt-[84px] lg:pt-6 pb-8 ${
            fluid ? 'max-w-full' : 'max-w-7xl'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
