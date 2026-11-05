import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { MasterLookupItemDto, CreateLookupDto, UpdateLookupDto } from '@vernoxy-pulse/api-client';
import {
  useAdminLookupsQuery,
  useCreateLookupMutation,
  useUpdateLookupMutation,
  useDeleteLookupMutation,
} from '@/features/organization/hooks/use-master-data';
import { MasterDataPage, MasterDataColumn } from '@/features/organization/components/MasterDataPage';
import { MasterDataDialog, MasterDataFormField } from '@/features/organization/components/MasterDataDialog';

/** A lookup row can belong to another one (a GIDC Area belongs to a GIDC). The API sends the link. */
type LookupRow = MasterLookupItemDto & { parent_id?: number | null; parent_label?: string | null };

interface SettingsLookupSectionProps {
  /** Set when each row belongs to a row of another list, such as an area to its GIDC. */
  parent?: { lookupType: string; label: string; emptyLabel: string };
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
  parent,
}) => {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterLookupItemDto | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const { data: rawData = [], isLoading, error } = useAdminLookupsQuery(lookupType);
  const data = rawData as LookupRow[];
  // Same query key as the list itself when there is no parent, so nothing extra is fetched
  const { data: parentItems = [] } = useAdminLookupsQuery(parent?.lookupType ?? lookupType);

  const createMutation = useCreateLookupMutation(lookupType);
  const updateMutation = useUpdateLookupMutation(lookupType);
  const deleteMutation = useDeleteLookupMutation(lookupType);

  const filtered = data.filter(
    (item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      (item.parent_label ?? '').toLowerCase().includes(search.toLowerCase()),
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
            ...(parent ? { parent_id: values.parent_id ? Number(values.parent_id) : null } : {}),
          } as UpdateLookupDto,
        });
      } else {
        await createMutation.mutateAsync({
          label: (values.label as string).trim(),
          code: values.code ? (values.code as string).trim() : undefined,
          sort_order: values.sort_order ? Number(values.sort_order) : undefined,
          ...(parent && values.parent_id ? { parent_id: Number(values.parent_id) } : {}),
        } as CreateLookupDto);
      }
      setIsDialogOpen(false);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      setDialogError(e.detail || e.message || 'Operation failed');
    }
  };

  const dialogFields: MasterDataFormField[] = [
    ...(parent
      ? [
          {
            name: 'parent_id',
            label: parent.label,
            type: 'select' as const,
            options: [
              { value: '', label: parent.emptyLabel },
              ...parentItems.filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.label })),
            ],
            helpText: `Pick the ${parent.label} this belongs to, or leave it common to all.`,
          },
        ]
      : []),
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
    ...(parent
      ? [
          {
            key: 'parent',
            header: parent.label,
            render: (item: MasterLookupItemDto) => {
              const label = (item as LookupRow).parent_label;
              return label ? (
                <span className="inline-flex whitespace-nowrap rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">{label}</span>
              ) : (
                <span className="inline-flex whitespace-nowrap rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">All {parent.label}s</span>
              );
            },
          },
        ]
      : []),
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
        icon={<Icon className="w-5 h-5" />}
        emptyIcon={<Icon className="w-8 h-8" />}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <MasterDataDialog
        isOpen={isDialogOpen}
        title={editingItem ? addLabel.replace(/^Add\s+/, 'Edit ') : addLabel}
        icon={<Icon className="w-5 h-5" />}
        fields={dialogFields}
        initialValues={
          editingItem
            ? {
                parent_id: String((editingItem as LookupRow).parent_id ?? ''),
                label: editingItem.label,
                code: editingItem.code,
                sort_order: String(editingItem.sort_order),
                is_active: editingItem.is_active,
              }
            : { parent_id: '', label: '', code: '', sort_order: '' }
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
