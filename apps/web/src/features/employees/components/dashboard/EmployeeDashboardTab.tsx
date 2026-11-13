import React, { useState, useMemo } from 'react';
import { Users, UserCheck, UserX, Building2 } from 'lucide-react';
import { useEmployeeDashboardData } from '../../hooks/use-employee-dashboard';
import { EmployeeDashboardFilters, INITIAL_DASHBOARD_FILTERS } from './dashboard.types';
import {
  computeActiveEmployeeCount,
  computeDepartmentDistribution,
  computeMultipleDepartmentAssignments,
  computeReportingManagerSpan,
  computeMonthlyEmployeeMovement,
  computeEmployeeTenureDistribution,
  filterEmployeesByCommonCriteria,
} from './dashboard.utils';
import { DashboardFilterBar } from './DashboardFilterBar';
import { ActiveEmployeeCountCard } from './ActiveEmployeeCountCard';
import { DepartmentDistributionChart } from './DepartmentDistributionChart';
import { MultipleDepartmentWaffleChart } from './MultipleDepartmentWaffleChart';
import { ReportingManagerLollipopChart } from './ReportingManagerLollipopChart';
import { MonthlyMovementComboChart } from './MonthlyMovementComboChart';
import { TenureDistributionChart } from './TenureDistributionChart';
import {
  DASH_GRID,
  DashboardEmpty,
  DashboardError,
  DashboardHeader,
  DashboardSkeleton,
  KpiStat,
} from '@/shared/ui/dashboard/DashboardShell';

interface EmployeeDashboardTabProps {
  onNavigateToEmployees?: (params?: Record<string, string>) => void;
}

export const EmployeeDashboardTab: React.FC<EmployeeDashboardTabProps> = () => {
  const [filters, setFilters] = useState<EmployeeDashboardFilters>(INITIAL_DASHBOARD_FILTERS);

  const { employees, departments, roles, genderLookups, employmentTypeLookups, managerOptions, isLoading, isFetching, isError, refetch } =
    useEmployeeDashboardData();

  const handleClearFilters = () => setFilters(INITIAL_DASHBOARD_FILTERS);

  const filteredCommonEmployees = useMemo(() => filterEmployeesByCommonCriteria(employees, filters), [employees, filters]);
  const activeCount = useMemo(() => computeActiveEmployeeCount(employees, filters), [employees, filters]);
  const departmentDistribution = useMemo(() => computeDepartmentDistribution(employees, filters, departments), [employees, filters, departments]);
  const multipleDeptAssignments = useMemo(() => computeMultipleDepartmentAssignments(employees, filters), [employees, filters]);
  const managerSpan = useMemo(() => computeReportingManagerSpan(employees, filters), [employees, filters]);
  const monthlyMovement = useMemo(() => computeMonthlyEmployeeMovement(employees, filters), [employees, filters]);
  const tenureDistribution = useMemo(() => computeEmployeeTenureDistribution(employees, filters), [employees, filters]);

  const kpi = useMemo(() => {
    const active = filteredCommonEmployees.filter((e) => e.status === 'Active').length;
    const total = filteredCommonEmployees.length;
    return { total, active, inactive: total - active, activePct: total ? Math.round((active / total) * 100) : 0 };
  }, [filteredCommonEmployees]);

  if (isLoading) return <DashboardSkeleton kpis={4} cards={6} />;

  return (
    <div className="w-full min-w-0 max-w-full space-y-5 sm:space-y-6">
      <DashboardHeader
        title="Employee dashboard"
        subtitle={`${employees.length} employees · ${filteredCommonEmployees.length} match the filters`}
        onRefresh={() => void refetch()}
        loading={isFetching}
      />

      {isError ? (
        <DashboardError title="The employee data could not be loaded" message="There was a problem reading the employees from the server." onRetry={() => void refetch()} />
      ) : (
        <>
          <div className={`grid grid-cols-2 gap-3 transition-opacity sm:gap-3.5 lg:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}>
            <KpiStat label="Employees" value={kpi.total} hint="Matching the filters" icon={Users} tone="blue" />
            <KpiStat label="Active" value={kpi.active} suffix={`${kpi.activePct}%`} percent={kpi.activePct} hint="Currently working" icon={UserCheck} tone="emerald" />
            <KpiStat label="Inactive" value={kpi.inactive} hint="Left or on a break" icon={UserX} tone="rose" />
            <KpiStat label="Departments" value={departments.length} hint="In the organization" icon={Building2} tone="purple" />
          </div>

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

          {filteredCommonEmployees.length === 0 ? (
            <DashboardEmpty icon={Users} title="No employees found for the selected filters." hint="Try another department, role, manager or search word." onClear={handleClearFilters} />
          ) : (
            <div className={`${DASH_GRID} transition-opacity duration-200 ${isFetching ? 'opacity-70' : ''}`}>
              <div className="min-h-[360px] min-w-0">
                <ActiveEmployeeCountCard count={activeCount} filters={filters} />
              </div>
              <div className="min-h-[360px] min-w-0">
                <DepartmentDistributionChart departments={departmentDistribution} filters={filters} />
              </div>
              <div className="min-h-[360px] min-w-0">
                <MultipleDepartmentWaffleChart categories={multipleDeptAssignments.categories} totalEligible={multipleDeptAssignments.totalEligible} filters={filters} />
              </div>
              <div className="min-h-[360px] min-w-0">
                <ReportingManagerLollipopChart managers={managerSpan} filters={filters} />
              </div>
              <div className="min-h-[360px] min-w-0">
                <MonthlyMovementComboChart movement={monthlyMovement} filters={filters} />
              </div>
              <div className="min-h-[360px] min-w-0">
                <TenureDistributionChart categories={tenureDistribution.categories} totalActive={tenureDistribution.totalActive} filters={filters} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
