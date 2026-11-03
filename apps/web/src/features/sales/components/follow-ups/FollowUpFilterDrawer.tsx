import React from 'react';
import { Drawer } from '../common/Drawer';
import { useSalesLeadControllerMasters, useSalesCompanyControllerMasters } from '@vernoxy-pulse/api-client';
import { EMPTY_LEAD_MASTERS } from '../../types/sales.types';
import type { SalesLeadMastersResponse, SalesMastersResponse } from '../../types/sales.types';

export interface FollowUpFilterState {
  assigned_to: string; // 'me' | 'all' | emp_id
  type: string;
  city: string;
  industry: string;
  date_after: string;
  date_before: string;
}

export interface FollowUpFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FollowUpFilterState;
  onApply: (filters: FollowUpFilterState) => void;
  onReset: () => void;
}

export const FollowUpFilterDrawer: React.FC<FollowUpFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
}) => {
  const [localFilters, setLocalFilters] = React.useState<FollowUpFilterState>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  // Fetch masters
  const { data: leadMastersRaw } = useSalesLeadControllerMasters();
  const leadMasters: SalesLeadMastersResponse = (
    (leadMastersRaw as unknown as { data?: SalesLeadMastersResponse })?.data ??
    (leadMastersRaw as unknown as SalesLeadMastersResponse) ?? EMPTY_LEAD_MASTERS
  );

  const { data: compMastersRaw } = useSalesCompanyControllerMasters();
  const compMasters: SalesMastersResponse = (
    (compMastersRaw as unknown as { data?: SalesMastersResponse })?.data ??
    (compMastersRaw as unknown as SalesMastersResponse) ?? {
      industries: [],
      nature_of_business: [],
      designation: [],
      gidc_names: [],
      gidc_areas: [],
      website_quality: [],
      lead_source: [],
      service_fit: [],
      states: [],
      countries: [],
      cities: [],
    }
  );

  const handleChange = (key: keyof FollowUpFilterState, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <button
        type="button"
        onClick={handleReset}
        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
      >
        Reset All
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleApply}
          className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Follow-ups"
      subtitle="Filter follow-ups by assignee, type and date"
      footer={footer}
    >
      <div className="space-y-5 text-xs">
        {/* Assignee */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1.5">Assigned Sales User</label>
          <select
            value={localFilters.assigned_to}
            onChange={(e) => handleChange('assigned_to', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Assignees</option>
            <option value="me">Assigned to Me</option>
            {leadMasters.lead_by_users?.map((user) => (
              <option key={user.emp_id} value={String(user.emp_id)}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        {/* Follow-up Type */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1.5">Channel / Type</label>
          <div className="grid grid-cols-3 gap-1.5">
            {['', 'Call', 'Email', 'WhatsApp', 'Meeting', 'Site Visit'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleChange('type', t)}
                className={`py-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                  localFilters.type === t
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t || 'All Types'}
              </button>
            ))}
          </div>
        </div>

        {/* Industry */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1.5">Industry Sector</label>
          <select
            value={localFilters.industry}
            onChange={(e) => handleChange('industry', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Industries</option>
            {compMasters.industries?.map((ind) => (
              <option key={ind.id} value={String(ind.id)}>
                {ind.name}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1.5">City</label>
          <input
            type="text"
            value={localFilters.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="e.g. Ahmedabad, Surat"
            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Date Range */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1.5">Due Date Range</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-2xs text-gray-400">Due After</span>
              <input
                type="date"
                value={localFilters.date_after}
                onChange={(e) => handleChange('date_after', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
              />
            </div>
            <div>
              <span className="text-2xs text-gray-400">Due Before</span>
              <input
                type="date"
                value={localFilters.date_before}
                onChange={(e) => handleChange('date_before', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
