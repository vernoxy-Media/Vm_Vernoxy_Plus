import React, { useState } from 'react';
import { CustomerTypeItemDto } from '@vernoxy-pulse/api-client';
import {
  useCustomerTypesQuery,
  useCreateCustomerTypeMutation,
  useUpdateCustomerTypeMutation,
  useDeleteCustomerTypeMutation,
} from '../../../hooks/use-master-data';
import { MasterDataPage, MasterDataColumn } from '../../../components/MasterDataPage';
import { MasterDataDialog, MasterDataFormField } from '../../../components/MasterDataDialog';
import { Users, ShieldCheck, Check } from 'lucide-react';

export const SettingsCustomerTypesSection: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [cursor, setCursor] = useState<number | undefined>(undefined);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomerTypeItemDto | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const { data, isLoading, error } = useCustomerTypesQuery({
    q: search || undefined,
    is_active: statusFilter,
    limit: 20,
    cursor,
  });

  const createMutation = useCreateCustomerTypeMutation();
  const updateMutation = useUpdateCustomerTypeMutation();
  const deleteMutation = useDeleteCustomerTypeMutation();

  const handleOpenAdd = () => {
    setEditingItem(null);
    setDialogError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: CustomerTypeItemDto) => {
    setEditingItem(item);
    setDialogError(null);
    setIsDialogOpen(true);
  };

  const handleMakeDefault = async (item: CustomerTypeItemDto) => {
    try {
      await updateMutation.mutateAsync({
        id: item.customer_type_id,
        data: { is_default: true },
      });
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || 'Failed to set default customer type');
    }
  };

  const handleDelete = async (item: CustomerTypeItemDto) => {
    if (item.is_default) {
      alert('The default customer type cannot be deleted.');
      return;
    }
    try {
      await deleteMutation.mutateAsync(item.customer_type_id);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || 'Cannot delete customer type: in use by companies');
    }
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    setDialogError(null);
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.customer_type_id,
          data: {
            name: (values.name as string).trim(),
            is_active: Boolean(values.is_active),
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: (values.name as string).trim(),
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
      name: 'name',
      label: 'Customer Type Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Enterprise, SME, Direct, Info Only',
    },
    ...(editingItem
      ? [
          {
            name: 'is_active',
            label: 'Active Status',
            type: 'checkbox' as const,
            helpText: 'Inactive customer types cannot be assigned to new companies.',
          },
        ]
      : []),
  ];

  const columns: MasterDataColumn<CustomerTypeItemDto>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{item.name}</span>
          {item.is_default && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-semibold">
              <ShieldCheck className="w-3 h-3" />
              Default
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
            item.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-600 border border-slate-200/60'
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
      <MasterDataPage<CustomerTypeItemDto>
        title="Customer Types"
        description="Classify your clients into operational account segments and relationship tiers."
        addLabel="Add Customer Type"
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
        columns={columns}
        items={data?.items || []}
        getItemKey={(item) => item.customer_type_id}
        isLoading={isLoading}
        error={error ? (error as { message?: string }).message || 'Failed to load customer types' : null}
        emptyIcon={<Users className="w-8 h-8" />}
        nextCursor={data?.next_cursor}
        onNextPage={() => setCursor(data?.next_cursor || undefined)}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        canDelete={(item) => !item.is_default}
        extraActions={(item) =>
          !item.is_default &&
          item.is_active && (
            <button
              type="button"
              onClick={() => handleMakeDefault(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200"
              title="Make Default"
            >
              <Check className="w-3.5 h-3.5" />
              Make default
            </button>
          )
        }
      />

      <MasterDataDialog
        isOpen={isDialogOpen}
        title={editingItem ? 'Edit Customer Type' : 'Add Customer Type'}
        icon={<Users className="w-5 h-5" />}
        fields={dialogFields}
        initialValues={
          editingItem
            ? { name: editingItem.name, is_active: editingItem.is_active }
            : { name: '' }
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
