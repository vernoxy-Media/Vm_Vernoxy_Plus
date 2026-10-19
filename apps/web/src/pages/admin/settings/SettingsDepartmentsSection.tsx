import React, { useState } from 'react';
import { DepartmentResponseDto } from '@vernoxy-pulse/api-client';
import {
  useDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} from '../../../hooks/use-organization';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  ChevronRight,
} from 'lucide-react';

export const SettingsDepartmentsSection: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentResponseDto | null>(null);
  const [deletingDept, setDeletingDept] = useState<DepartmentResponseDto | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch departments query
  const { data, isLoading, error } = useDepartmentsQuery({
    q: search || undefined,
    is_active: statusFilter,
    limit: 20,
    cursor,
  });

  const createMutation = useCreateDepartmentMutation();
  const updateMutation = useUpdateDepartmentMutation();
  const deleteMutation = useDeleteDepartmentMutation();

  const handleOpenCreate = () => {
    setFormName('');
    setFormActive(true);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentResponseDto) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormActive(dept.is_active);
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Department name is required');
      return;
    }
    setFormError(null);
    try {
      await createMutation.mutateAsync({ name: formName.trim() });
      setIsCreateOpen(false);
    } catch (err: any) {
      setFormError(err.detail || err.message || 'Failed to create department');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    if (!formName.trim()) {
      setFormError('Department name is required');
      return;
    }
    setFormError(null);
    try {
      await updateMutation.mutateAsync({
        id: editingDept.dep_id,
        data: { name: formName.trim(), is_active: formActive },
      });
      setEditingDept(null);
    } catch (err: any) {
      setFormError(err.detail || err.message || 'Failed to update department');
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;
    setFormError(null);
    try {
      await deleteMutation.mutateAsync(deletingDept.dep_id);
      setDeletingDept(null);
    } catch (err: any) {
      setFormError(err.detail || err.message || 'Failed to delete department');
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Departments</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organizational divisions, operational units, and functional hierarchy.
          </p>
        </div>
        <button
          type="button"
          id="add-department-button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Global Action Error Banner */}
      {formError && !isCreateOpen && !editingDept && !deletingDept && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 animate-in fade-in">
          <AlertCircle className="w-5 h-5 mt-0.5 text-rose-600 shrink-0" />
          <div className="flex-1 text-xs font-medium">{formError}</div>
          <button onClick={() => setFormError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters and Search Bar (stitched / sticky to top) */}
      <div className="sticky top-16 lg:top-0 z-20 bg-[#f4f6fa]/95 backdrop-blur-xs py-1">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            id="departments-search-input"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor(undefined);
            }}
            placeholder="Search departments..."
            className="w-full pl-10 pr-4 py-2 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-slate-200 text-xs font-medium">
          <button
            type="button"
            id="filter-status-all"
            onClick={() => {
              setStatusFilter(undefined);
              setCursor(undefined);
            }}
            className={`px-2.5 py-1 rounded-md transition-all ${
              statusFilter === undefined
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            id="filter-status-active"
            onClick={() => {
              setStatusFilter(true);
              setCursor(undefined);
            }}
            className={`px-2.5 py-1 rounded-md transition-all ${
              statusFilter === true
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            id="filter-status-inactive"
            onClick={() => {
              setStatusFilter(false);
              setCursor(undefined);
            }}
            className={`px-2.5 py-1 rounded-md transition-all ${
              statusFilter === false
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>
    </div>

      {/* Departments Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading departments...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-600 px-4">
            <AlertCircle className="w-7 h-7 mx-auto mb-2 text-rose-500" />
            <p className="font-semibold text-xs">Failed to load departments</p>
            <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || 'Unknown error'}</p>
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Building2 className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No departments found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search
                ? `No departments matching "${search}". Try adjusting your search or filters.`
                : 'Get started by creating your organization\'s first department.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)] min-h-[350px]">
            <table className="w-full text-left text-xs relative" id="departments-table">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider shadow-2xs">
                <tr>
                  <th className="py-3 px-5">ID</th>
                  <th className="py-3 px-5">Department Name</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Created At</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items.map((dept) => (
                  <tr
                    key={dept.dep_id}
                    id={`dept-row-${dept.dep_id}`}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3.5 px-5 text-slate-400 font-mono text-xs">#{dept.dep_id}</td>
                    <td className="py-3.5 px-5 font-semibold text-slate-900">{dept.name}</td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          dept.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dept.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {new Date(dept.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          id={`edit-department-${dept.dep_id}`}
                          onClick={() => handleOpenEdit(dept)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          id={`delete-department-${dept.dep_id}`}
                          onClick={() => {
                            setDeletingDept(dept);
                            setFormError(null);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Keyset Pagination Bar */}
        {data?.next_cursor && (
          <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end">
            <button
              type="button"
              id="departments-next-page-button"
              onClick={() => {
                if (data?.next_cursor) {
                  setCursor(data.next_cursor);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-xs hover:bg-slate-100 transition-colors"
            >
              Next Page
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Create Department Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">New Department</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="department-name-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Department Name *
                </label>
                <input
                  type="text"
                  id="department-name-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Finance, Product, Operations"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="department-submit-button"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Edit Department</h3>
              </div>
              <button
                onClick={() => setEditingDept(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="edit-department-name-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Department Name *
                </label>
                <input
                  type="text"
                  id="edit-department-name-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Department Active</span>
                  <span className="text-xs text-slate-500">
                    Inactive departments cannot have new roles or employees assigned.
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="edit-department-status-toggle"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="edit-department-submit-button"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {updateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Department Confirmation Modal */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Delete Department?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Are you sure you want to soft delete{' '}
                <span className="font-semibold text-slate-900">"{deletingDept.name}"</span>?
                This action is blocked if the department still contains active roles or employees.
              </p>

              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-start gap-2 text-left mb-4">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingDept(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-department-button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 disabled:opacity-50 transition-all"
                >
                  {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Delete Department
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
