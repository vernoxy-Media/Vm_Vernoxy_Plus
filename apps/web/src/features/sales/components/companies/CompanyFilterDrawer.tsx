import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import type { SalesCompanyControllerListParams, SalesMastersResponse } from '../../types/sales.types';
import { RotateCcw } from 'lucide-react';

export interface CompanyFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SalesCompanyControllerListParams;
  masters?: SalesMastersResponse;
  onApply: (filters: Partial<SalesCompanyControllerListParams>) => void;
  onReset: () => void;
}

export const CompanyFilterDrawer: React.FC<CompanyFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  masters,
  onApply,
  onReset,
}) => {
  const [localFilters, setLocalFilters] = useState<SalesCompanyControllerListParams>({ ...filters });

  const handleChange = (key: keyof SalesCompanyControllerListParams, value: unknown) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
    onReset();
    onClose();
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <button
        type="button"
        onClick={handleReset}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset all
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
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
      title="Filter Companies"
      subtitle="Narrow down the companies list"
      footer={footer}
      size="lg"
    >
      <div className="space-y-5">
        {/* Lead Status */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Lead Status
          </label>
          <select
            value={localFilters.lead ?? 'all'}
            onChange={(e) => handleChange('lead', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Companies</option>
            <option value="not_a_lead">Not a Lead</option>
            <option value="open">Open Leads</option>
            <option value="client">Converted to Client</option>
            <option value="lost">Lost</option>
          </select>
        </div>

        {/* City & State */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
            <input
              type="text"
              placeholder="e.g. Ahmedabad, Surat"
              value={Array.isArray(localFilters.city) ? localFilters.city.join(', ') : localFilters.city ?? ''}
              onChange={(e) =>
                handleChange('city', e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined)
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">State</label>
            <input
              type="text"
              placeholder="e.g. Gujarat, Maharashtra"
              value={Array.isArray(localFilters.state) ? localFilters.state.join(', ') : localFilters.state ?? ''}
              onChange={(e) =>
                handleChange('state', e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined)
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Industry */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Industry</label>
          <select
            value={Array.isArray(localFilters.industry_ids) ? localFilters.industry_ids[0] ?? '' : ''}
            onChange={(e) =>
              handleChange('industry_ids', e.target.value ? [Number(e.target.value)] : undefined)
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Industries</option>
            {masters?.industries?.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.name}
              </option>
            ))}
          </select>
        </div>

        {/* Nature of Business */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nature of Business
          </label>
          <select
            value={Array.isArray(localFilters.nature_of_business) ? localFilters.nature_of_business[0] ?? '' : ''}
            onChange={(e) =>
              handleChange('nature_of_business', e.target.value ? [e.target.value] : undefined)
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Types</option>
            {masters?.nature_of_business?.map((nob) => (
              <option key={nob} value={nob}>
                {nob}
              </option>
            ))}
          </select>
        </div>

        {/* GIDC Details */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Located in GIDC?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleChange('is_gidc', localFilters.is_gidc === true ? undefined : true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  localFilters.is_gidc === true
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleChange('is_gidc', localFilters.is_gidc === false ? undefined : false)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  localFilters.is_gidc === false
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {localFilters.is_gidc && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <div>
                <label className="block text-2xs font-medium text-slate-600 mb-1">GIDC Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vatva, Naroda"
                  value={Array.isArray(localFilters.gidc_name) ? localFilters.gidc_name.join(', ') : localFilters.gidc_name ?? ''}
                  onChange={(e) =>
                    handleChange('gidc_name', e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="block text-2xs font-medium text-slate-600 mb-1">Area / Phase</label>
                <input
                  type="text"
                  placeholder="e.g. Phase 4"
                  value={Array.isArray(localFilters.gidc_area_phase) ? localFilters.gidc_area_phase.join(', ') : localFilters.gidc_area_phase ?? ''}
                  onChange={(e) =>
                    handleChange('gidc_area_phase', e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* Website Quality */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Website Quality
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['Good', 'Average', 'Poor', 'No Website'].map((quality) => {
              const current = (localFilters.website_quality ?? '').split(',').filter(Boolean);
              const isChecked = current.includes(quality);
              return (
                <label
                  key={quality}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-medium'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleChange('website_quality', [...current, quality].join(','));
                      } else {
                        handleChange('website_quality', current.filter((q) => q !== quality).join(','));
                      }
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{quality}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Employees & Turnover Ranges */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Min Employees</label>
            <input
              type="number"
              placeholder="0"
              value={localFilters.employees_min ?? ''}
              onChange={(e) => handleChange('employees_min', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Employees</label>
            <input
              type="number"
              placeholder="5000"
              value={localFilters.employees_max ?? ''}
              onChange={(e) => handleChange('employees_max', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
            />
          </div>
        </div>

        {/* Boolean Flags */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={localFilters.has_website === true}
              onChange={(e) => handleChange('has_website', e.target.checked ? true : undefined)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Has Website</span>
          </label>
          <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={localFilters.has_brochure === true}
              onChange={(e) => handleChange('has_brochure', e.target.checked ? true : undefined)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Has Brochure</span>
          </label>
        </div>
      </div>
    </Drawer>
  );
};
