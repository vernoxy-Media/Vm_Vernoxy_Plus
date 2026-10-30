import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Sidebar } from './Sidebar';
import { Logo } from '@/shared/ui/Logo';
import { UserMenu } from './UserMenu';
import { Menu, X, ShieldAlert } from 'lucide-react';

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
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6fa] px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-xs border border-slate-200 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-600 mb-6">
            Organization management requires administrator privileges. Your current role does not have permission to access this area.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex">
      {/* Desktop Fixed Left Sidebar */}
      <aside
        aria-label="Desktop Navigation"
        className={`hidden lg:flex flex-col fixed top-0 bottom-0 left-0 bg-white border-r border-slate-200/80 z-30 transition-all duration-200 ${
          isCollapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
      >
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200/80 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="mobile-menu-button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-bold text-slate-900 text-base">Vernoxy Pulse</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
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
        className={`lg:hidden fixed top-0 bottom-0 left-0 w-72 bg-white z-50 shadow-2xl transition-transform duration-200 transform ${
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
            <X className="w-5 h-5" />
          </button>
        </div>
        <Sidebar
          isMobile={true}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-200 ${
          isCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64'
        }`}
      >
        {/* Desktop Header with Notification Bell & User Account Menu */}
        <header className="hidden lg:flex items-center justify-end h-16 px-8 border-b border-slate-200/60 bg-white/70 backdrop-blur-xs sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-5 w-px bg-slate-200" />
            <UserMenu />
          </div>
        </header>

        <main
          className={`flex-1 min-w-0 w-full overflow-x-hidden px-4 sm:px-6 lg:px-8 pt-20 lg:pt-4 pb-4 ${
            fluid ? 'max-w-full' : 'max-w-7xl'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
