import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { customFetch, IndustryOptionDto } from '@vernoxy-pulse/api-client';
import { CompanyFormData } from '../schemas/company-form.schema';
import { useCustomerTypeOptionsQuery, useIndustryOptionsQuery } from '../../../hooks/use-master-data';
import { useEmployeesQuery } from '../../../hooks/use-organization';
import { useCompanyOptionsQuery } from '../api/companies.api';
import { DependentSelect } from '../../../components/DependentSelect';

export interface CompanyDetailsSectionProps {
  form: UseFormReturn<CompanyFormData>;
  companyId?: number;
}

export const CompanyDetailsSection: React.FC<CompanyDetailsSectionProps> = ({ form, companyId }) => {
  const { register, watch, setValue, formState: { errors } } = form;
  const industryId = watch('industry_id');
  const subIndustryId = watch('sub_industry_id');

  const { data: customerTypes } = useCustomerTypeOptionsQuery();
  const { data: topIndustries } = useIndustryOptionsQuery();
  const { data: employeesData } = useEmployeesQuery({ limit: 50, status: 'Active' });
  const { data: parentOptions } = useCompanyOptionsQuery({ exclude_id: companyId });

  return (
    <div className="space-y-6">
      {/* Basic Details */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          1. Company Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="company-name-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Company Name *
            </label>
            <input
              id="company-name-input"
              type="text"
              {...register('name')}
              placeholder="e.g. Acme Corporation"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="company-customer-type-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Customer Type *
            </label>
            <select
              id="company-customer-type-select"
              {...register('customer_type_id', { valueAsNumber: true })}
              className="w-full appearance-none px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white font-medium"
            >
              <option value="">Select Customer Type</option>
              {customerTypes?.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
            {errors.customer_type_id && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.customer_type_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="company-owner-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Account Owner
            </label>
            <select
              id="company-owner-select"
              {...register('owner_id', {
                setValueAs: (v) => (v ? Number(v) : null),
              })}
              className="w-full appearance-none px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white font-medium"
            >
              <option value="">Unassigned</option>
              {employeesData?.items?.map((emp) => (
                <option key={emp.emp_id} value={emp.emp_id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="company-industry-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Industry *
            </label>
            <select
              id="company-industry-select"
              {...register('industry_id', { valueAsNumber: true })}
              onChange={(e) => {
                setValue('industry_id', Number(e.target.value));
                setValue('sub_industry_id', null);
              }}
              className="w-full appearance-none px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white font-medium"
            >
              <option value="">Select Industry</option>
              {topIndustries?.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name}
                </option>
              ))}
            </select>
            {errors.industry_id && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.industry_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="company-sub-industry-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Sub-industry (Optional)
            </label>
            <DependentSelect
              id="company-sub-industry-select"
              parentId={industryId || undefined}
              value={subIndustryId || undefined}
              onChange={(val) => setValue('sub_industry_id', val ? Number(val) : null)}
              fetchOptions={async (pid: number | string) => {
                const data = await customFetch<IndustryOptionDto[]>(`/api/v1/industries/options?parent_id=${pid}`);
                return data.map((d) => ({ value: d.id, label: d.name }));
              }}
              placeholder="Select Sub-industry"
              noParentMessage="Select industry first"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="company-parent-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Parent Company (Optional)
            </label>
            <select
              id="company-parent-select"
              {...register('parent_company_id', {
                setValueAs: (v) => (v ? Number(v) : null),
              })}
              className="w-full appearance-none px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white font-medium"
            >
              <option value="">None (Independent entity)</option>
              {parentOptions?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.city ? `(${p.city})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Address Details */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          2. Address & Location
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="company-address-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Street Address
            </label>
            <input
              id="company-address-input"
              type="text"
              {...register('address')}
              placeholder="123 Business Avenue, Suite 400"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label htmlFor="company-city-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              City
            </label>
            <input
              id="company-city-input"
              type="text"
              {...register('city')}
              placeholder="e.g. San Francisco"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label htmlFor="company-state-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              State / Province
            </label>
            <input
              id="company-state-input"
              type="text"
              {...register('state')}
              placeholder="e.g. California"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="company-country-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Country
            </label>
            <input
              id="company-country-input"
              type="text"
              {...register('country')}
              placeholder="e.g. United States"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
