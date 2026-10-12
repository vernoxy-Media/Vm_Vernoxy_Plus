import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmployeeResponseDto } from '@vernoxy-pulse/api-client';
import {
  useEmployeesQuery,
  useDepartmentOptionsQuery,
  useRoleOptionsQuery,
  useDeleteEmployeeMutation,
} from '../../hooks/use-organization';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { Avatar } from '../../components/Avatar';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  ChevronRight,
  ChevronDown,
  Building2,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedDepId, setSelectedDepId] = useState<number | undefined>(undefined);
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Inactive' | undefined>(undefined);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const [deletingEmp, setDeletingEmp] = useState<EmployeeResponseDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Departments dropdown options
  const { data: deptOptions } = useDepartmentOptionsQuery();

  // Roles dropdown options dependent on department
  const { data: roleOptions } = useRoleOptionsQuery(selectedDepId);

  // Fetch employees query
  const { data, isLoading, error } = useEmployeesQuery({
    q: search || undefined,
    dep_id: selectedDepId,
    role_id: selectedRoleId,
    status: statusFilter,
    limit: 20,
    cursor,
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

  return (
    <AdminLayout title="Employees" fluid>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Employees"
          description="Manage workforce records, department assignments, reporting structure, and accounts."
          badge={
            data?.items ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                {data.items.length} {data.items.length === 1 ? 'member' : 'members'}
              </span>
            ) : null
          }
          actions={
            <Link
              to="/admin/employees/new"
              id="add-employee-button"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Employee
            </Link>
          }
        />

        {/* Global Error Banner */}
        {errorMessage && !deletingEmp && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 animate-in fade-in">
            <AlertCircle className="w-5 h-5 mt-0.5 text-rose-600 shrink-0" />
            <div className="flex-1 text-sm">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Row: search, department, role [depends on department], status */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                id="employees-search-input"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCursor(undefined);
                }}
                placeholder="Search by employee name or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>

            {/* Department Select */}
            <div className="relative">
              <select
                id="employees-dep-filter-select"
                value={selectedDepId ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setSelectedDepId(val);
                  setSelectedRoleId(undefined);
                  setCursor(undefined);
                }}
                className="w-full sm:w-auto appearance-none pl-3.5 pr-9 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-700"
              >
                <option value="">All Departments</option>
                {deptOptions?.map((d) => (
                  <option key={d.dep_id} value={d.dep_id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Role Select (depends on department) */}
            {selectedDepId && (
              <div className="relative">
                <select
                  id="employees-role-filter-select"
                  value={selectedRoleId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setSelectedRoleId(val);
                    setCursor(undefined);
                  }}
                  className="w-full sm:w-auto appearance-none pl-3.5 pr-9 py-2.5 rounded-xl text-sm border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-700"
                >
                  <option value="">All Roles</option>
                  {roleOptions?.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Status pill filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium self-start sm:self-auto">
            <button
              type="button"
              id="filter-emp-all"
              onClick={() => {
                setStatusFilter(undefined);
                setCursor(undefined);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === undefined
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              id="filter-emp-active"
              onClick={() => {
                setStatusFilter('Active');
                setCursor(undefined);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'Active'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              id="filter-emp-inactive"
              onClick={() => {
                setStatusFilter('Inactive');
                setCursor(undefined);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'Inactive'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Loading employees...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-600 px-4">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p className="font-semibold text-sm">Failed to load employees</p>
              <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || 'Unknown error'}</p>
            </div>
          ) : data?.items?.length === 0 ? (
            <div className="py-20 text-center px-4">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No employees found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search || selectedDepId || statusFilter
                  ? 'No employees match the current filters. Try resetting search parameters.'
                  : 'Get started by provisioning credentials for your first team member.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table: visible sm and up (>= 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm" id="employees-table">
                  <thead className="bg-slate-50/80 border-b border-slate-200/90 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-6 w-[30%] min-w-[260px]">Employee</th>
                      <th className="py-3.5 px-6 w-[22%] min-w-[180px]">Department & Role</th>
                      <th className="py-3.5 px-6 w-[18%] min-w-[150px]">Manager</th>
                      <th className="py-3.5 px-6 w-[12%] min-w-[110px]">Status</th>
                      <th className="py-3.5 px-6 w-[12%] min-w-[120px]">Joining Date</th>
                      <th className="py-3.5 px-6 w-[6%] min-w-[80px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.items.map((emp) => {
                      const isSelf = currentUser?.emp_id === emp.emp_id;

                      return (
                        <tr
                          key={emp.emp_id}
                          id={`employee-row-${emp.emp_id}`}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <Avatar
                                name={emp.name}
                                src={emp.profile_picture_url}
                                size={40}
                                className="rounded-xl border border-slate-100 shrink-0"
                              />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900">{emp.name}</span>
                                  {isSelf && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    {emp.email}
                                  </span>
                                  {emp.mob && (
                                    <span className="flex items-center gap-1 font-mono">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {emp.mob}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium w-fit">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {emp.department?.name || `Dep #${emp.dep_id}`}
                              </span>
                              <span className="text-xs text-slate-600 font-medium pl-0.5">
                                {emp.role?.role_name || (emp.role_id ? `Role #${emp.role_id}` : (
                                  <span className="text-slate-400 font-normal italic">Unassigned</span>
                                ))}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-600">
                            {emp.manager ? (
                              <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                                {emp.manager.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">None (Top-level)</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                emp.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  emp.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 text-xs font-medium">
                            {new Date(emp.joining_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/admin/employees/${emp.emp_id}/edit`}
                                id={`edit-employee-${emp.emp_id}`}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                title="Edit Employee"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Link>
                              {!isSelf ? (
                                <button
                                  type="button"
                                  id={`delete-employee-${emp.emp_id}`}
                                  onClick={() => {
                                    setDeletingEmp(emp);
                                    setErrorMessage(null);
                                  }}
                                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                  title="Delete Employee"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span
                                  className="p-2 text-slate-300 cursor-not-allowed"
                                  title="Cannot delete own account"
                                >
                                  <Trash2 className="w-4 h-4 opacity-30" />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards: below 640px */}
              <div className="sm:hidden divide-y divide-slate-100">
                {data?.items.map((emp) => {
                  const isSelf = currentUser?.emp_id === emp.emp_id;

                  return (
                    <div
                      key={emp.emp_id}
                      id={`employee-card-${emp.emp_id}`}
                      className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={emp.name}
                            src={emp.profile_picture_url}
                            size={44}
                            className="rounded-xl border border-slate-100 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-slate-900 text-sm">{emp.name}</h4>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{emp.email}</p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                            emp.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {emp.department?.name || `Dep #${emp.dep_id}`}
                        </span>
                        <span>&bull;</span>
                        <span className="font-medium">{emp.role?.role_name || (emp.role_id ? `Role #${emp.role_id}` : 'Unassigned')}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <span>Joined: {new Date(emp.joining_date).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/admin/employees/${emp.emp_id}/edit`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => setDeletingEmp(emp)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination bar */}
          {data?.next_cursor && (
            <div className="p-4 border-t border-slate-200/90 bg-slate-50/50 flex items-center justify-end">
              <button
                type="button"
                id="employees-next-page-button"
                onClick={() => setCursor(data.next_cursor || undefined)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-xs hover:bg-slate-100 transition-colors"
              >
                Next Page
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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
