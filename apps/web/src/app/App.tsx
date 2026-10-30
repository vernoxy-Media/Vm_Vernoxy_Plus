import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { SocketProvider } from '@/shared/socket/SocketContext';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { AdminRoute } from '@/features/auth/components/AdminRoute';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { VerifyOtpPage } from '@/features/auth/pages/VerifyOtpPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage';
import { HomePage } from '@/features/home/pages/HomePage';
import { NotFoundPage } from './NotFoundPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { AttendanceSettingsPage } from '@/features/attendance/pages/AttendanceSettingsPage';
import { EmployeesPage } from '@/features/employees/pages/EmployeesPage';
import { EmployeeDetailPage } from '@/features/employees/pages/EmployeeDetailPage';
import { EmployeeFormPage } from '@/features/employees/pages/EmployeeFormPage';
import { CandidatesPage } from '@/features/recruitment/pages/CandidatesPage';
import { CandidateFormPage } from '@/features/recruitment/pages/CandidateFormPage';
import { CandidateDetailPage } from '@/features/recruitment/pages/CandidateDetailPage';
import { PayrollRunsPage } from '@/features/payroll/pages/PayrollRunsPage';
import { PayrollRegisterPage } from '@/features/payroll/pages/PayrollRegisterPage';
import { EmployeeSalarySheetPage } from '@/features/payroll/pages/EmployeeSalarySheetPage';
import { LeavePage } from '@/features/leave/pages/LeavePage';
import { ExpensesPage } from '@/features/expense/pages/ExpensesPage';
import { ComplaintsPage } from '@/features/complaint/pages/ComplaintsPage';
import { SoftwareLicensesPage } from '@/features/license/pages/SoftwareLicensesPage';
import { KnowledgeBasePage } from '@/features/knowledge-base/pages/KnowledgeBasePage';
import { ArticleDetailPage } from '@/features/knowledge-base/pages/ArticleDetailPage';
import { ArticleEditorPage } from '@/features/knowledge-base/pages/ArticleEditorPage';
import { CompanyRoute } from '@/features/companies/components/CompanyRoute';
import { CompaniesListPage } from '@/features/companies/pages/CompaniesListPage';
import { CompanyFormPage } from '@/features/companies/pages/CompanyFormPage';
import { CompanyDetailPage } from '@/features/companies/pages/CompanyDetailPage';
import { CompanyImportPage } from '@/features/companies/pages/CompanyImportPage';
import { AttendancePage } from '@/features/attendance/pages/AttendancePage';
import { CalendarPage } from '@/features/calendar/pages/CalendarPage';
import { ProjectsPage } from '@/features/projects/pages/ProjectsPage';
import { ProjectDetailPage } from '@/features/projects/pages/ProjectDetailPage';
import { MyTasksPage } from '@/features/tasks/pages/MyTasksPage';
import { AppLayout } from '@/shared/layouts/AppLayout';

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
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/verify" element={<VerifyOtpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

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
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
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
                element={<Navigate to="/calendar" replace />}
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
                      <ProjectDetailPage />
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

              {/* Settings & Master Data */}
              <Route
                path="/admin/settings"
                element={<Navigate to="/admin/settings/departments" replace />}
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

              {/* Backward-compatibility redirects for old URLs */}
              <Route
                path="/admin/departments"
                element={<Navigate to="/admin/settings/departments" replace />}
              />
              <Route
                path="/admin/roles"
                element={<Navigate to="/admin/settings/roles" replace />}
              />
              <Route
                path="/admin/employees"
                element={
                  <AdminRoute>
                    <EmployeesPage />
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

              {/* 404 Route */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
