import React from 'react';
import { Drawer } from '../common/Drawer';
import { SelectField } from '../common/FilterFields';
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
          <SelectField
            ariaLabel="Assigned sales user"
            value={localFilters.assigned_to}
            onChange={(v) => handleChange('assigned_to', v)}
            placeholder="All assignees"
            options={[{ value: 'me', label: 'Assigned to me' }, ...(leadMasters.lead_by_users ?? []).map((u) => ({ value: String(u.emp_id), label: u.name }))]}
          />
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
          <SelectField
            ariaLabel="Industry"
            value={localFilters.industry}
            onChange={(v) => handleChange('industry', v)}
            placeholder="All industries"
            options={(compMasters.industries ?? []).map((ind) => {
              const parent = ind.parent_id ? compMasters.industries.find((x) => x.id === ind.parent_id) : null;
              return { value: String(ind.id), label: parent ? `${parent.name} › ${ind.name}` : ind.name };
            })}
          />
        </div>

        {/* City */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1.5">City</label>
          <SelectField
            ariaLabel="City"
            value={localFilters.city}
            onChange={(v) => handleChange('city', v)}
            placeholder="All cities"
            options={(compMasters.cities ?? []).map((c) => ({ value: c, label: c }))}
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
