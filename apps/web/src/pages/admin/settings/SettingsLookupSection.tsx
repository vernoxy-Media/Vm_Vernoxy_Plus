import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { MasterLookupItemDto } from '@vernoxy-pulse/api-client';
import {
  useAdminLookupsQuery,
  useCreateLookupMutation,
  useUpdateLookupMutation,
  useDeleteLookupMutation,
} from '../../../hooks/use-master-data';
import { MasterDataPage, MasterDataColumn } from '../../../components/MasterDataPage';
import { MasterDataDialog, MasterDataFormField } from '../../../components/MasterDataDialog';

interface SettingsLookupSectionProps {
  lookupType: string;
  title: string;
  description: string;
  addLabel: string;
  searchPlaceholder?: string;
  icon: LucideIcon;
}

export const SettingsLookupSection: React.FC<SettingsLookupSectionProps> = ({
  lookupType,
  title,
  description,
  addLabel,
  searchPlaceholder,
  icon: Icon,
}) => {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterLookupItemDto | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const { data = [], isLoading, error } = useAdminLookupsQuery(lookupType);

  const createMutation = useCreateLookupMutation(lookupType);
  const updateMutation = useUpdateLookupMutation(lookupType);
  const deleteMutation = useDeleteLookupMutation(lookupType);

  const filtered = data.filter(
    (item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()),
  );

  const handleOpenAdd = () => {
    setEditingItem(null);
    setDialogError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: MasterLookupItemDto) => {
    setEditingItem(item);
    setDialogError(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: MasterLookupItemDto) => {
    try {
      await deleteMutation.mutateAsync(item.id);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || 'Failed to delete item');
    }
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    setDialogError(null);
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: {
            label: (values.label as string).trim(),
            code: values.code ? (values.code as string).trim() : undefined,
            sort_order: values.sort_order ? Number(values.sort_order) : undefined,
            is_active: Boolean(values.is_active),
          },
        });
      } else {
        await createMutation.mutateAsync({
          label: (values.label as string).trim(),
          code: values.code ? (values.code as string).trim() : undefined,
          sort_order: values.sort_order ? Number(values.sort_order) : undefined,
        });
      }
      setIsDialogOpen(false);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      setDialogError(e.detail || e.message || 'Operation failed');
    }
  };

  const dialogFields: MasterDataFormField[] = [
    {
      name: 'label',
      label: 'Display Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Bug Fix, Meeting, Internal',
    },
    {
      name: 'code',
      label: 'Code (optional)',
      type: 'text',
      placeholder: 'Auto-generated from name if left blank',
      helpText: 'Unique identifier used in API and exports. Use lowercase_snake_case.',
    },
    {
      name: 'sort_order',
      label: 'Sort Order',
      type: 'text',
      placeholder: 'e.g. 10, 20, 30',
      helpText: 'Items are ordered numerically (lower = first).',
    },
    ...(editingItem
      ? [
          {
            name: 'is_active',
            label: 'Active',
            type: 'checkbox' as const,
            helpText: 'Inactive items will not appear in dropdowns.',
          },
        ]
      : []),
  ];

  const columns: MasterDataColumn<MasterLookupItemDto>[] = [
    {
      key: 'label',
      header: 'Name',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="font-semibold text-slate-800">{item.label}</span>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (item) => (
        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          {item.code}
        </span>
      ),
    },
    {
      key: 'sort_order',
      header: 'Order',
      render: (item) => (
        <span className="text-slate-500 text-sm">{item.sort_order}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
            item.is_active
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
              : 'bg-slate-100 text-slate-600 border border-slate-200/60'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <>
      <MasterDataPage<MasterLookupItemDto>
        title={title}
        description={description}
        addLabel={addLabel}
        searchPlaceholder={searchPlaceholder || `Search ${title.toLowerCase()}...`}
        searchValue={search}
        onSearchChange={setSearch}
        columns={columns}
        items={filtered}
        getItemKey={(item) => item.id}
        isLoading={isLoading}
        error={error ? `Failed to load ${title.toLowerCase()}` : null}
        emptyIcon={<Icon className="w-8 h-8" />}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <MasterDataDialog
        isOpen={isDialogOpen}
        title={editingItem ? `Edit ${title.slice(0, -1)}` : addLabel}
        icon={<Icon className="w-5 h-5" />}
        fields={dialogFields}
        initialValues={
          editingItem
            ? {
                label: editingItem.label,
                code: editingItem.code,
                sort_order: String(editingItem.sort_order),
                is_active: editingItem.is_active,
              }
            : { label: '', code: '', sort_order: '' }
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
