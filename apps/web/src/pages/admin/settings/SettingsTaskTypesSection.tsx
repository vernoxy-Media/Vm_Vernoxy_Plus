import React, { useState } from 'react';
import { Tag } from 'lucide-react';
import { LookupOptionDto } from '@vernoxy-pulse/api-client';
import { useLookupsQuery } from '../../../hooks/use-master-data';
import { MasterDataPage, MasterDataColumn } from '../../../components/MasterDataPage';

export const SettingsTaskTypesSection: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data = [], isLoading, error } = useLookupsQuery('task_type');

  const filtered = data.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()) ||
    item.code.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: MasterDataColumn<LookupOptionDto>[] = [
    {
      key: 'label',
      header: 'Task Type Name',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-blue-500" />
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
      key: 'status',
      header: 'Status',
      render: () => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Active
        </span>
      ),
    },
  ];

  return (
    <MasterDataPage<LookupOptionDto>
      title="Task Types"
      description="System task classification types used across task management and reports."
      addLabel="Add Task Type"
      searchPlaceholder="Search task types..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={columns}
      items={filtered}
      getItemKey={(item) => item.id}
      isLoading={isLoading}
      error={error ? 'Failed to load task types' : null}
      onAdd={() => alert('New task types are managed via database seed and lookup definitions.')}
    />
  );
};
