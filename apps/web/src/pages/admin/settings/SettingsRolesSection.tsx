import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoleResponseDto } from '@vernoxy-pulse/api-client';
import {
  useRolesQuery,
  useDepartmentOptionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from '../../../hooks/use-organization';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  ChevronRight,
  Shield,
  Building2,
  ChevronDown,
} from 'lucide-react';

export const SettingsRolesSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const depIdParam = searchParams.get('dep_id');
  const newParam = searchParams.get('new');

  const [search, setSearch] = useState('');
  const [selectedDepId, setSelectedDepId] = useState<number | undefined>(
    depIdParam ? Number(depIdParam) : undefined,
  );
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponseDto | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleResponseDto | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDepId, setFormDepId] = useState<number | ''>(
    depIdParam ? Number(depIdParam) : '',
  );
  const [formDesc, setFormDesc] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Query departments options for filter & create modal
  const { data: deptOptions } = useDepartmentOptionsQuery();

  // Query roles
  const { data, isLoading, error } = useRolesQuery({
    dep_id: selectedDepId,
    q: search || undefined,
    is_active: statusFilter,
    limit: 20,
    cursor,
  });

  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const deleteMutation = useDeleteRoleMutation();

  // If ?dep_id=X&new=1 is in URL, automatically pre-select that department and open Add Role dialog
  useEffect(() => {
    if (newParam === '1') {
      const depNum = depIdParam ? Number(depIdParam) : '';
      setFormDepId(depNum);
      if (depNum) setSelectedDepId(Number(depNum));
      setIsCreateOpen(true);
    }
  }, [newParam, depIdParam]);

  const handleOpenCreate = () => {
    setFormName('');
    setFormDepId(selectedDepId || '');
    setFormDesc('');
    setFormActive(true);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (role: RoleResponseDto) => {
    setEditingRole(role);
    setFormName(role.role_name);
    setFormDesc(role.description || '');
    setFormActive(role.is_active);
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Role name is required');
      return;
    }
    if (!formDepId) {
      setFormError('Department is required');
      return;
    }
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        role_name: formName.trim(),
        dep_id: Number(formDepId),
        description: formDesc.trim() || undefined,
      });
      setIsCreateOpen(false);
      // Clean query params if any
      if (searchParams.has('new')) {
        const next = new URLSearchParams(searchParams);
        next.delete('new');
        setSearchParams(next);
      }
    } catch (err: any) {
      setFormError(err.detail || err.message || 'Failed to create role');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    if (!formName.trim()) {
      setFormError('Role name is required');
      return;
    }
    setFormError(null);
    try {
      await updateMutation.mutateAsync({
        id: editingRole.role_id,
        data: {
          role_name: formName.trim(),
          description: formDesc.trim() || undefined,
          is_active: formActive,
        },
      });
      setEditingRole(null);
    } catch (err: any) {
      setFormError(err.detail || err.message || 'Failed to update role');
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    setFormError(null);
    try {
      await deleteMutation.mutateAsync(deletingRole.role_id);
      setDeletingRole(null);
    } catch (err: any) {
      setFormError(err.detail || err.message || 'Failed to delete role');
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Roles</h2>
        </div>
        <button
          type="button"
          id="add-role-button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Role
        </button>
      </div>

      {/* Action Error Banner */}
      {formError && !isCreateOpen && !editingRole && !deletingRole && (
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
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              id="roles-search-input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCursor(undefined);
              }}
              placeholder="Search roles by title..."
              className="w-full pl-10 pr-4 py-2 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          <div className="relative">
            <select
              id="roles-dep-filter-select"
              aria-label="Filter by department"
              value={selectedDepId ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setSelectedDepId(val);
                setCursor(undefined);
              }}
              className="w-full sm:w-auto appearance-none pl-3.5 pr-8 py-2 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-700"
            >
              <option value="">All Departments</option>
              {selectedDepId && !deptOptions?.some((d) => d.dep_id === selectedDepId) && (
                <option value={selectedDepId}>Department #{selectedDepId}</option>
              )}
              {deptOptions?.map((d) => (
                <option key={d.dep_id} value={d.dep_id}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-slate-200 text-xs font-medium self-start md:self-auto">
          <button
            type="button"
            id="filter-role-all"
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
            id="filter-role-active"
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
            id="filter-role-inactive"
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

      {/* Roles Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading roles...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-600 px-4">
            <AlertCircle className="w-7 h-7 mx-auto mb-2 text-rose-500" />
            <p className="font-semibold text-xs">Failed to load roles</p>
            <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || 'Unknown error'}</p>
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="py-16 text-center px-4">
            <ShieldCheck className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No roles found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || selectedDepId
                ? 'No roles match the selected criteria. Try resetting your search filters.'
                : 'Get started by creating your first role.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)] min-h-[350px]">
            <table className="w-full text-left text-xs relative" id="roles-table">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider shadow-2xs">
                <tr>
                  <th className="py-3 px-5">ID</th>
                  <th className="py-3 px-5">Role Name</th>
                  <th className="py-3 px-5">Department</th>
                  <th className="py-3 px-5">Description</th>
                  <th className="py-3 px-5">Type & Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items.map((role) => {
                  const deptName =
                    deptOptions?.find((d) => d.dep_id === role.dep_id)?.name ||
                    `Dep #${role.dep_id}`;

                  return (
                    <tr
                      key={role.role_id}
                      id={`role-row-${role.role_id}`}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-5 text-slate-400 font-mono text-xs">#{role.role_id}</td>
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{role.role_name}</span>
                          {role.is_admin && (
                            <span
                              id={`role-admin-badge-${role.role_id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-semibold"
                              title="System Protected Role"
                            >
                              <Shield className="w-3 h-3" />
                              System
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 font-medium">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {deptName}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 max-w-xs truncate">
                        {role.description || <span className="text-slate-300 italic">None</span>}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            role.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              role.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {role.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            id={`edit-role-${role.role_id}`}
                            onClick={() => handleOpenEdit(role)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!role.is_admin ? (
                            <button
                              type="button"
                              id={`delete-role-${role.role_id}`}
                              onClick={() => {
                                setDeletingRole(role);
                                setFormError(null);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Role"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              className="p-1.5 text-slate-300 cursor-not-allowed"
                              title="Admin roles cannot be deleted"
                            >
                              <Trash2 className="w-3.5 h-3.5 opacity-30" />
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
        )}

        {/* Keyset Pagination Bar */}
        {data?.next_cursor && (
          <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end">
            <button
              type="button"
              id="roles-next-page-button"
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

      {/* Create Role Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">New Role</h3>
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
                  htmlFor="role-dep-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Department *
                </label>
                <div className="relative">
                  <select
                    id="role-dep-select"
                    value={formDepId}
                    onChange={(e) => setFormDepId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full appearance-none px-3.5 py-2.5 pr-8 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                    required
                  >
                    <option value="">Select Department</option>
                    {formDepId && !deptOptions?.some((d) => d.dep_id === formDepId) && (
                      <option value={formDepId}>Selected Department (#{formDepId})</option>
                    )}
                    {deptOptions?.map((d) => (
                      <option key={d.dep_id} value={d.dep_id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="role-name-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Role Name *
                </label>
                <input
                  type="text"
                  id="role-name-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Lead Frontend Engineer"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="role-desc-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="role-desc-input"
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Key responsibilities or job description"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
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
                  id="role-submit-button"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Edit Role</h3>
              </div>
              <button
                onClick={() => setEditingRole(null)}
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
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Department (Immutable)
                </label>
                <div className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-600 font-medium">
                  {deptOptions?.find((d) => d.dep_id === editingRole.dep_id)?.name ||
                    `Dep #${editingRole.dep_id}`}
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-role-name-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Role Name *
                </label>
                <input
                  type="text"
                  id="edit-role-name-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="edit-role-desc-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Description
                </label>
                <textarea
                  id="edit-role-desc-input"
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Role Active</span>
                  <span className="text-xs text-slate-500">
                    {editingRole.is_admin
                      ? 'Admin roles cannot be deactivated.'
                      : 'Deactivating is blocked if active employees are assigned.'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="edit-role-status-toggle"
                  checked={formActive}
                  disabled={editingRole.is_admin}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="edit-role-submit-button"
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

      {/* Delete Role Confirmation Modal */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Delete Role?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Are you sure you want to soft delete role{' '}
                <span className="font-semibold text-slate-900">"{deletingRole.role_name}"</span>?
                This action is blocked if active employees are currently assigned to it.
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
                  onClick={() => setDeletingRole(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-role-button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 disabled:opacity-50 transition-all"
                >
                  {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Delete Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
