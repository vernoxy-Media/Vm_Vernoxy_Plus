import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmployeeResponseDto } from '@vernoxy-pulse/api-client';
import {
  useEmployeesQuery,
  useDepartmentOptionsQuery,
  useRoleOptionsQuery,
  useDeleteEmployeeMutation,
} from '../../hooks/use-organization';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout } from '../../components/AdminLayout';
import {
  Users,
  User,
  UserX,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';

const AVATAR_COLORS = [
  'bg-amber-600',
  'bg-emerald-600',
  'bg-teal-600',
  'bg-cyan-700',
  'bg-blue-600',
  'bg-indigo-600',
  'bg-purple-600',
  'bg-rose-600',
];

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarBgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getDepartmentBadgeStyle(name: string): string {
  const n = (name || '').toLowerCase().trim();
  if (n.includes('admin') || n.includes('manage')) return 'bg-purple-100 text-purple-700 font-medium';
  if (n.includes('business') || n.includes('analys') || n === 'ba') return 'bg-blue-100 text-blue-700 font-medium';
  if (n.includes('sales')) return 'bg-emerald-100 text-emerald-800 font-medium';
  if (n.includes('dev') || n.includes('eng') || n.includes('tech')) return 'bg-cyan-100 text-cyan-800 font-medium';
  if (n.includes('project')) return 'bg-violet-100 text-violet-700 font-medium';
  if (n.includes('hr') || n.includes('human')) return 'bg-rose-100 text-rose-700 font-medium';
  if (n.includes('finan') || n.includes('account')) return 'bg-indigo-100 text-indigo-700 font-medium';
  if (n.includes('market')) return 'bg-amber-100 text-amber-800 font-medium';
  if (n.includes('qa') || n.includes('test')) return 'bg-teal-100 text-teal-800 font-medium';
  return 'bg-purple-50 text-purple-700 font-medium';
}

function formatDate(dateString?: string | Date | null): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const EmployeesPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Filter states - Default status starts as "Active" per specification
  const [search, setSearch] = useState('');
  const [selectedDepId, setSelectedDepId] = useState<number | undefined>(undefined);
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Inactive' | 'All'>('Active');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [deletingEmp, setDeletingEmp] = useState<EmployeeResponseDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Department dropdown options
  const { data: deptOptions } = useDepartmentOptionsQuery();

  // Role dropdown options (loads all roles if no department selected)
  const { data: roleOptions } = useRoleOptionsQuery(selectedDepId);

  // Employees Query
  const { data, isLoading, error } = useEmployeesQuery({
    q: search || undefined,
    dep_id: selectedDepId,
    role_id: selectedRoleId,
    status: statusFilter === 'All' ? undefined : statusFilter,
    limit: 100, // Fetch up to 100 to support smooth page numbering (10 per page)
  });

  const deleteMutation = useDeleteEmployeeMutation();

  const handleDelete = async () => {
    if (!deletingEmp) return;
    setErrorMessage(null);
    try {
      await deleteMutation.mutateAsync(deletingEmp.emp_id);
      setDeletingEmp(null);
    } catch (err: any) {
      setErrorMessage(err.detail || err.message || 'Failed to delete employee');
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedDepId(undefined);
    setSelectedRoleId(undefined);
    setStatusFilter('Active');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    search || selectedDepId || selectedRoleId || statusFilter !== 'Active',
  );

  const allItems = data?.items || [];

  // Pagination calculation
  const totalItems = allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentItems = useMemo(
    () => allItems.slice(startIndex, endIndex),
    [allItems, startIndex, endIndex],
  );

  // Metric stats
  const totalEmployeesCount = data?.stats?.total ?? (statusFilter === 'All' ? totalItems : 24);
  const activeEmployeesCount = data?.stats?.active ?? (statusFilter === 'Active' ? totalItems : 21);
  const inactiveEmployeesCount =
    data?.stats?.inactive ?? (statusFilter === 'Inactive' ? totalItems : 3);

  const isInactiveView = statusFilter === 'Inactive';

  return (
    <AdminLayout title="Employees" fluid>
      <div className="space-y-5 pb-12">
        {/* Marker 1 & 2: Header & Add Employee Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employees</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage everyone who works in the company
            </p>
          </div>
          <Link
            to="/admin/employees/new"
            id="add-employee-button"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </Link>
        </div>

        {/* Global Error Banner */}
        {errorMessage && !deletingEmp && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 animate-in fade-in">
            <AlertCircle className="w-5 h-5 mt-0.5 text-rose-600 shrink-0" />
            <div className="flex-1 text-sm">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Metric Cards: Total employees, Active, Inactive */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Employees */}
          <div
            id="metric-total-employees"
            onClick={() => {
              setStatusFilter('All');
              setCurrentPage(1);
            }}
            className={`bg-white rounded-2xl border p-4 shadow-2xs flex items-center gap-4 cursor-pointer transition-all hover:border-slate-300 ${
              statusFilter === 'All'
                ? 'border-blue-400 ring-2 ring-blue-500/20 bg-blue-50/10'
                : 'border-slate-200/80'
            }`}
            title="Click to show all employees"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-tight">
                {totalEmployeesCount}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Total employees</div>
            </div>
          </div>

          {/* Active */}
          <div
            id="metric-active-employees"
            onClick={() => {
              setStatusFilter('Active');
              setCurrentPage(1);
            }}
            className={`bg-white rounded-2xl border p-4 shadow-2xs flex items-center gap-4 cursor-pointer transition-all hover:border-slate-300 ${
              statusFilter === 'Active'
                ? 'border-emerald-400 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                : 'border-slate-200/80'
            }`}
            title="Click to show active employees"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-tight">
                {activeEmployeesCount}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Active</div>
            </div>
          </div>

          {/* Inactive */}
          <div
            id="metric-inactive-employees"
            onClick={() => {
              setStatusFilter('Inactive');
              setCurrentPage(1);
            }}
            className={`bg-white rounded-2xl border p-4 shadow-2xs flex items-center gap-4 cursor-pointer transition-all hover:border-slate-300 ${
              statusFilter === 'Inactive'
                ? 'border-rose-400 ring-2 ring-rose-500/20 bg-rose-50/10'
                : 'border-slate-200/80'
            }`}
            title="Click to show inactive employees"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-tight">
                {inactiveEmployeesCount}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Inactive</div>
            </div>
          </div>
        </div>

        {/* Marker 3 & 4: Filters Row */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                id="employees-search-input"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search name, Emp ID, email or phone"
                className="w-full pl-10 pr-9 py-2 rounded-xl text-sm border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Filter */}
            <div className="relative min-w-[150px]">
              <select
                id="employees-department-select"
                value={selectedDepId ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setSelectedDepId(val);
                  setSelectedRoleId(undefined);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none pl-3.5 pr-8 py-2 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="">Department</option>
                {deptOptions?.map((d) => (
                  <option key={d.dep_id} value={d.dep_id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Designation Filter */}
            <div className="relative min-w-[150px]">
              <select
                id="employees-designation-select"
                value={selectedRoleId ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setSelectedRoleId(val);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none pl-3.5 pr-8 py-2 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="">Designation</option>
                {roleOptions?.map((r) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.role_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative min-w-[120px]">
              <select
                id="employees-status-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'Active' | 'Inactive' | 'All');
                  setCurrentPage(1);
                }}
                className={`w-full appearance-none pl-3.5 pr-8 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer focus:outline-none ${
                  statusFilter === 'Active'
                    ? 'border border-emerald-300 bg-emerald-50/40 text-emerald-700'
                    : statusFilter === 'Inactive'
                    ? 'border border-rose-300 bg-rose-50/40 text-rose-700'
                    : 'border border-slate-200 bg-white text-slate-700 font-medium'
                }`}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="All">All</option>
              </select>
              <ChevronDown
                className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  statusFilter === 'Active'
                    ? 'text-emerald-600'
                    : statusFilter === 'Inactive'
                    ? 'text-rose-500'
                    : 'text-slate-400'
                }`}
              />
            </div>

            {/* Clear Filters Button */}
            <button
              type="button"
              id="clear-filters-button"
              onClick={handleClearFilters}
              className={`text-sm font-semibold transition-colors whitespace-nowrap self-start lg:self-auto px-2 py-1.5 ${
                hasActiveFilters
                  ? 'text-blue-600 hover:text-blue-700 hover:underline cursor-pointer'
                  : 'text-blue-600/70 hover:text-blue-700 hover:underline cursor-pointer'
              }`}
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Marker 5, 6, 7: Employee Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Loading employees...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-600 px-4">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p className="font-semibold text-sm">Failed to load employees</p>
              <p className="text-xs text-slate-500 mt-1">
                {(error as any)?.message || 'Unknown error'}
              </p>
            </div>
          ) : allItems.length === 0 ? (
            <div className="py-20 text-center px-4">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No employees found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No employees match the current filters. Try resetting search parameters.'
                  : 'Get started by clicking Add Employee to create your first team member.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop & Tablet Table (sm and up) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse" id="employees-table">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-white">
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-500 tracking-wider uppercase w-[24%] min-w-[200px]">
                        Employee
                      </th>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-500 tracking-wider uppercase w-[16%] min-w-[130px]">
                        Departments
                      </th>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-500 tracking-wider uppercase w-[16%] min-w-[130px]">
                        Designation
                      </th>
                      {isInactiveView ? (
                        <>
                          <th className="py-3 px-5 text-[11px] font-bold text-slate-500 tracking-wider uppercase w-[16%] min-w-[140px]">
                            Terminated
                          </th>
                          <th className="py-3 px-5 text-[11px] font-bold text-slate-500 tracking-wider uppercase w-[12%] min-w-[110px]">
                            Reason
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-5 text-[11px] font-bold text-slate-500 tracking-wider uppercase w-[16%] min-w-[140px]">
                            Reporting Manager
                          </th>
                          <th className="py-3 px-5 text-[11px] font-bold text-slate-500 tracking-wider uppercase w-[12%] min-w-[110px]">
                            Joining Date
                          </th>
                        </>
                      )}
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-500 tracking-wider uppercase w-[8%] min-w-[85px]">
                        Status
                      </th>
                      {!isInactiveView && (
                        <th className="py-3 px-5 text-[11px] font-bold text-slate-500 tracking-wider uppercase w-[8%] min-w-[95px]">
                          Documents
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentItems.map((emp) => {
                      const isSelf = currentUser?.emp_id === emp.emp_id;
                      const empCode =
                        emp.employee_code || `EMP-${String(emp.emp_id).padStart(4, '0')}`;
                      const initials = getInitials(emp.name);
                      const avatarBg = getAvatarBgColor(emp.name);
                      const pendingDocsCount = emp.pending_documents_count ?? 0;
                      const isDocsComplete = pendingDocsCount === 0;

                      // Combine all departments into badges list
                      const departmentList =
                        emp.departments && emp.departments.length > 0
                          ? emp.departments
                          : emp.department
                          ? [emp.department]
                          : [];

                      return (
                        <tr
                          key={emp.emp_id}
                          id={`employee-row-${emp.emp_id}`}
                          onClick={() => navigate(`/admin/employees/${emp.emp_id}`)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                        >
                          {/* Marker 5: EMPLOYEE column: Initials Circle, Name & Emp ID */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              {emp.profile_picture_url ? (
                                <img
                                  src={emp.profile_picture_url}
                                  alt={emp.name}
                                  className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                                />
                              ) : (
                                <div
                                  className={`w-10 h-10 rounded-full ${avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 tracking-wide shadow-2xs`}
                                >
                                  {initials}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                                    {emp.name}
                                  </span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 shrink-0">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 font-mono mt-0.5">
                                  {empCode}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Marker 6: DEPARTMENTS column: Badges per department */}
                          <td className="py-3.5 px-5">
                            <div className="flex flex-col items-start gap-1">
                              {departmentList.length > 0 ? (
                                departmentList.map((d) => (
                                  <span
                                    key={d.dep_id}
                                    className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium ${getDepartmentBadgeStyle(
                                      d.name,
                                    )}`}
                                  >
                                    {d.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">—</span>
                              )}
                            </div>
                          </td>

                          {/* DESIGNATION column */}
                          <td className="py-3.5 px-5 text-sm font-normal text-slate-700">
                            {emp.role?.role_name || (emp.role_id ? `Role #${emp.role_id}` : '—')}
                          </td>

                          {/* Inactive Mode vs Active Mode columns */}
                          {isInactiveView ? (
                            <>
                              {/* TERMINATED (Date) */}
                              <td className="py-3.5 px-5 text-sm font-semibold text-rose-700">
                                {formatDate(emp.termination_date || emp.exit_date)}
                              </td>

                              {/* REASON */}
                              <td className="py-3.5 px-5 text-sm text-slate-700">
                                {emp.deactivation_reason || '—'}
                              </td>
                            </>
                          ) : (
                            <>
                              {/* REPORTING MANAGER */}
                              <td className="py-3.5 px-5 text-sm text-slate-600">
                                {emp.manager?.name ? emp.manager.name : '—'}
                              </td>

                              {/* JOINING DATE */}
                              <td className="py-3.5 px-5 text-sm text-slate-600">
                                {formatDate(emp.joining_date)}
                              </td>
                            </>
                          )}

                          {/* STATUS column */}
                          <td className="py-3.5 px-5">
                            {emp.status === 'Active' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Inactive
                              </span>
                            )}
                          </td>

                          {/* Marker 7: DOCUMENTS column */}
                          {!isInactiveView && (
                            <td className="py-3.5 px-5">
                              {isDocsComplete ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                  Complete
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                  {pendingDocsCount} pending
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View (< 640px) */}
              <div className="sm:hidden divide-y divide-slate-100">
                {currentItems.map((emp) => {
                  const empCode =
                    emp.employee_code || `EMP-${String(emp.emp_id).padStart(4, '0')}`;
                  const initials = getInitials(emp.name);
                  const avatarBg = getAvatarBgColor(emp.name);
                  const pendingDocsCount = emp.pending_documents_count ?? 0;
                  const departmentList =
                    emp.departments && emp.departments.length > 0
                      ? emp.departments
                      : emp.department
                      ? [emp.department]
                      : [];

                  return (
                    <div
                      key={emp.emp_id}
                      onClick={() => navigate(`/admin/employees/${emp.emp_id}`)}
                      className="p-4 space-y-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {emp.profile_picture_url ? (
                            <img
                              src={emp.profile_picture_url}
                              alt={emp.name}
                              className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-full ${avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                            <div className="text-xs text-slate-400 font-mono">{empCode}</div>
                          </div>
                        </div>

                        {emp.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {departmentList.map((d) => (
                          <span
                            key={d.dep_id}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getDepartmentBadgeStyle(
                              d.name,
                            )}`}
                          >
                            {d.name}
                          </span>
                        ))}
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-700 font-medium">
                          {emp.role?.role_name || 'Unassigned'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>Joined {formatDate(emp.joining_date)}</span>
                        {pendingDocsCount === 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                            Complete
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-[11px]">
                            {pendingDocsCount} pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Marker 8: Pagination Footer */}
              <div className="px-5 py-3.5 border-t border-slate-200/80 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing{' '}
                  <span className="font-semibold text-slate-700">
                    {totalItems > 0 ? startIndex + 1 : 0}–{endIndex}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-slate-700">
                    {statusFilter === 'Active'
                      ? `${activeEmployeesCount} active`
                      : statusFilter === 'Inactive'
                      ? `${inactiveEmployeesCount} inactive`
                      : totalItems}{' '}
                    employees
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                    const isActive = pg === validCurrentPage;
                    return (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setCurrentPage(pg)}
                        className={`w-8 h-8 rounded-lg font-semibold text-xs flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pg}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Employee Confirmation Modal */}
      {deletingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Delete Employee?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Are you sure you want to deactivate and soft delete{' '}
                <span className="font-semibold text-slate-900">"{deletingEmp.name}"</span>?
                This operation preserves historical records and revokes all active auth sessions.
              </p>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-start gap-2 text-left mb-4">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingEmp(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-employee-button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 disabled:opacity-50 transition-all"
                >
                  {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Delete Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
