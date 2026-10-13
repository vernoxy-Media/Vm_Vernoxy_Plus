import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { LoginPage } from './pages/LoginPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SettingsPage } from './pages/admin/settings/SettingsPage';
import { EmployeesPage } from './pages/admin/EmployeesPage';
import { EmployeeFormPage } from './pages/admin/EmployeeFormPage';
import { CompanyRoute } from './features/companies/components/CompanyRoute';
import { CompaniesListPage } from './features/companies/pages/CompaniesListPage';
import { CompanyFormPage } from './features/companies/pages/CompanyFormPage';
import { CompanyDetailPage } from './features/companies/pages/CompanyDetailPage';
import { CompanyImportPage } from './features/companies/pages/CompanyImportPage';
import { AppLayout } from './components/AppLayout';

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

            {/* Settings & Master Data */}
            <Route
              path="/admin/settings"
              element={<Navigate to="/admin/settings/departments" replace />}
            />
            <Route
              path="/admin/settings/:sectionId"
              element={
                <AdminRoute>
                  <SettingsPage />
                </AdminRoute>
              }
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
              path="/admin/employees/:id/edit"
              element={
                <AdminRoute>
                  <EmployeeFormPage />
                </AdminRoute>
              }
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
      </AuthProvider>
    </QueryClientProvider>
  );
};
