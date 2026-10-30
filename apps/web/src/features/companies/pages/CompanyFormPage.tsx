import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { companyFormSchema, CompanyFormData } from '../schemas/company-form.schema';
import {
  useCompanyDetailQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useCompanyDuplicatesQuery,
} from '../api/companies.api';
import { CompanyDetailsSection } from '../components/CompanyDetailsSection';
import { CompanyChannelsSection } from '../components/CompanyChannelsSection';
import { CompanyContactsSection } from '../components/CompanyContactsSection';
import { DuplicateNotice } from '../../../components/DuplicateNotice';
import { buildCreateCompanyPayload, buildUpdateCompanyPayload } from '../utils/company-payload';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export const CompanyFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const companyId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const [formError, setFormError] = useState<string | null>(null);

  const { data: existingCompany, isLoading: isFetching } = useCompanyDetailQuery(companyId);
  const createMutation = useCreateCompanyMutation();
  const updateMutation = useUpdateCompanyMutation();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      customer_type_id: undefined,
      industry_id: undefined,
      sub_industry_id: null,
      parent_company_id: null,
      owner_id: null,
      address: '',
      city: '',
      state: '',
      country: '',
      is_active: true,
      channels: [],
      contacts: [],
    },
  });

  const { handleSubmit, reset, watch } = form;
  const watchedName = watch('name');
  const watchedChannels = watch('channels') || [];

  const primaryEmail = watchedChannels.find((c) => c.channel_type === 'email')?.value;
  const primaryPhone = watchedChannels.find((c) => c.channel_type === 'phone' || c.channel_type === 'whatsapp')?.value;
  const primaryWebsite = watchedChannels.find((c) => c.channel_type === 'website')?.value;

  const { data: duplicateMatches } = useCompanyDuplicatesQuery({
    name: watchedName,
    email: primaryEmail,
    phone: primaryPhone,
    website: primaryWebsite,
  });

  // Populate data in edit mode
  useEffect(() => {
    if (existingCompany) {
      reset({
        name: existingCompany.name,
        customer_type_id: existingCompany.customer_type?.id,
        industry_id: existingCompany.industry?.id,
        sub_industry_id: existingCompany.sub_industry?.id || null,
        parent_company_id: existingCompany.parent?.id || null,
        owner_id: existingCompany.owner?.emp_id || null,
        address: existingCompany.address || '',
        city: existingCompany.city || '',
        state: existingCompany.state || '',
        country: existingCompany.country || '',
        is_active: existingCompany.is_active,
        channels:
          existingCompany.channels?.map((ch) => ({
            channel_id: ch.channel_id,
            channel_type: ch.channel_type as any,
            value: ch.value,
            label: ch.label || '',
            is_primary: ch.is_primary,
          })) || [],
        contacts:
          existingCompany.contacts?.map((ct) => ({
            company_person_id: ct.company_person_id,
            person_id: ct.person_id,
            name: ct.name,
            email: ct.email,
            mobile: ct.mobile,
            linkedin_url: ct.linkedin_url,
            designation: ct.designation || '',
            department_id: ct.department?.id || null,
            is_primary: ct.is_primary,
            reports_to_company_person_id: ct.reports_to_company_person_id,
          })) || [],
      });
    }
  }, [existingCompany, reset]);

  const onSubmit = async (values: CompanyFormData) => {
    setFormError(null);
    try {
      if (isEdit && companyId) {
        await updateMutation.mutateAsync({
          id: companyId,
          data: buildUpdateCompanyPayload(values) as any,
        });
        navigate(`/companies/${companyId}`);
      } else {
        const res = await createMutation.mutateAsync(buildCreateCompanyPayload(values) as any);
        navigate(`/companies/${res.company_id}`);
      }
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      setFormError(e.detail || e.message || 'Failed to save company');
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isFetching && isEdit) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading company form...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Link
            to={isEdit ? `/companies/${companyId}` : '/companies'}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isEdit ? 'Edit Company' : 'Create New Company'}
            </h1>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <span className="font-medium">{formError}</span>
        </div>
      )}

      {/* Non-blocking Duplicate Notice */}
      {duplicateMatches && duplicateMatches.length > 0 && (
        <div className="space-y-2">
          {duplicateMatches.map((m) => (
            <DuplicateNotice
              key={m.company_id}
              title={`Possible duplicate: "${m.name}"`}
              reason={m.reason}
              actionLabel="View Company"
              onAction={() => window.open(`/companies/${m.company_id}`, '_blank')}
            />
          ))}
        </div>
      )}

      {/* Sections */}
      <CompanyDetailsSection form={form} companyId={companyId} />
      <CompanyChannelsSection form={form} />
      <CompanyContactsSection form={form} />

      {/* Sticky Bottom Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/companies/${companyId}` : '/companies')}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Update Company' : 'Save Company'}
          </button>
        </div>
      </div>
    </form>
  );
};
