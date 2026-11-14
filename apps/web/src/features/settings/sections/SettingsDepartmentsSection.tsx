import React, { useState } from 'react';
import { DepartmentResponseDto } from '@vernoxy-pulse/api-client';
import {
  useDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} from '@/features/organization/hooks/use-organization';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { CursorPager } from '@/shared/ui/Pagination';
import { OrgDialog, OrgField, OrgToggle, orgInputCls } from '@/features/organization/components/OrgDialog';

export const SettingsDepartmentsSection: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [limit, setLimit] = useState(10);

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
    limit,
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

  const closeCreate = () => setIsCreateOpen(false);
  const closeEdit = () => setEditingDept(null);
  const closeDelete = () => setDeletingDept(null);
  const resetPaging = () => {
    setCursor(undefined);
    setCursorHistory([]);
  };

  const filterOptions = [
    ['filter-status-all', 'All', undefined, 'text-blue-700'],
    ['filter-status-active', 'Active', true, 'text-emerald-700'],
    ['filter-status-inactive', 'Inactive', false, 'text-slate-800'],
  ] as const;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Departments</h2>
            <p className="mt-0.5 text-sm text-slate-500">The teams of your organization. Designations and employees belong to them.</p>
          </div>
        </div>
        <button
          type="button"
          id="add-department-button"
          onClick={handleOpenCreate}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-[13px] font-semibold text-white shadow-md shadow-blue-600/25 transition hover:brightness-110 focus:outline-hidden focus:ring-4 focus:ring-blue-600/20 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add Department
        </button>
      </div>

      {/* Global Action Error Banner */}
      {formError && !isCreateOpen && !editingDept && !deletingDept && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 animate-in fade-in">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1 text-xs font-medium">{formError}</div>
          <button onClick={() => setFormError(null)} className="text-rose-500 hover:text-rose-700" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            id="departments-search-input"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPaging();
            }}
            placeholder="Search departments..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div role="group" aria-label="Status" className="inline-flex self-start rounded-xl bg-slate-100 p-1 text-[13px] font-semibold md:self-auto">
          {filterOptions.map(([id, label, value, on]) => (
            <button
              key={id}
              type="button"
              id={id}
              onClick={() => {
                setStatusFilter(value);
                resetPaging();
              }}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 transition ${
                statusFilter === value ? `bg-white shadow-sm ${on}` : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Departments Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            <p className="text-xs font-medium text-slate-500">Loading departments...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-12 text-center text-rose-600">
            <AlertCircle className="mx-auto mb-2 h-7 w-7 text-rose-500" />
            <p className="text-xs font-semibold">Failed to load departments</p>
            <p className="mt-1 text-xs text-slate-500">{(error as any)?.message || 'Unknown error'}</p>
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Building2 className="h-7 w-7" />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">No departments found</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              {search
                ? `No departments matching "${search}". Try adjusting your search or filters.`
                : "Get started by creating your organization's first department."}
            </p>
          </div>
        ) : (
          <div className="custom-scrollbar max-h-[calc(100vh-400px)] min-h-[320px] overflow-auto">
            <table className="relative w-full min-w-[560px] text-left text-sm" id="departments-table">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs">
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <th className="whitespace-nowrap px-5 py-3">ID</th>
                  <th className="whitespace-nowrap px-5 py-3">Department</th>
                  <th className="whitespace-nowrap px-5 py-3">Status</th>
                  <th className="whitespace-nowrap px-5 py-3">Created</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items.map((dept) => (
                  <tr key={dept.dep_id} id={`dept-row-${dept.dep_id}`} className="group transition-colors hover:bg-blue-50/30">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-400">#{dept.dep_id}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 ring-1 ring-blue-100">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="font-semibold text-slate-900">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                          dept.is_active
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/70'
                            : 'bg-slate-100 text-slate-600 ring-slate-200'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${dept.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 tabular-nums">
                      {new Date(dept.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          id={`edit-department-${dept.dep_id}`}
                          onClick={() => handleOpenEdit(dept)}
                          className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                          title="Edit Department"
                          aria-label={`Edit ${dept.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          id={`delete-department-${dept.dep_id}`}
                          onClick={() => {
                            setDeletingDept(dept);
                            setFormError(null);
                          }}
                          className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Delete Department"
                          aria-label={`Delete ${dept.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              resetPaging();
            }}
            prevId="departments-prev-page-button"
            nextId="departments-next-page-button"
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

      {/* Create Department */}
      {isCreateOpen && (
        <OrgDialog
          icon={Building2}
          title="New Department"
          subtitle="Add a team. You can then create designations and assign employees to it."
          onClose={closeCreate}
          onSubmit={handleCreate}
          submitLabel="Create Department"
          submitId="department-submit-button"
          pending={createMutation.isPending}
          error={formError}
        >
          <OrgField label="Department Name" htmlFor="department-name-input" required>
            <input
              type="text"
              id="department-name-input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Finance, Product, Operations"
              className={orgInputCls}
              autoFocus
            />
          </OrgField>
        </OrgDialog>
      )}

      {/* Edit Department */}
      {editingDept && (
        <OrgDialog
          icon={Edit2}
          title="Edit Department"
          subtitle={`Update the details of ${editingDept.name}.`}
          onClose={closeEdit}
          onSubmit={handleUpdate}
          submitLabel="Save Changes"
          submitId="edit-department-submit-button"
          pending={updateMutation.isPending}
          error={formError}
        >
          <OrgField label="Department Name" htmlFor="edit-department-name-input" required>
            <input
              type="text"
              id="edit-department-name-input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className={orgInputCls}
              autoFocus
            />
          </OrgField>
          <OrgToggle
            id="edit-department-status-toggle"
            label="Department Active"
            description="Inactive departments cannot have new designations or employees assigned."
            checked={formActive}
            onChange={setFormActive}
          />
        </OrgDialog>
      )}

      {/* Delete Department */}
      {deletingDept && (
        <OrgDialog
          icon={Trash2}
          danger
          title="Delete Department?"
          subtitle="This is a soft delete. It is blocked while the department still has active designations or employees."
          onClose={closeDelete}
          onConfirm={handleDelete}
          submitLabel="Delete Department"
          submitId="confirm-delete-department-button"
          pending={deleteMutation.isPending}
          error={formError}
        >
          <p className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-sm text-slate-600">
            You are about to delete <span className="font-semibold text-slate-900">"{deletingDept.name}"</span>.
          </p>
        </OrgDialog>
      )}
    </div>
  );
};
