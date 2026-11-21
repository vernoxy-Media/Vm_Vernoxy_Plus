import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/shared/layouts/AppLayout';
import { DashboardError, DashboardHeader, DashboardSkeleton } from '@/shared/ui/dashboard/DashboardShell';
import { parseApiError } from '@/shared/utils/api-error';
import { SectionHeading } from '../components/dashboard-ui';
import { PayrollOverview, PeopleOverview } from '../components/PeopleSections';
import { useHomeDashboard } from '../hooks/use-home-dashboard';
import { BirthdayCelebrations } from '@/features/attendance/components/BirthdayCelebrations';
import { UpcomingHolidays } from '@/features/attendance/components/UpcomingHolidays';
import type { DashboardProfile, HomeDashboardData } from '../types';
import {
  AttendanceCard,
  ComplaintsCard,
  ExpensesCard,
  KnowledgeBaseCard,
  LeaveCard,
  MessagesCard,
  MyTasksCard,
  RecentActivitiesCard,
  RecentProjectsCard,
  UpcomingDeadlinesCard,
  WorkOverview,
} from '../components/PersonalSections';
import {
  AdminOverview,
  AssignedComplaintsCard,
  ExpenseApprovalsCard,
  ManagedProjectsOverview,
  SalesOverview,
} from '../components/RoleSections';

const PROFILE_TITLE: Record<DashboardProfile, string> = {
  system_admin: 'System Admin Dashboard',
  leadership: 'Leadership Dashboard',
  hr_manager: 'HR Manager Dashboard',
  hr_executive: 'HR Executive Dashboard',
  recruiter: 'Recruiter Dashboard',
  finance_manager: 'Finance Manager Dashboard',
  accountant: 'Accountant Dashboard',
  payroll_executive: 'Payroll Executive Dashboard',
  sales: 'Sales Dashboard',
  business_analyst: 'Business Analyst Dashboard',
  engineering: 'Development / Engineering Dashboard',
  qa: 'QA Dashboard',
  design: 'Design & Creative Dashboard',
  general: 'My Dashboard',
};

const DashboardBody: React.FC<{ data: HomeDashboardData }> = ({ data }) => (
  <div className="space-y-6">
    {/* Birthdays and office holidays lead the dashboard */}
    <BirthdayCelebrations />
    <UpcomingHolidays />

    {/* Role section: present only when the server granted it (Admin role / Sales module access) */}
    {data.admin && <AdminOverview admin={data.admin} />}
    {data.sales && <SalesOverview sales={data.sales} />}
    {data.people && <PeopleOverview people={data.people} profile={data.profile} />}
    {data.payroll && <PayrollOverview payroll={data.payroll} profile={data.profile} />}

    <WorkOverview data={data} />

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr]">
      <MyTasksCard data={data} className="lg:col-span-2 xl:col-span-1" />
      <RecentProjectsCard data={data} />
      <UpcomingDeadlinesCard data={data} />
    </div>

    {/* Assignment-based sections: added only when the person holds the assignment */}
    {data.managed_projects && <ManagedProjectsOverview pm={data.managed_projects} />}
    {(data.expense_approvals || data.assigned_complaints) && (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
        {data.expense_approvals && <ExpenseApprovalsCard section={data.expense_approvals} />}
        {data.assigned_complaints && <AssignedComplaintsCard section={data.assigned_complaints} />}
      </div>
    )}

    {/* People & office updates and personal services. Conditional cards render nothing, so the grid closes up. */}
    <section aria-label="People, Office and Personal Services" className="space-y-3">
      <SectionHeading title="People, Office & Personal Services" />
      {/* Conditional cards render nothing, so the columns follow however many cards are shown: no empty slot at the end */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
        <AttendanceCard data={data} />
        <LeaveCard data={data} />
        <ExpensesCard data={data} />
        <ComplaintsCard data={data} />
      </div>
    </section>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <RecentActivitiesCard data={data} />
      <MessagesCard data={data} />
      <KnowledgeBaseCard data={data} className="lg:col-span-2 xl:col-span-1" />
    </div>
  </div>
);

/** Main User Dashboard (BFD VM-004): the layout is chosen on the server from the person's role and access. */
export const HomeDashboardPage: React.FC = () => {
  const { data, isLoading, isFetching, error, refetch } = useHomeDashboard();
  const queryClient = useQueryClient();

  const refresh = () => {
    refetch();
    // The cards that read other modules' endpoints refresh with the page
    queryClient.invalidateQueries({ queryKey: ['leave-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['birthdays'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-holidays'] });
  };

  const subtitle = data
    ? [data.viewer.role_name, data.viewer.department_name]
        // Role and department can have the same name (Admin in Admin): show it once
        .filter((v, i, all) => Boolean(v) && all.findIndex((x) => x?.trim().toLowerCase() === v?.trim().toLowerCase()) === i)
        .join(' · ') +
      ` · ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
    : undefined;

  return (
    <AppLayout title="Dashboard" fluid>
      <div className="space-y-5">
        <DashboardHeader
          title={data ? PROFILE_TITLE[data.profile] : 'Dashboard'}
          subtitle={subtitle}
          onRefresh={refresh}
          loading={isFetching}
        />
        {isLoading ? (
          <DashboardSkeleton kpis={6} cards={6} />
        ) : error ? (
          <DashboardError message={parseApiError(error, 'The dashboard could not be loaded.').message} onRetry={refresh} />
        ) : data ? (
          <DashboardBody data={data} />
        ) : null}
      </div>
    </AppLayout>
  );
};
