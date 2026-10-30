import React, { useState } from 'react';
import { IndustryListItemDto } from '@vernoxy-pulse/api-client';
import {
  useIndustriesQuery,
  useIndustryOptionsQuery,
  useCreateIndustryMutation,
  useUpdateIndustryMutation,
  useDeleteIndustryMutation,
} from '@/features/organization/hooks/use-master-data';
import { MasterDataPage } from '@/features/organization/components/MasterDataPage';
import { MasterDataDialog } from '@/features/organization/components/MasterDataDialog';
import { Factory } from 'lucide-react';
import { getIndustryColumns, getIndustryDialogFields } from '../industries-columns';

export const SettingsIndustriesSection: React.FC = () => {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<'top' | 'sub'>('top');
  const [parentId, setParentId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [cursor, setCursor] = useState<number | undefined>(undefined);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IndustryListItemDto | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const { data: topLevelOptions } = useIndustryOptionsQuery();
  const { data, isLoading, error } = useIndustriesQuery({
    q: search || undefined,
    level,
    parent_id: level === 'sub' ? parentId : undefined,
    is_active: statusFilter,
    limit: 20,
    cursor,
  });

  const createMutation = useCreateIndustryMutation();
  const updateMutation = useUpdateIndustryMutation();
  const deleteMutation = useDeleteIndustryMutation();

  const handleOpenAdd = () => {
    setEditingItem(null);
    setDialogError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: IndustryListItemDto) => {
    setEditingItem(item);
    setDialogError(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: IndustryListItemDto) => {
    if (item.is_default) {
      alert('The default industry cannot be deleted.');
      return;
    }
    try {
      await deleteMutation.mutateAsync(item.industry_id);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || 'Cannot delete industry: in use by sub-industries or companies');
    }
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    setDialogError(null);
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.industry_id,
          data: {
            name: (values.name as string).trim(),
            is_active: Boolean(values.is_active),
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: (values.name as string).trim(),
          parent_id: values.parent_id ? Number(values.parent_id) : undefined,
        });
      }
      setIsDialogOpen(false);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      setDialogError(e.detail || e.message || 'Operation failed');
    }
  };

  const dialogFields = getIndustryDialogFields(Boolean(editingItem), topLevelOptions);
  const columns = getIndustryColumns();

  return (
    <>
      <MasterDataPage<IndustryListItemDto>
        title="Industries"
        description="Organize your customer sectors into top-level industries and sub-industries."
        addLabel="Add Industry"
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCursor(undefined);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => {
          setStatusFilter(v);
          setCursor(undefined);
        }}
        extraFilters={
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-white rounded-lg border border-slate-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setLevel('top');
                  setCursor(undefined);
                }}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  level === 'top' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
                }`}
              >
                Industries
              </button>
              <button
                type="button"
                onClick={() => {
                  setLevel('sub');
                  setCursor(undefined);
                }}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  level === 'sub' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
                }`}
              >
                Sub-industries
              </button>
            </div>
            {level === 'sub' && (
              <select
                value={parentId ?? ''}
                onChange={(e) => {
                  setParentId(e.target.value ? Number(e.target.value) : undefined);
                  setCursor(undefined);
                }}
                className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 bg-white font-medium"
              >
                <option value="">All Parents</option>
                {topLevelOptions?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        }
        columns={columns}
        items={data?.items || []}
        getItemKey={(item) => item.industry_id}
        isLoading={isLoading}
        error={error ? (error as { message?: string }).message || 'Failed to load industries' : null}
        emptyIcon={<Factory className="w-8 h-8" />}
        nextCursor={data?.next_cursor}
        onNextPage={() => setCursor(data?.next_cursor || undefined)}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        canDelete={(item) => !item.is_default}
      />

      <MasterDataDialog
        isOpen={isDialogOpen}
        title={editingItem ? 'Edit Industry' : 'Add Industry'}
        icon={<Factory className="w-5 h-5" />}
        fields={dialogFields}
        initialValues={
          editingItem
            ? { name: editingItem.name, is_active: editingItem.is_active }
            : { name: '', parent_id: level === 'sub' && parentId ? parentId : '' }
        }
        isEdit={Boolean(editingItem)}
        isPending={createMutation.isPending || updateMutation.isPending}
        errorMessage={dialogError}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleFormSubmit}
      />
    </>
  );
};
