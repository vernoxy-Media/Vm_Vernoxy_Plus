import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoleResponseDto } from '@vernoxy-pulse/api-client';
import {
  useRolesQuery,
  useDepartmentOptionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from '@/features/organization/hooks/use-organization';
import { SearchableSelect, RowActionsMenu, CursorPager, type RowAction } from '@/shared/ui';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Shield,
  Building2,
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
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [limit, setLimit] = useState(10);

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

  const deptSelectOptions = React.useMemo(() => {
    return (deptOptions || []).map((d) => ({
      value: d.dep_id,
      label: d.name,
    }));
  }, [deptOptions]);

  const deptFilterOptions = React.useMemo(() => {
    return [
      { value: '', label: 'All Departments' },
      ...(deptOptions || []).map((d) => ({
        value: d.dep_id,
        label: d.name,
      })),
    ];
  }, [deptOptions]);

  // Query roles
  const { data, isLoading, error } = useRolesQuery({
    dep_id: selectedDepId,
    q: search || undefined,
    is_active: statusFilter,
    limit,
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
      setFormError('Designation is required');
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
      setFormError('Designation is required');
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

  const roleActions = (role: RoleResponseDto): RowAction[] => [
    { label: 'Edit designation', icon: Edit2, onClick: () => handleOpenEdit(role) },
    {
      label: 'Delete designation',
      icon: Trash2,
      danger: true,
      disabled: role.is_admin,
      hint: 'Admin roles cannot be deleted',
      onClick: () => {
        setDeletingRole(role);
        setFormError(null);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Designations</h2>
            <p className="mt-0.5 text-sm text-slate-500">Job titles and the department each one belongs to.</p>
          </div>
        </div>
        <button
          type="button"
          id="add-role-button"
          onClick={handleOpenCreate}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-hidden focus:ring-4 focus:ring-blue-600/20 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add Designation
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

      {/* Search and filters */}
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="roles-search-input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCursor(undefined);
                setCursorHistory([]);
              }}
              placeholder="Search designations by title..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="w-full sm:w-64">
            <SearchableSelect
              id="roles-dep-filter-select"
              options={deptFilterOptions}
              value={selectedDepId ?? ''}
              onChange={(val) => {
                const nextVal = val ? Number(val) : undefined;
                setSelectedDepId(nextVal);
                setCursor(undefined);
                setCursorHistory([]);
              }}
              placeholder="All Departments"
              searchPlaceholder="Search department..."
              className="!rounded-xl !border-slate-200 !py-2 !text-sm !font-medium !text-slate-800"
            />
          </div>
        </div>

        <div role="group" aria-label="Status" className="inline-flex self-start rounded-xl bg-slate-100 p-1 text-[13px] font-semibold md:self-auto">
          {([
            ['filter-role-all', 'All', undefined, 'text-blue-700'],
            ['filter-role-active', 'Active', true, 'text-emerald-700'],
            ['filter-role-inactive', 'Inactive', false, 'text-slate-800'],
          ] as const).map(([id, label, value, on]) => (
            <button
              key={id}
              type="button"
              id={id}
              onClick={() => {
                setStatusFilter(value);
                setCursor(undefined);
                setCursorHistory([]);
              }}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 transition ${statusFilter === value ? `bg-white shadow-sm ${on}` : 'text-slate-500 hover:text-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Roles Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
          <>
          <ul className="divide-y divide-slate-100 md:hidden">
            {data?.items.map((role) => {
              const deptName = deptOptions?.find((d) => d.dep_id === role.dep_id)?.name || `Dep #${role.dep_id}`;
              return (
                <li key={role.role_id} className="flex items-start gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-sm font-bold text-blue-600 ring-1 ring-blue-100">
                    {role.role_name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-semibold text-slate-900">{role.role_name}</p>
                      {role.is_admin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100">
                          <Shield className="h-3 w-3" />
                          System
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {deptName}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${role.is_active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-slate-100 text-slate-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${role.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {role.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {role.description && <p className="mt-2 text-sm text-slate-500">{role.description}</p>}
                  </div>
                  <RowActionsMenu label={`Actions for ${role.role_name}`} actions={roleActions(role)} />
                </li>
              );
            })}
          </ul>
          <div className="custom-scrollbar hidden max-h-[calc(100vh-400px)] min-h-[320px] overflow-auto md:block">
            <table className="relative w-full min-w-[720px] text-left text-sm" id="roles-table">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs">
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <th className="whitespace-nowrap px-5 py-3">ID</th>
                  <th className="whitespace-nowrap px-5 py-3">Designation</th>
                  <th className="whitespace-nowrap px-5 py-3">Department</th>
                  <th className="whitespace-nowrap px-5 py-3">Description</th>
                  <th className="whitespace-nowrap px-5 py-3">Type & Status</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right">Actions</th>
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
                      className="transition-colors hover:bg-blue-50/30"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">#{role.role_id}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 text-[12px] font-bold text-blue-600 ring-1 ring-blue-100">
                            {role.role_name.charAt(0).toUpperCase()}
                          </span>
                          <span>{role.role_name}</span>
                          {role.is_admin && (
                            <span
                              id={`role-admin-badge-${role.role_id}`}
                              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100"
                              title="System Protected Role"
                            >
                              <Shield className="w-3 h-3" />
                              System
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {deptName}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-5 py-3.5 text-slate-500">
                        {role.description || <span className="text-slate-300 italic">None</span>}
                      </td>
                      <td className="px-5 py-3.5">
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
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end">
                          <RowActionsMenu id={`role-actions-${role.role_id}`} label={`Actions for ${role.role_name}`} actions={roleActions(role)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {(cursorHistory.length > 0 || Boolean(data?.next_cursor)) && (
          <CursorPager
            page={cursorHistory.length + 1}
            shown={data?.items.length ?? 0}
            hasPrev={cursorHistory.length > 0}
            hasNext={Boolean(data?.next_cursor)}
            pageSize={limit}
            onPageSizeChange={(n) => {
              setLimit(n);
              setCursor(undefined);
              setCursorHistory([]);
            }}
            prevId="roles-prev-page-button"
            nextId="roles-next-page-button"
            onPrev={() => {
              if (cursorHistory.length > 0) {
                const prevCursor = cursorHistory[cursorHistory.length - 1];
                setCursorHistory((prev) => prev.slice(0, -1));
                setCursor(prevCursor || undefined);
              }
            }}
            onNext={() => {
              if (data?.next_cursor) {
                setCursorHistory((prev) => [...prev, cursor || '']);
                setCursor(data.next_cursor);
              }
            }}
          />
        )}
      </div>

      {/* Create Designation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">New Designation</h3>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Department *
                </label>
                <SearchableSelect
                  options={deptSelectOptions}
                  value={formDepId || null}
                  onChange={(val) => setFormDepId(val ? Number(val) : '')}
                  placeholder="Select Department"
                  searchPlaceholder="Search department..."
                />
              </div>

              <div>
                <label
                  htmlFor="role-name-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Designation *
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
                  Create Designation
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
                <h3 className="text-base font-bold text-slate-900">Edit Designation</h3>
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
                  Designation *
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
                  <span className="text-xs font-semibold text-slate-800 block">Designation Active</span>
                  <span className="text-xs text-slate-500">
                    {editingRole.is_admin
                      ? 'Admin designations cannot be deactivated.'
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
              <h3 className="text-base font-bold text-slate-900 mb-1">Delete Designation?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Are you sure you want to soft delete designation{' '}
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
                  Delete Designation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
