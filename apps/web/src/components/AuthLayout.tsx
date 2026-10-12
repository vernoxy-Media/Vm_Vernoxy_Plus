import React from 'react';
import { Logo } from './Logo';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-[420px]">
        {/* Header Branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={52} className="mb-3" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Vernoxy Pulse
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-slate-600">
              {subtitle}
            </p>
          )}
        </div>

        {/* Form Container */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-slate-400">
          Vernoxy Pulse &copy; {new Date().getFullYear()} &middot; Enterprise Security Portal
        </footer>
      </div>
    </main>
  );
};
