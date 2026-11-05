import React from 'react';
import type { LeadStatusType, LeadCounters } from '../../types/sales.types';

export interface LeadStatusTabsProps {
  activeTab: LeadStatusType | 'All';
  onSelectTab: (tab: LeadStatusType | 'All') => void;
  counters: LeadCounters;
  totalLeads: number;
}

export const LeadStatusTabs: React.FC<LeadStatusTabsProps> = ({
  activeTab,
  onSelectTab,
  counters,
  totalLeads,
}) => {
  const tabs: Array<{ id: LeadStatusType | 'All'; label: string; count: number; color?: string }> = [
    { id: 'All', label: 'All Leads', count: totalLeads },
    { id: 'New', label: 'New', count: counters.by_status?.['New'] || 0, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { id: 'Contacted', label: 'Contacted', count: counters.by_status?.['Contacted'] || 0, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { id: 'Qualified', label: 'Qualified', count: counters.by_status?.['Qualified'] || 0, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 'On Hold', label: 'On Hold', count: counters.by_status?.['On Hold'] || 0, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'Converted', label: 'Converted', count: counters.by_status?.['Converted'] || 0, color: 'text-teal-600 bg-teal-50 border-teal-200' },
    { id: 'Lost', label: 'Lost', count: counters.by_status?.['Lost'] || 0, color: 'text-gray-600 bg-gray-100 border-gray-200' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 overflow-x-auto no-scrollbar">
      {/* Status Tabs */}
      <div className="flex items-center gap-1.5 min-w-max pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-2xs font-bold ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
