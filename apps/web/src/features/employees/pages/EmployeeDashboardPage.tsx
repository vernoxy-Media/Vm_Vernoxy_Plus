import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Plus,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import { useEmployeeDashboardData } from '../hooks/use-employee-dashboard';
import {
  EmployeeDashboardFilters,
  INITIAL_DASHBOARD_FILTERS,
} from '../components/dashboard/dashboard.types';
import {
  computeActiveEmployeeCount,
  computeDepartmentDistribution,
  computeMultipleDepartmentAssignments,
  computeReportingManagerSpan,
  computeMonthlyEmployeeMovement,
  computeEmployeeTenureDistribution,
  filterEmployeesByCommonCriteria,
} from '../components/dashboard/dashboard.utils';
import { DashboardFilterBar } from '../components/dashboard/DashboardFilterBar';
import { ActiveEmployeeCountCard } from '../components/dashboard/ActiveEmployeeCountCard';
import { DepartmentDistributionChart } from '../components/dashboard/DepartmentDistributionChart';
import { MultipleDepartmentWaffleChart } from '../components/dashboard/MultipleDepartmentWaffleChart';
import { ReportingManagerLollipopChart } from '../components/dashboard/ReportingManagerLollipopChart';
import { MonthlyMovementComboChart } from '../components/dashboard/MonthlyMovementComboChart';
import { TenureDistributionChart } from '../components/dashboard/TenureDistributionChart';

export const EmployeeDashboardPage: React.FC = () => {
  // Global Filters State (all default to All, search empty)
  const [filters, setFilters] = useState<EmployeeDashboardFilters>(INITIAL_DASHBOARD_FILTERS);

  // Load centralized employee dataset & master options
  const {
    employees,
    departments,
    roles,
    genderLookups,
    employmentTypeLookups,
    managerOptions,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useEmployeeDashboardData();

  // Reset all filters to default
  const handleClearFilters = () => {
    setFilters(INITIAL_DASHBOARD_FILTERS);
  };

  // Central filtered dataset for indicator count
  const filteredCommonEmployees = useMemo(() => {
    return filterEmployeesByCommonCriteria(employees, filters);
  }, [employees, filters]);

  // Compute 6 chart data sets through centralized architecture
  const activeCount = useMemo(() => {
    return computeActiveEmployeeCount(employees, filters);
  }, [employees, filters]);

  const departmentDistribution = useMemo(() => {
    return computeDepartmentDistribution(employees, filters, departments);
  }, [employees, filters, departments]);

  const multipleDeptAssignments = useMemo(() => {
    return computeMultipleDepartmentAssignments(employees, filters);
  }, [employees, filters]);

  const managerSpan = useMemo(() => {
    return computeReportingManagerSpan(employees, filters);
  }, [employees, filters]);

  const monthlyMovement = useMemo(() => {
    return computeMonthlyEmployeeMovement(employees, filters);
  }, [employees, filters]);

  const tenureDistribution = useMemo(() => {
    return computeEmployeeTenureDistribution(employees, filters);
  }, [employees, filters]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Employee Management
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Dashboard Overview &bull; Workforce strength, department allocation, span of control, movement & tenure
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh dashboard data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              to="/admin/employees"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>All Employees</span>
            </Link>

            <Link
              to="/admin/employees/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </Link>
          </div>
        </div>

        {/* Global Filters & Search Section */}
        <DashboardFilterBar
          filters={filters}
          onChangeFilters={setFilters}
          onClearFilters={handleClearFilters}
          departments={departments}
          roles={roles}
          managerOptions={managerOptions}
          genderLookups={genderLookups}
          employmentTypeLookups={employmentTypeLookups}
          totalFilteredCount={filteredCommonEmployees.length}
          totalUnfilteredCount={employees.length}
        />

        {/* Dashboard Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-800">Loading Employee Management Dashboard...</p>
            <p className="text-xs text-slate-400 mt-1">Aggregating workforce strength, tenure, and department assignments</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-slate-200 bg-white text-center px-4 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Failed to load employee records</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              There was an issue retrieving organization data from the server.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <div className={`transition-opacity duration-200 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
            {/* Six Dashboard Charts in 3-Column Desktop Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Chart 1: Active Employee Count (US02) */}
              <div className="min-h-[360px]">
                <ActiveEmployeeCountCard
                  count={activeCount}
                  filters={filters}
                />
              </div>

              {/* Chart 2: Department-wise Employee Distribution (US03) */}
              <div className="min-h-[360px]">
                <DepartmentDistributionChart
                  departments={departmentDistribution}
                  filters={filters}
                />
              </div>

              {/* Chart 3: Employees with Multiple Department Assignments (US04) */}
              <div className="min-h-[360px]">
                <MultipleDepartmentWaffleChart
                  categories={multipleDeptAssignments.categories}
                  totalEligible={multipleDeptAssignments.totalEligible}
                  filters={filters}
                />
              </div>

              {/* Chart 4: Reporting Manager Span of Control (US05) */}
              <div className="min-h-[360px]">
                <ReportingManagerLollipopChart
                  managers={managerSpan}
                  filters={filters}
                />
              </div>

              {/* Chart 5: Monthly Employee Movement (US06) */}
              <div className="min-h-[360px]">
                <MonthlyMovementComboChart
                  movement={monthlyMovement}
                  filters={filters}
                />
              </div>

              {/* Chart 6: Employee Tenure Distribution (US07) */}
              <div className="min-h-[360px]">
                <TenureDistributionChart
                  categories={tenureDistribution.categories}
                  totalActive={tenureDistribution.totalActive}
                  filters={filters}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
