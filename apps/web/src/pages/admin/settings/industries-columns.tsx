import { IndustryListItemDto } from '@vernoxy-pulse/api-client';
import { MasterDataColumn } from '../../../components/MasterDataPage';
import { MasterDataFormField } from '../../../components/MasterDataDialog';
import { ShieldCheck } from 'lucide-react';

export function getIndustryColumns(): MasterDataColumn<IndustryListItemDto>[] {
  return [
    {
      key: 'name',
      header: 'Name',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{item.name}</span>
          {item.is_default && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-[11px] font-semibold">
              <ShieldCheck className="w-3 h-3" />
              Default
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'parent',
      header: 'Parent',
      render: (item) =>
        item.parent ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
            {item.parent.name}
          </span>
        ) : (
          <span className="text-slate-400 italic">None (Top-Level)</span>
        ),
    },
    {
      key: 'sub_count',
      header: 'Sub-industries',
      render: (item) => <span className="font-mono text-xs">{item.sub_count}</span>,
    },
    {
      key: 'company_count',
      header: 'Companies',
      render: (item) => <span className="font-mono text-xs">{item.company_count}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
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
}

export function getIndustryDialogFields(
  isEdit: boolean,
  parentOptions: { id: number; name: string }[] | undefined,
): MasterDataFormField[] {
  const parentOptionsList = [
    { value: '', label: 'None: top-level industry' },
    ...(parentOptions?.map((o) => ({ value: o.id, label: o.name })) || []),
  ];

  return [
    {
      name: 'name',
      label: 'Industry Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Technology, Healthcare, SaaS',
    },
    ...(!isEdit
      ? [
          {
            name: 'parent_id',
            label: 'Parent Industry',
            type: 'select' as const,
            placeholder: 'Select Parent Industry',
            options: parentOptionsList,
            helpText: 'Select a parent to create a 2nd level sub-industry.',
          },
        ]
      : [
          {
            name: 'is_active',
            label: 'Active Status',
            type: 'checkbox' as const,
            helpText: 'Inactive industries cannot be assigned to companies.',
          },
        ]),
  ];
}
