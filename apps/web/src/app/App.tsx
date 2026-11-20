import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { SocketProvider } from '@/shared/socket/SocketContext';
import { MessengerProvider } from '@/features/messenger/MessengerContext';
import { MeetingReminders } from '@/features/calendar/components/MeetingReminders';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { AdminRoute } from '@/features/auth/components/AdminRoute';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { VerifyOtpPage } from '@/features/auth/pages/VerifyOtpPage';
import { AppThemeSync } from '@/shared/theme/AppThemeSync';
import { NotFoundPage } from './NotFoundPage';
import { CompanyRoute } from '@/features/companies/components/CompanyRoute';
import { AppLayout } from '@/shared/layouts/AppLayout';

// Sales CRM Feature imports
import { SalesRoute } from '@/features/sales/components/common/SalesRoute';

/* Each page is its own download: the app opens after the shell and the page you asked for, not after all 50 pages. */
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const ChangePasswordPage = lazy(() => import('@/features/auth/pages/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })));
const HomePage = lazy(() => import('@/features/home/pages/HomePage').then((m) => ({ default: m.HomePage })));
const SupportPage = lazy(() => import('@/features/support/pages/SupportPage').then((m) => ({ default: m.SupportPage })));
const ClientPortalApp = lazy(() => import('@/features/client-portal/ClientPortalApp').then((m) => ({ default: m.ClientPortalApp })));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const AttendanceSettingsPage = lazy(() => import('@/features/attendance/pages/AttendanceSettingsPage').then((m) => ({ default: m.AttendanceSettingsPage })));
const EmployeesPage = lazy(() => import('@/features/employees/pages/EmployeesPage').then((m) => ({ default: m.EmployeesPage })));
const EmployeeDetailPage = lazy(() => import('@/features/employees/pages/EmployeeDetailPage').then((m) => ({ default: m.EmployeeDetailPage })));
const EmployeeImportPage = lazy(() => import('@/features/employees/pages/EmployeeImportPage').then((m) => ({ default: m.EmployeeImportPage })));
const EmployeeFormPage = lazy(() => import('@/features/employees/pages/EmployeeFormPage').then((m) => ({ default: m.EmployeeFormPage })));
const CandidatesPage = lazy(() => import('@/features/recruitment/pages/CandidatesPage').then((m) => ({ default: m.CandidatesPage })));
const CandidateFormPage = lazy(() => import('@/features/recruitment/pages/CandidateFormPage').then((m) => ({ default: m.CandidateFormPage })));
const CandidateDetailPage = lazy(() => import('@/features/recruitment/pages/CandidateDetailPage').then((m) => ({ default: m.CandidateDetailPage })));
const PayrollRunsPage = lazy(() => import('@/features/payroll/pages/PayrollRunsPage').then((m) => ({ default: m.PayrollRunsPage })));
const PayrollRegisterPage = lazy(() => import('@/features/payroll/pages/PayrollRegisterPage').then((m) => ({ default: m.PayrollRegisterPage })));
const EmployeeSalarySheetPage = lazy(() => import('@/features/payroll/pages/EmployeeSalarySheetPage').then((m) => ({ default: m.EmployeeSalarySheetPage })));
const LeavePage = lazy(() => import('@/features/leave/pages/LeavePage').then((m) => ({ default: m.LeavePage })));
const ExpensesPage = lazy(() => import('@/features/expense/pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const ComplaintsPage = lazy(() => import('@/features/complaint/pages/ComplaintsPage').then((m) => ({ default: m.ComplaintsPage })));
const SoftwareLicensesPage = lazy(() => import('@/features/license/pages/SoftwareLicensesPage').then((m) => ({ default: m.SoftwareLicensesPage })));
const KnowledgeBasePage = lazy(() => import('@/features/knowledge-base/pages/KnowledgeBasePage').then((m) => ({ default: m.KnowledgeBasePage })));
const ArticleDetailPage = lazy(() => import('@/features/knowledge-base/pages/ArticleDetailPage').then((m) => ({ default: m.ArticleDetailPage })));
const ArticleEditorPage = lazy(() => import('@/features/knowledge-base/pages/ArticleEditorPage').then((m) => ({ default: m.ArticleEditorPage })));
const CompaniesListPage = lazy(() => import('@/features/companies/pages/CompaniesListPage').then((m) => ({ default: m.CompaniesListPage })));
const CompanyFormPage = lazy(() => import('@/features/companies/pages/CompanyFormPage').then((m) => ({ default: m.CompanyFormPage })));
const CompanyDetailPage = lazy(() => import('@/features/companies/pages/CompanyDetailPage').then((m) => ({ default: m.CompanyDetailPage })));
const CompanyImportPage = lazy(() => import('@/features/companies/pages/CompanyImportPage').then((m) => ({ default: m.CompanyImportPage })));
const AttendancePage = lazy(() => import('@/features/attendance/pages/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const AttendanceRegisterPage = lazy(() => import('@/features/attendance/pages/AttendanceRegisterPage').then((m) => ({ default: m.AttendanceRegisterPage })));
const CalendarPage = lazy(() => import('@/features/calendar/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const MessengerPage = lazy(() => import('@/features/messenger/pages/MessengerPage').then((m) => ({ default: m.MessengerPage })));
const PerformancePage = lazy(() => import('@/features/performance/pages/PerformancePage').then((m) => ({ default: m.PerformancePage })));
const ProjectsPage = lazy(() => import('@/features/projects/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const MyTasksPage = lazy(() => import('@/features/tasks/pages/MyTasksPage').then((m) => ({ default: m.MyTasksPage })));
const DepartmentsPage = lazy(() => import('@/features/organization/pages/DepartmentsPage').then((m) => ({ default: m.DepartmentsPage })));
const SalesCompaniesListPage = lazy(() => import('@/features/sales/pages/CompaniesListPage').then((m) => ({ default: m.CompaniesListPage })));
const SalesClientsListPage = lazy(() => import('@/features/sales/pages/ClientsListPage').then((m) => ({ default: m.ClientsListPage })));
const SalesReportsPage = lazy(() => import('@/features/sales/pages/SalesReportsPage').then((m) => ({ default: m.SalesReportsPage })));
const SalesCompanyFormPage = lazy(() => import('@/features/sales/pages/CompanyFormPage').then((m) => ({ default: m.CompanyFormPage })));
const SalesCompanyDetailPage = lazy(() => import('@/features/sales/pages/CompanyDetailPage').then((m) => ({ default: m.CompanyDetailPage })));
const LeadsListPage = lazy(() => import('@/features/sales/pages/LeadsListPage').then((m) => ({ default: m.LeadsListPage })));
const LeadDetailPage = lazy(() => import('@/features/sales/pages/LeadDetailPage').then((m) => ({ default: m.LeadDetailPage })));
const FollowUpsPage = lazy(() => import('@/features/sales/pages/FollowUpsPage').then((m) => ({ default: m.FollowUpsPage })));
const SalesImportPage = lazy(() => import('@/features/sales/pages/ImportPage').then((m) => ({ default: m.ImportPage })));
const SalesHistoryPage = lazy(() => import('@/features/sales/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const SalesRightsPage = lazy(() => import('@/features/sales/pages/RightsPage').then((m) => ({ default: m.RightsPage })));
const ClientDetailPage = lazy(() => import('@/features/sales/pages/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })));
const SalesDashboardPage = lazy(() => import('@/features/sales/pages/SalesDashboardPage').then((m) => ({ default: m.SalesDashboardPage })));
const CampaignsPage = lazy(() => import('@/features/sales/pages/CampaignsPage').then((m) => ({ default: m.CampaignsPage })));
const CampaignFormPage = lazy(() => import('@/features/sales/pages/CampaignFormPage').then((m) => ({ default: m.CampaignFormPage })));
const CampaignDetailPage = lazy(() => import('@/features/sales/pages/CampaignDetailPage').then((m) => ({ default: m.CampaignDetailPage })));
const HomeDashboardPage = lazy(() => import('@/features/home-dashboard/pages/HomeDashboardPage').then((m) => ({ default: m.HomeDashboardPage })));

/** Shown for a moment while the page you opened is being fetched. */
const RouteFallback: React.FC = () => (
  <div role="status" aria-label="Loading" className="flex min-h-[60vh] items-center justify-center">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
  </div>
);

/**
 * Once somebody is signed in and the browser is idle, fetch the pages people open most, so the click after that
 * opens at once instead of waiting for the download. Nothing is fetched on a slow or data-saving connection.
 */
const PrefetchPages: React.FC = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '')) return;
    const load = () => {
      void import('@/features/tasks/pages/MyTasksPage');
      void import('@/features/projects/pages/ProjectsPage');
      void import('@/features/calendar/pages/CalendarPage');
      void import('@/features/messenger/pages/MessengerPage');
      void import('@/features/attendance/pages/AttendancePage');
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(load, { timeout: 4000 });
    else window.setTimeout(load, 2500);
  }, [user]);
  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 60 * 45, // 45 minutes (below 1-hour signed URL lifetime)
      refetchOnWindowFocus: true, // Refetch when focusing to prevent broken expired URLs
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppThemeSync />
        <SocketProvider>
          <BrowserRouter>
            <MessengerProvider>
            <MeetingReminders />
            <PrefetchPages />
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/verify" element={<VerifyOtpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              {/* Clients: their own sign in and a read-only view of their projects */}
              <Route path="/client/*" element={<ClientPortalApp />} />

              {/* Authenticated Routes */}
              <Route
                path="/change-password"
                element={
                  <ProtectedRoute>
                    <ChangePasswordPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <HomeDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <AttendancePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance/register"
                element={
                  <AdminRoute>
                    <AppLayout fluid>
                      <AttendanceRegisterPage />
                    </AppLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/attendance/reports"
                element={
                  <AdminRoute>
                    <AppLayout fluid>
                      <AttendanceRegisterPage defaultView="reports" />
                    </AppLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/leave"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <LeavePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              {/* Expense Management Module (Unified Hub) */}
              <Route
                path="/expense"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <ExpensesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={<Navigate to="/expense" replace />}
              />
              {/* Complaint Management Module (Unified Hub) */}
              <Route
                path="/complaints"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <ComplaintsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/complaint"
                element={<Navigate to="/complaints" replace />}
              />

              {/* Software License Management Module (Unified Hub) */}
              <Route
                path="/licenses"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <SoftwareLicensesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/licenses/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <SoftwareLicensesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-software"
                element={<Navigate to="/licenses?tab=my" replace />}
              />
              <Route
                path="/admin/licenses"
                element={<Navigate to="/licenses" replace />}
              />

              {/* Knowledge Base Module (Unified Hub) */}
              <Route
                path="/knowledge-base"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <KnowledgeBasePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/knowledge-base/new"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <ArticleEditorPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/knowledge-base/articles/:identifier"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <ArticleDetailPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/knowledge-base/articles/:identifier/edit"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <ArticleEditorPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance/calendar"
                element={<Navigate to="/attendance?tab=calendar" replace />}
              />
              <Route
                path="/attendance/my-attendance"
                element={<Navigate to="/attendance?tab=calendar" replace />}
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <CalendarPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              {['/messenger', '/messenger/:conversationId'].map((path) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <ProtectedRoute>
                      <AppLayout fluid>
                        <MessengerPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
              ))}
              <Route
                path="/performance"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <PerformancePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <ProjectsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <ProjectsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-tasks"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <MyTasksPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tasks"
                element={<Navigate to="/my-tasks?tab=management" replace />}
              />

              {/* Department Module (Top-Level Sidebar) */}
              <Route
                path="/departments"
                element={
                  <AdminRoute>
                    <AppLayout fluid>
                      <DepartmentsPage />
                    </AppLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/departments"
                element={<Navigate to="/departments" replace />}
              />
              <Route
                path="/admin/settings/departments"
                element={<Navigate to="/departments" replace />}
              />
              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <AppLayout fluid>
                      <SupportPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={<Navigate to="/my-tasks" replace />}
              />
              <Route
                path="/payroll"
                element={<Navigate to="/admin/payroll" replace />}
              />

              {/* Settings & Master Data */}
              <Route
                path="/admin/settings"
                element={<Navigate to="/admin/settings/employment-types" replace />}
              />
              <Route
                path="/admin/settings/knowledge-base"
                element={<Navigate to="/admin/settings/knowledge-base-categories" replace />}
              />
              <Route
                path="/admin/settings/:sectionId"
                element={
                  <AdminRoute>
                    <SettingsPage />
                  </AdminRoute>
                }
              />

              {/* Dedicated Attendance Settings Route */}
              <Route
                path="/admin/attendance-settings"
                element={
                  <AdminRoute>
                    <AttendanceSettingsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/settings/attendance"
                element={<Navigate to="/admin/attendance-settings" replace />}
              />
              <Route
                path="/admin/settings/licenses"
                element={<Navigate to="/admin/settings/license-settings" replace />}
              />
              <Route
                path="/admin/settings/performance"
                element={<Navigate to="/admin/settings/performance-cycles" replace />}
              />
              <Route
                path="/admin/performance-cycles"
                element={<Navigate to="/admin/settings/performance-cycles" replace />}
              />
              <Route
                path="/admin/performance-forms"
                element={<Navigate to="/admin/settings/performance-forms" replace />}
              />
              <Route
                path="/admin/cycle-master"
                element={<Navigate to="/admin/settings/performance-cycles" replace />}
              />
              <Route
                path="/admin/question-master"
                element={<Navigate to="/admin/settings/performance-forms" replace />}
              />

              {/* Backward-compatibility redirects for old URLs */}
              <Route
                path="/admin/roles"
                element={<Navigate to="/admin/settings/roles" replace />}
              />
              <Route path="/admin/projects/dashboard" element={<Navigate to="/projects?tab=dashboard" replace />} />
              <Route path="/projects/dashboard" element={<Navigate to="/projects?tab=dashboard" replace />} />
              <Route path="/admin/attendance/dashboard" element={<Navigate to="/attendance?tab=analytics" replace />} />
              <Route path="/attendance/dashboard" element={<Navigate to="/attendance?tab=analytics" replace />} />
              <Route path="/admin/employees/dashboard" element={<Navigate to="/admin/employees?tab=dashboard" replace />} />
              <Route path="/admin/employee-dashboard" element={<Navigate to="/admin/employees?tab=dashboard" replace />} />
              <Route
                path="/admin/employees"
                element={
                  <AdminRoute>
                    <EmployeesPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/employees/import"
                element={
                  <AdminRoute>
                    <EmployeeImportPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/employees/new"
                element={
                  <AdminRoute>
                    <EmployeeFormPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/employees/:id"
                element={
                  <AdminRoute>
                    <EmployeeDetailPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/employees/:id/edit"
                element={
                  <AdminRoute>
                    <EmployeeFormPage />
                  </AdminRoute>
                }
              />

              {/* Recruitment Module */}
              <Route
                path="/recruitment"
                element={
                  <AdminRoute>
                    <CandidatesPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/recruitment/new"
                element={
                  <AdminRoute>
                    <CandidateFormPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/recruitment/:id"
                element={
                  <AdminRoute>
                    <CandidateDetailPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/recruitment"
                element={
                  <AdminRoute>
                    <CandidatesPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/recruitment/new"
                element={
                  <AdminRoute>
                    <CandidateFormPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/recruitment/:id"
                element={
                  <AdminRoute>
                    <CandidateDetailPage />
                  </AdminRoute>
                }
              />

              {/* Payroll Module */}
              <Route
                path="/admin/payroll"
                element={
                  <AdminRoute>
                    <AppLayout fluid>
                      <PayrollRunsPage />
                    </AppLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/payroll/:year/:month"
                element={
                  <AdminRoute>
                    <AppLayout fluid>
                      <PayrollRegisterPage />
                    </AppLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/payroll/:year/:month/employee/:empId"
                element={
                  <AdminRoute>
                    <AppLayout fluid>
                      <EmployeeSalarySheetPage />
                    </AppLayout>
                  </AdminRoute>
                }
              />

              {/* Leave Management Module (Redirects to Unified Hub) */}
              <Route
                path="/admin/leave"
                element={<Navigate to="/leave?tab=requests" replace />}
              />
              <Route
                path="/admin/leave/requests"
                element={<Navigate to="/leave?tab=requests" replace />}
              />

              {/* Expense Management Module (Redirects to Unified Hub) */}
              <Route
                path="/admin/expense"
                element={<Navigate to="/expense?tab=claims" replace />}
              />
              <Route
                path="/admin/expense/reports"
                element={<Navigate to="/expense?tab=reports" replace />}
              />
              <Route
                path="/admin/expenses"
                element={<Navigate to="/expense?tab=claims" replace />}
              />
              <Route
                path="/admin/expenses/reports"
                element={<Navigate to="/expense?tab=reports" replace />}
              />

              {/* Complaint Management Module Redirects to Unified Hub */}
              <Route
                path="/admin/complaints"
                element={<Navigate to="/complaints?tab=manage" replace />}
              />
              <Route
                path="/admin/complaint"
                element={<Navigate to="/complaints?tab=manage" replace />}
              />
              <Route
                path="/admin/complaints/reports"
                element={<Navigate to="/complaints?tab=reports" replace />}
              />

              {/* Companies Module */}
              <Route
                path="/companies"
                element={
                  <CompanyRoute>
                    <AppLayout fluid>
                      <CompaniesListPage />
                    </AppLayout>
                  </CompanyRoute>
                }
              />
              <Route
                path="/companies/new"
                element={
                  <CompanyRoute>
                    <AppLayout>
                      <CompanyFormPage />
                    </AppLayout>
                  </CompanyRoute>
                }
              />
              <Route
                path="/companies/import"
                element={
                  <CompanyRoute>
                    <AppLayout>
                      <CompanyImportPage />
                    </AppLayout>
                  </CompanyRoute>
                }
              />
              <Route
                path="/companies/:id"
                element={
                  <CompanyRoute>
                    <AppLayout fluid>
                      <CompanyDetailPage />
                    </AppLayout>
                  </CompanyRoute>
                }
              />
              <Route
                path="/companies/:id/edit"
                element={
                  <CompanyRoute>
                    <AppLayout>
                      <CompanyFormPage />
                    </AppLayout>
                  </CompanyRoute>
                }
              />

              {/* Sales CRM Module Routes */}
              <Route
                path="/sales"
                element={<Navigate to="/sales/dashboard" replace />}
              />
              <Route
                path="/sales/dashboard"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <SalesDashboardPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/campaigns"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <CampaignsPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/campaigns/new"
                element={
                  <SalesRoute requireAdmin>
                    <AppLayout fluid>
                      <CampaignFormPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/campaigns/:id/edit"
                element={
                  <SalesRoute requireAdmin>
                    <AppLayout fluid>
                      <CampaignFormPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/campaigns/:id"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <CampaignDetailPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/companies"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <SalesCompaniesListPage key="companies" />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/clients"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <SalesClientsListPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/companies/new"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <SalesCompanyFormPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/companies/:id"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <SalesCompanyDetailPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/companies/:id/edit"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <SalesCompanyFormPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/leads"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <LeadsListPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/leads/:id"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <LeadDetailPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/follow-ups"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <FollowUpsPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/import"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <SalesImportPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/history"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <SalesHistoryPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/reports"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <SalesReportsPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/rights"
                element={
                  <SalesRoute requireAdmin>
                    <AppLayout fluid>
                      <SalesRightsPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />
              <Route
                path="/sales/clients/:id"
                element={
                  <SalesRoute>
                    <AppLayout fluid>
                      <ClientDetailPage />
                    </AppLayout>
                  </SalesRoute>
                }
              />

              {/* 404 Route */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
            </Suspense>
            </MessengerProvider>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
