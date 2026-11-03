import React, { useState, useEffect, } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  MapPin,
  User,
  Briefcase,
  Globe,
  Save,
  ChevronLeft,
  ChevronRight,
  
  AlertCircle,
  Loader2,
  
} from 'lucide-react';
import {
  useSalesCompanyControllerGet,
  useSalesCompanyControllerCreate,
  useSalesCompanyControllerUpdate,
  useSalesCompanyControllerMasters,
  useSalesCompanyControllerDuplicateCheck,
  useSalesContactControllerAdd,
} from '@vernoxy-pulse/api-client';

import { companyFormSchema, CompanyFormValues } from '../schemas/company.schema';
import { DuplicateWarningCard } from '../components/companies/DuplicateWarningCard';
import { ExtraContactsEditor, type ExtraContact } from '../components/companies/ExtraContactsEditor';
import { useDebounce } from '../hooks/useDebounce';
import { parseApiError } from '../utils/error';
import type {
  SalesCompanyDetailResponse,
  SalesMastersResponse,
  DuplicateMatchItem,
} from '../types/sales.types';

const FIELD_LABELS: Partial<Record<keyof CompanyFormValues, string>> = {
  name: 'Company name',
  no_of_branches: 'No. of branches',
  no_of_plants: 'No. of plants',
  full_address: 'Full address',
  city: 'City',
  state: 'State',
  country: 'Country',
  pin: 'PIN code',
  google_maps_url: 'Google Maps link',
  gidc_name: 'GIDC name',
  gidc_area_phase: 'GIDC area / phase',
  nature_of_business: 'Nature of business',
  industry: 'Industry',
  estimated_employees: 'Employees',
  estimated_turnover: 'Turnover',
  year_established: 'Year established',
  website: 'Website',
  website_quality: 'Website quality',
  contact_name: 'Contact person',
  contact_designation: 'Designation',
  contact_mobile: 'Mobile',
  contact_email: 'Email',
  linkedin_url: 'LinkedIn',
  instagram_url: 'Instagram',
  facebook_url: 'Facebook',
  youtube_url: 'YouTube',
  google_business_profile_url: 'Google Business Profile',
};

type SectionId = 'basic' | 'location' | 'contacts' | 'business' | 'online';

const SECTIONS: Array<{ id: SectionId; label: string; hint: string; Icon: typeof Building2 }> = [
  { id: 'basic', label: 'Basic info', hint: 'Name and size', Icon: Building2 },
  { id: 'location', label: 'Location', hint: 'Address and GIDC', Icon: MapPin },
  { id: 'contacts', label: 'Contacts', hint: 'People to talk to', Icon: User },
  { id: 'business', label: 'Business', hint: 'Industry and offerings', Icon: Briefcase },
  { id: 'online', label: 'Online', hint: 'Website and social', Icon: Globe },
];

const SECTION_FIELDS: Record<SectionId, string[]> = {
  basic: ['name', 'year_established', 'estimated_turnover', 'estimated_employees', 'no_of_branches', 'no_of_plants'],
  location: ['full_address', 'city', 'state', 'pin', 'country', 'google_maps_url', 'is_gidc', 'gidc_name', 'gidc_area_phase'],
  contacts: ['contact_name', 'contact_designation', 'contact_mobile', 'contact_email'],
  business: ['industry', 'nature_of_business', 'products_services', 'existing_major_clients'],
  online: ['website', 'website_quality', 'developed_by', 'linkedin_url', 'google_business_profile_url', 'instagram_url', 'facebook_url', 'youtube_url'],
};

const sectionOf = (field: string): SectionId => (SECTIONS.find((sec) => SECTION_FIELDS[sec.id].includes(field))?.id ?? 'basic');

export const CompanyFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const companyId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatchItem[]>([]);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [section, setSection] = useState<SectionId>('basic');
  const [extraContacts, setExtraContacts] = useState<ExtraContact[]>([]);
  const [extraErrors, setExtraErrors] = useState<Record<number, string>>({});
  const [savedCompanyId, setSavedCompanyId] = useState<number | null>(null);

  // Fetch masters
  const { data: mastersRaw } = useSalesCompanyControllerMasters();
  const masters: SalesMastersResponse = (
    (mastersRaw as unknown as { data?: SalesMastersResponse })?.data ??
    (mastersRaw as unknown as SalesMastersResponse) ?? {
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

  // Fetch company in edit mode
  const { data: companyDetailRaw, isLoading: isLoadingCompany } = useSalesCompanyControllerGet(
    companyId ?? 0,
    {
      query: {
        enabled: Boolean(isEditMode && companyId),
      },
    },
  );

  const existingCompany: SalesCompanyDetailResponse | null = (
    (companyDetailRaw as unknown as { data?: SalesCompanyDetailResponse })?.data ??
    (companyDetailRaw as unknown as SalesCompanyDetailResponse) ??
    null
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      year_established: null,
      estimated_turnover: null,
      estimated_employees: null,
      no_of_branches: null,
      no_of_plants: null,
      full_address: '',
      city: '',
      state: '',
      pin: '',
      country: 'India',
      google_maps_url: '',
      is_gidc: false,
      gidc_name: '',
      gidc_area_phase: '',
      industry: '',
      nature_of_business: '',
      products_services: '',
      existing_major_clients: '',
      brochure_url: '',
      website: '',
      website_quality: '',
      developed_by: '',
      linkedin_url: '',
      instagram_url: '',
      facebook_url: '',
      youtube_url: '',
      google_business_profile_url: '',
      contact_name: '',
      contact_designation: '',
      contact_email: '',
      contact_mobile: '',
    },
  });

  // Populate form in edit mode
  useEffect(() => {
    if (isEditMode && existingCompany) {
      const f = existingCompany.fields || {};
      const primaryContact = existingCompany.contacts?.find((c) => c.is_primary) || existingCompany.contacts?.[0];

      reset({
        name: f.name || '',
        year_established: f.year_established ?? null,
        estimated_turnover: f.estimated_turnover ?? null,
        estimated_employees: f.estimated_employees ?? null,
        no_of_branches: f.no_of_branches ?? null,
        no_of_plants: f.no_of_plants ?? null,
        full_address: f.full_address || '',
        city: f.city || '',
        state: f.state || '',
        pin: f.pin || '',
        country: f.country || 'India',
        google_maps_url: f.google_maps_url || '',
        is_gidc: Boolean(f.is_gidc),
        gidc_name: f.gidc_name || '',
        gidc_area_phase: f.gidc_area_phase || '',
        industry: f.industry || existingCompany.industry?.name || '',
        nature_of_business: f.nature_of_business || '',
        products_services: f.products_services || '',
        existing_major_clients: f.existing_major_clients || '',
        brochure_url: existingCompany.brochure_url || '',
        website: f.website || '',
        website_quality: f.website_quality || '',
        developed_by: f.developed_by || '',
        linkedin_url: f.linkedin_url || '',
        instagram_url: f.instagram_url || '',
        facebook_url: f.facebook_url || '',
        youtube_url: f.youtube_url || '',
        google_business_profile_url: f.google_business_profile_url || '',
        contact_name: primaryContact?.name || '',
        contact_designation: primaryContact?.designation || '',
        contact_email: primaryContact?.email || '',
        contact_mobile: primaryContact?.mobile || '',
      });
    }
  }, [isEditMode, existingCompany, reset]);

  // Watch fields for live duplicate check (in create mode)
  const watchName = watch('name');
  const watchCity = watch('city');
  // Contacts the company has besides the one shown in the primary fields (edit mode)
  const shownContact = existingCompany?.contacts?.find((c) => c.is_primary) || existingCompany?.contacts?.[0];
  const otherContacts = (existingCompany?.contacts ?? []).filter((c) => c !== shownContact);
  const sectionIndex = SECTIONS.findIndex((sec) => sec.id === section);
  const watchMobile = watch('contact_mobile');
  const watchEmail = watch('contact_email');
  const watchIsGidc = watch('is_gidc');

  const debouncedName = useDebounce(watchName, 400);
  const debouncedCity = useDebounce(watchCity, 400);
  const debouncedMobile = useDebounce(watchMobile, 400);
  const debouncedEmail = useDebounce(watchEmail, 400);

  // Live duplicate query
  const shouldCheckDuplicates =
    !isEditMode &&
    Boolean(
      (debouncedName && debouncedName.trim().length > 2 && debouncedCity) ||
        (debouncedMobile && debouncedMobile.trim().length >= 10) ||
        (debouncedEmail && debouncedEmail.includes('@')),
    );

  const { data: duplicateCheckData } = useSalesCompanyControllerDuplicateCheck(
    {
      name: debouncedName || undefined,
      city: debouncedCity || undefined,
      mobile: debouncedMobile || undefined,
      email: debouncedEmail || undefined,
    },
    {
      query: {
        enabled: shouldCheckDuplicates,
      },
    },
  );

  useEffect(() => {
    if (duplicateCheckData) {
      const result = (
        (duplicateCheckData as unknown as { data?: DuplicateMatchItem[] })?.data ??
        (duplicateCheckData as unknown as DuplicateMatchItem[]) ??
        []
      );
      if (Array.isArray(result) && result.length > 0) {
        setDuplicateMatches(result);
      } else {
        setDuplicateMatches([]);
      }
    }
  }, [duplicateCheckData]);

  // Mutations
  const createMutation = useSalesCompanyControllerCreate();
  const updateMutation = useSalesCompanyControllerUpdate();
  const addContact = useSalesContactControllerAdd();

  /** Adds the extra contacts to a saved company. Returns false (and says why) if one could not be added. */
  const saveExtraContacts = async (targetId: number): Promise<boolean> => {
    const errs: Record<number, string> = {};
    for (let i = 0; i < extraContacts.length; i++) {
      const c = extraContacts[i];
      try {
        await addContact.mutateAsync({
          id: targetId,
          data: {
            name: c.name.trim(),
            designation: c.designation.trim() || undefined,
            mobile: c.mobile.trim() || undefined,
            email: c.email.trim() || undefined,
          },
        });
      } catch (err: unknown) {
        errs[i] = parseApiError(err).message || 'Could not add this contact';
      }
    }
    if (Object.keys(errs).length === 0) return true;
    // Keep only the ones that failed, so nothing is added twice
    const failed = extraContacts.filter((_, i) => errs[i]);
    setExtraContacts(failed);
    setSection('contacts');
    setExtraErrors(Object.fromEntries(Object.values(errs).map((m, n) => [n, m])));
    return false;
  };

  const onSubmit = async (values: CompanyFormValues) => {
    setFormError(null);
    setExtraErrors({});

    // A contact row needs a name (the rest is optional)
    const missing: Record<number, string> = {};
    extraContacts.forEach((c, i) => {
      if (!c.name.trim()) missing[i] = 'Enter a name for this contact, or remove it.';
    });
    if (Object.keys(missing).length > 0) {
      setExtraErrors(missing);
      setSection('contacts');
      setFormError('Please fix the fields marked in red.');
      return;
    }

    // The company was already created and only some contacts failed: retry just those, never create it twice
    if (!isEditMode && savedCompanyId) {
      if (await saveExtraContacts(savedCompanyId)) navigate(`/sales/companies/${savedCompanyId}`);
      else setFormError('Some contacts still could not be added. Fix them, or open the company.');
      return;
    }

    try {
      const companyPayload = {
        name: values.name.trim(),
        year_established: values.year_established ?? undefined,
        estimated_turnover: values.estimated_turnover ?? undefined,
        estimated_employees: values.estimated_employees ?? undefined,
        no_of_branches: values.no_of_branches ?? undefined,
        no_of_plants: values.no_of_plants ?? undefined,
        full_address: values.full_address || undefined,
        city: values.city || undefined,
        state: values.state || undefined,
        pin: values.pin || undefined,
        country: values.country || 'India',
        google_maps_url: values.google_maps_url || undefined,
        is_gidc: values.is_gidc,
        gidc_name: values.is_gidc ? values.gidc_name || undefined : undefined,
        gidc_area_phase: values.is_gidc ? values.gidc_area_phase || undefined : undefined,
        industry: values.industry || undefined,
        nature_of_business: values.nature_of_business || undefined,
        products_services: values.products_services || undefined,
        existing_major_clients: values.existing_major_clients || undefined,
        website: values.website || undefined,
        website_quality: values.website_quality || undefined,
        developed_by: values.developed_by || undefined,
        linkedin_url: values.linkedin_url || undefined,
        instagram_url: values.instagram_url || undefined,
        facebook_url: values.facebook_url || undefined,
        youtube_url: values.youtube_url || undefined,
        google_business_profile_url: values.google_business_profile_url || undefined,
      };

      const contactPayload =
        values.contact_name?.trim() || values.contact_mobile?.trim() || values.contact_email?.trim()
          ? {
              name: values.contact_name.trim() || undefined,
              designation: values.contact_designation.trim() || undefined,
              mobile: values.contact_mobile.trim() || undefined,
              email: values.contact_email.trim() || undefined,
            }
          : undefined;

      if (isEditMode && companyId) {
        await updateMutation.mutateAsync({
          id: companyId,
          data: {
            company: companyPayload,
            contact: contactPayload,
            confirm_duplicate: confirmDuplicate,
          },
        });
        const extrasSaved = await saveExtraContacts(companyId);
        queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });
        queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/companies/${companyId}`] });
        if (!extrasSaved) {
          setSavedCompanyId(companyId);
          setFormError('The company is saved, but some contacts could not be added. Fix them below, or open the company.');
          return;
        }
        navigate(`/sales/companies/${companyId}`);
      } else {
        const response = await createMutation.mutateAsync({
          data: {
            company: companyPayload,
            contact: contactPayload,
            confirm_duplicate: confirmDuplicate,
          },
        });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });
        const createdId = (response as unknown as { company_id?: number })?.company_id;
        if (createdId && extraContacts.length > 0) {
          const extrasSaved = await saveExtraContacts(createdId);
          if (!extrasSaved) {
            setSavedCompanyId(createdId);
            setFormError('The company is saved, but some contacts could not be added. Fix them below, or open the company.');
            return;
          }
        }
        if (createdId) {
          navigate(`/sales/companies/${createdId}`);
        } else {
          navigate('/sales/companies');
        }
      }
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      if (parsed.code === 'DUPLICATE_COMPANY' && parsed.matches && parsed.matches.length > 0) {
        setDuplicateMatches(parsed.matches);
        setFormError(parsed.message || 'Potential duplicate company detected.');
      } else if (parsed.errors && parsed.errors.length > 0) {
        const formField = (field: string): keyof CompanyFormValues => {
          const key = field.startsWith('contact.') ? `contact_${field.slice('contact.'.length)}` : field;
          return (key === 'contact_designation' ? 'contact_designation' : key) as keyof CompanyFormValues;
        };
        const seen = new Set<string>();
        const lines: string[] = [];
        parsed.errors.forEach((errItem) => {
          if (!errItem.field) return;
          const key = formField(errItem.field);
          if (seen.size === 0) setSection(sectionOf(key));
          setError(key, { message: errItem.message }, { shouldFocus: seen.size === 0 });
          seen.add(key);
          lines.push(`${FIELD_LABELS[key] ?? errItem.field}: ${errItem.message}`);
        });
        setFormError(lines.length > 0 ? lines.join('\n') : parsed.message || 'Please fix the fields marked in red.');
      } else {
        setFormError(parsed.message || 'Failed to save company record. Please try again.');
      }
    }
  };

  const handleConfirmAnyway = () => {
    setConfirmDuplicate(true);
    handleSubmit(onSubmit)();
  };

  if (isEditMode && isLoadingCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-gray-500">Loading company details...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, (invalid) => {
        const first = Object.keys(invalid)[0];
        if (first) setSection(sectionOf(first));
        setFormError('Please fix the fields marked in red.');
      })} className="space-y-6 pb-24 max-w-6xl mx-auto" noValidate>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={isEditMode && companyId ? `/sales/companies/${companyId}` : '/sales/companies'}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isEditMode ? 'Edit Company' : 'Add New Company'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditMode
                ? 'Update company profile, contact details, address, and online presence.'
                : 'Create a new prospect company for Sales. Only the company name is required.'}
            </p>
          </div>
        </div>

        {/* Desktop Save Controls */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            to={isEditMode && companyId ? `/sales/companies/${companyId}` : '/sales/companies'}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isEditMode ? 'Update Company' : 'Save Company'}</span>
          </button>
        </div>
      </div>

      {/* Global Form Error */}
      {formError && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/70 text-sm text-red-800 flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{savedCompanyId ? 'Company saved, contacts need attention' : 'Unable to save company'}</p>
            <p className="mt-0.5 whitespace-pre-line text-xs text-red-700">{formError}</p>
            {savedCompanyId && (
              <Link to={`/sales/companies/${savedCompanyId}`} className="mt-2 inline-block text-xs font-semibold text-red-800 underline">
                Open the company
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Duplicate Warning Card */}
      {duplicateMatches.length > 0 && (
        <DuplicateWarningCard
          matches={duplicateMatches}
          onConfirmAnyway={handleConfirmAnyway}
          isSubmitting={isSubmitting}
        />
      )}

      <div className="space-y-6">
        <nav aria-label="Form sections" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
          {SECTIONS.map((sec, i) => {
            const on = section === sec.id;
            const bad = Object.keys(errors).some((k) => sectionOf(k) === sec.id) || (sec.id === 'contacts' && Object.keys(extraErrors).length > 0);
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSection(sec.id)}
                aria-current={on ? 'step' : undefined}
                className={`relative -mb-px flex shrink-0 items-center gap-2.5 whitespace-nowrap border-b-[3px] px-4 pb-3.5 pt-2.5 text-[15px] font-semibold transition-colors sm:px-5 ${
                  on ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${on ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                <span className="hidden items-center gap-2 sm:flex">
                  <sec.Icon className="h-[18px] w-[18px]" />
                </span>
                {sec.label}
                {bad && <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-label="Has errors" />}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-6">
      {/* Section 1: Basic Information */}
      <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-8 space-y-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2+p]:text-sm [&_h2+p]:text-slate-500 [&_label]:mb-1.5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-slate-700 [&_input]:min-h-[48px] [&_select]:min-h-[48px] [&_input]:rounded-xl [&_select]:rounded-xl [&_textarea]:rounded-xl [&_input]:px-4 [&_select]:px-4 [&_textarea]:px-4 [&_textarea]:py-3 [&_input]:text-[15px] [&_select]:text-[15px] [&_textarea]:text-[15px] [&_.grid]:gap-5 lg:min-h-[26rem] ${section === 'basic' ? '' : 'hidden'}`}>
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>
            <p className="text-xs text-gray-500">Company name and size.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Company Name (Required) */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              aria-invalid={errors.name ? true : undefined}
              placeholder="e.g. Acme Industrial Technologies Pvt Ltd"
              className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 transition-all min-h-[44px] ${
                errors.name
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                  : 'border-gray-300 focus:ring-primary/20 focus:border-primary'
              }`}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          {/* Year Established */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Year Established</label>
            <input
              type="number"
              {...register('year_established')}
              aria-invalid={errors.year_established ? true : undefined}
              placeholder="e.g. 2012"
              min={1800}
              max={new Date().getFullYear()}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.year_established && <p className="mt-1 text-xs font-medium text-red-600">{errors.year_established.message}</p>}
          </div>

          {/* Estimated Annual Turnover (INR) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Annual Turnover (INR)</label>
            <input
              type="number"
              {...register('estimated_turnover')}
              aria-invalid={errors.estimated_turnover ? true : undefined}
              placeholder="e.g. 25000000"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.estimated_turnover && <p className="mt-1 text-xs font-medium text-red-600">{errors.estimated_turnover.message}</p>}
            <p className="text-2xs text-gray-400 mt-0.5">In Indian Rupees (e.g. 2.5 Cr = 25000000)</p>
          </div>

          {/* Number of Employees */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Estimated Employees</label>
            <input
              type="number"
              {...register('estimated_employees')}
              aria-invalid={errors.estimated_employees ? true : undefined}
              placeholder="e.g. 150"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.estimated_employees && <p className="mt-1 text-xs font-medium text-red-600">{errors.estimated_employees.message}</p>}
          </div>

          {/* Branches */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Number of Branches</label>
            <input
              type="number"
              {...register('no_of_branches')}
              aria-invalid={errors.no_of_branches ? true : undefined}
              placeholder="e.g. 3"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.no_of_branches && <p className="mt-1 text-xs font-medium text-red-600">{errors.no_of_branches.message}</p>}
          </div>

          {/* Plants */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Number of Plants / Factories</label>
            <input
              type="number"
              {...register('no_of_plants')}
              aria-invalid={errors.no_of_plants ? true : undefined}
              placeholder="e.g. 2"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.no_of_plants && <p className="mt-1 text-xs font-medium text-red-600">{errors.no_of_plants.message}</p>}
          </div>
        </div>
      </div>

      {/* Section 2: Address & Location */}
      <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-8 space-y-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2+p]:text-sm [&_h2+p]:text-slate-500 [&_label]:mb-1.5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-slate-700 [&_input]:min-h-[48px] [&_select]:min-h-[48px] [&_input]:rounded-xl [&_select]:rounded-xl [&_textarea]:rounded-xl [&_input]:px-4 [&_select]:px-4 [&_textarea]:px-4 [&_textarea]:py-3 [&_input]:text-[15px] [&_select]:text-[15px] [&_textarea]:text-[15px] [&_.grid]:gap-5 lg:min-h-[26rem] ${section === 'location' ? '' : 'hidden'}`}>
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Address & Location</h2>
            <p className="text-xs text-gray-500">Registered office or manufacturing premises.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Full Address */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address</label>
            <textarea
              {...register('full_address')}
              aria-invalid={errors.full_address ? true : undefined}
              rows={2}
              placeholder="Plot No, Street, Landmark, Area..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {errors.full_address && <p className="mt-1 text-xs font-medium text-red-600">{errors.full_address.message}</p>}
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
            <input
              type="text"
              {...register('city')}
              aria-invalid={errors.city ? true : undefined}
              placeholder="e.g. Ahmedabad, Vadodara, Surat"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.city && <p className="mt-1 text-xs font-medium text-red-600">{errors.city.message}</p>}
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
            <input
              type="text"
              {...register('state')}
              aria-invalid={errors.state ? true : undefined}
              placeholder="e.g. Gujarat"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.state && <p className="mt-1 text-xs font-medium text-red-600">{errors.state.message}</p>}
          </div>

          {/* Pin */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Pincode</label>
            <input
              type="text"
              {...register('pin')}
              aria-invalid={errors.pin ? true : undefined}
              placeholder="e.g. 382445"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.pin && <p className="mt-1 text-xs font-medium text-red-600">{errors.pin.message}</p>}
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Country</label>
            <input
              type="text"
              {...register('country')}
              aria-invalid={errors.country ? true : undefined}
              defaultValue="India"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.country && <p className="mt-1 text-xs font-medium text-red-600">{errors.country.message}</p>}
          </div>

          {/* Google Maps URL */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Google Maps Link</label>
            <input
              type="url"
              {...register('google_maps_url')}
              aria-invalid={errors.google_maps_url ? true : undefined}
              placeholder="https://maps.google.com/?q=..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.google_maps_url && <p className="mt-1 text-xs font-medium text-red-600">{errors.google_maps_url.message}</p>}
          </div>
        </div>

        {/* GIDC Toggle Section */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200 bg-gray-50/50">
            <div>
              <p className="text-sm font-semibold text-gray-900">Located in a GIDC Industrial Zone?</p>
              <p className="text-xs text-gray-500">
                Gujarat Industrial Development Corporation estate details.
              </p>
            </div>
            <Controller
              name="is_gidc"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-primary/20 ${
                    field.value ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      field.value ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              )}
            />
          </div>

          {watchIsGidc && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  GIDC Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('gidc_name')}
              aria-invalid={errors.gidc_name ? true : undefined}
                  placeholder="e.g. Vatva, Sanand, Naroda, Makarpura"
                  list="gidc-names-list"
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 transition-all min-h-[44px] ${
                    errors.gidc_name ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-primary/20'
                  }`}
                />
                <datalist id="gidc-names-list">
                  {masters.gidc_names?.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                {errors.gidc_name && (
                  <p className="text-xs text-red-600 mt-1">{errors.gidc_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  GIDC Area / Phase <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('gidc_area_phase')}
              aria-invalid={errors.gidc_area_phase ? true : undefined}
                  placeholder="e.g. Phase IV, Zone 2, Road No 15"
                  list="gidc-areas-list"
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 transition-all min-h-[44px] ${
                    errors.gidc_area_phase ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-primary/20'
                  }`}
                />
                <datalist id="gidc-areas-list">
                  {masters.gidc_areas?.map((area) => (
                    <option key={area} value={area} />
                  ))}
                </datalist>
                {errors.gidc_area_phase && (
                  <p className="text-xs text-red-600 mt-1">{errors.gidc_area_phase.message}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Primary Contact Person */}
      <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-8 space-y-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2+p]:text-sm [&_h2+p]:text-slate-500 [&_label]:mb-1.5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-slate-700 [&_input]:min-h-[48px] [&_select]:min-h-[48px] [&_input]:rounded-xl [&_select]:rounded-xl [&_textarea]:rounded-xl [&_input]:px-4 [&_select]:px-4 [&_textarea]:px-4 [&_textarea]:py-3 [&_input]:text-[15px] [&_select]:text-[15px] [&_textarea]:text-[15px] [&_.grid]:gap-5 lg:min-h-[26rem] ${section === 'contacts' ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Contacts</h2>
              <p className="text-xs text-gray-500">The main person first, then anyone else you deal with.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">Primary contact</span>
          <span className="text-xs text-slate-400">Sales correspondence goes here</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Contact Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Name</label>
            <input
              type="text"
              {...register('contact_name')}
              aria-invalid={errors.contact_name ? true : undefined}
              placeholder="e.g. Rajesh Shah"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.contact_name && <p className="mt-1 text-xs font-medium text-red-600">{errors.contact_name.message}</p>}
          </div>

          {/* Designation */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Designation / Role</label>
            <input
              type="text"
              {...register('contact_designation')}
              aria-invalid={errors.contact_designation ? true : undefined}
              placeholder="e.g. Managing Director, Purchase Manager"
              list="contact-designations-list"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.contact_designation && <p className="mt-1 text-xs font-medium text-red-600">{errors.contact_designation.message}</p>}
            <datalist id="contact-designations-list">
              {masters.designation?.map((des) => (
                <option key={des} value={des} />
              ))}
            </datalist>
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number</label>
            <input
              type="tel"
              {...register('contact_mobile')}
              aria-invalid={errors.contact_mobile ? true : undefined}
              placeholder="e.g. 9825041236"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.contact_mobile && <p className="mt-1 text-xs font-medium text-red-600">{errors.contact_mobile.message}</p>}
            <p className="text-2xs text-gray-400 mt-0.5">10-digit Indian mobile number</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              {...register('contact_email')}
              aria-invalid={errors.contact_email ? true : undefined}
              placeholder="e.g. rajesh@acmeind.com"
              className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 transition-all min-h-[44px] ${
                errors.contact_email ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-primary/20'
              }`}
            />
            {errors.contact_email && (
              <p className="text-xs text-red-600 mt-1">{errors.contact_email.message}</p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <ExtraContactsEditor
            value={extraContacts}
            onChange={(next) => {
              setExtraContacts(next);
              setExtraErrors({});
            }}
            designations={masters.designation ?? []}
            existing={otherContacts}
            errors={extraErrors}
          />
        </div>
      </div>

      {/* Section 4: Business Profile */}
      <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-8 space-y-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2+p]:text-sm [&_h2+p]:text-slate-500 [&_label]:mb-1.5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-slate-700 [&_input]:min-h-[48px] [&_select]:min-h-[48px] [&_input]:rounded-xl [&_select]:rounded-xl [&_textarea]:rounded-xl [&_input]:px-4 [&_select]:px-4 [&_textarea]:px-4 [&_textarea]:py-3 [&_input]:text-[15px] [&_select]:text-[15px] [&_textarea]:text-[15px] [&_.grid]:gap-5 lg:min-h-[26rem] ${section === 'business' ? '' : 'hidden'}`}>
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
          <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Business Profile</h2>
            <p className="text-xs text-gray-500">Industry domain, business nature, and offerings.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Industry */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Industry Sector</label>
            <select
              {...register('industry')}
              aria-invalid={errors.industry ? true : undefined}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            >
              <option value="">Select industry domain...</option>
              {masters.industries?.map((ind) => (
                <option key={ind.id} value={ind.name}>
                  {ind.name}
                </option>
              ))}
            </select>
            {errors.industry && <p className="mt-1 text-xs font-medium text-red-600">{errors.industry.message}</p>}
          </div>

          {/* Nature of Business */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nature of Business</label>
            <select
              {...register('nature_of_business')}
              aria-invalid={errors.nature_of_business ? true : undefined}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            >
              <option value="">Select nature of business...</option>
              {masters.nature_of_business?.map((nat) => (
                <option key={nat} value={nat}>
                  {nat}
                </option>
              ))}
            </select>
            {errors.nature_of_business && <p className="mt-1 text-xs font-medium text-red-600">{errors.nature_of_business.message}</p>}
          </div>

          {/* Products / Services */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Products & Services Offered</label>
            <textarea
              {...register('products_services')}
              aria-invalid={errors.products_services ? true : undefined}
              rows={2}
              placeholder="e.g. CNC precision machined components, automotive shafts, engineering design..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {errors.products_services && <p className="mt-1 text-xs font-medium text-red-600">{errors.products_services.message}</p>}
          </div>

          {/* Existing Major Clients */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Segment / Major Clients</label>
            <input
              type="text"
              {...register('existing_major_clients')}
              aria-invalid={errors.existing_major_clients ? true : undefined}
              placeholder="e.g. Tata Motors, L&T, Siemens, Export to Germany"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.existing_major_clients && <p className="mt-1 text-xs font-medium text-red-600">{errors.existing_major_clients.message}</p>}
          </div>
        </div>
      </div>

      {/* Section 5: Online & Social Presence */}
      <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-8 space-y-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2+p]:text-sm [&_h2+p]:text-slate-500 [&_label]:mb-1.5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-slate-700 [&_input]:min-h-[48px] [&_select]:min-h-[48px] [&_input]:rounded-xl [&_select]:rounded-xl [&_textarea]:rounded-xl [&_input]:px-4 [&_select]:px-4 [&_textarea]:px-4 [&_textarea]:py-3 [&_input]:text-[15px] [&_select]:text-[15px] [&_textarea]:text-[15px] [&_.grid]:gap-5 lg:min-h-[26rem] ${section === 'online' ? '' : 'hidden'}`}>
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
          <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Online & Digital Presence</h2>
            <p className="text-xs text-gray-500">Website, its quality, and social media links.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Website URL */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Website URL</label>
            <input
              type="url"
              {...register('website')}
              aria-invalid={errors.website ? true : undefined}
              placeholder="https://www.example.com"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.website && <p className="mt-1 text-xs font-medium text-red-600">{errors.website.message}</p>}
          </div>

          {/* Website Quality */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Website Quality Assessment</label>
            <select
              {...register('website_quality')}
              aria-invalid={errors.website_quality ? true : undefined}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            >
              <option value="">Select rating...</option>
              {masters.website_quality?.map((wq) => (
                <option key={wq} value={wq}>
                  {wq}
                </option>
              ))}
            </select>
            {errors.website_quality && <p className="mt-1 text-xs font-medium text-red-600">{errors.website_quality.message}</p>}
          </div>

          {/* Developed By */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Website Developed By</label>
            <input
              type="text"
              {...register('developed_by')}
              aria-invalid={errors.developed_by ? true : undefined}
              placeholder="Agency or freelancer name"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.developed_by && <p className="mt-1 text-xs font-medium text-red-600">{errors.developed_by.message}</p>}
          </div>

          {/* LinkedIn URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">LinkedIn Company URL</label>
            <input
              type="url"
              {...register('linkedin_url')}
              aria-invalid={errors.linkedin_url ? true : undefined}
              placeholder="https://linkedin.com/company/..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.linkedin_url && <p className="mt-1 text-xs font-medium text-red-600">{errors.linkedin_url.message}</p>}
          </div>

          {/* Google Business Profile URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Google Business Profile URL</label>
            <input
              type="url"
              {...register('google_business_profile_url')}
              aria-invalid={errors.google_business_profile_url ? true : undefined}
              placeholder="https://g.page/..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.google_business_profile_url && <p className="mt-1 text-xs font-medium text-red-600">{errors.google_business_profile_url.message}</p>}
          </div>

          {/* Instagram URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Instagram Profile</label>
            <input
              type="url"
              {...register('instagram_url')}
              aria-invalid={errors.instagram_url ? true : undefined}
              placeholder="https://instagram.com/..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.instagram_url && <p className="mt-1 text-xs font-medium text-red-600">{errors.instagram_url.message}</p>}
          </div>

          {/* Facebook URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Facebook Page</label>
            <input
              type="url"
              {...register('facebook_url')}
              aria-invalid={errors.facebook_url ? true : undefined}
              placeholder="https://facebook.com/..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.facebook_url && <p className="mt-1 text-xs font-medium text-red-600">{errors.facebook_url.message}</p>}
          </div>

          {/* YouTube URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">YouTube Channel</label>
            <input
              type="url"
              {...register('youtube_url')}
              aria-invalid={errors.youtube_url ? true : undefined}
              placeholder="https://youtube.com/@..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[44px]"
            />
            {errors.youtube_url && <p className="mt-1 text-xs font-medium text-red-600">{errors.youtube_url.message}</p>}
          </div>
        </div>
      </div>

        </div>
      </div>

      {/* Sticky Bottom Bar for Mobile & Desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 sm:px-6 shadow-lg flex items-center justify-between">
        <Link
          to={isEditMode && companyId ? `/sales/companies/${companyId}` : '/sales/companies'}
          className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px] flex items-center"
        >
          Cancel
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {sectionIndex > 0 && (
            <button type="button" onClick={() => setSection(SECTIONS[sectionIndex - 1].id)} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:px-4">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          {sectionIndex < SECTIONS.length - 1 && (
            <button type="button" onClick={() => setSection(SECTIONS[sectionIndex + 1].id)} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 text-sm font-semibold text-primary hover:bg-primary/10 sm:px-4">
              Next<span className="hidden sm:inline">: {SECTIONS[sectionIndex + 1].label}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all disabled:opacity-50 min-h-[44px]"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isEditMode ? 'Update Company' : 'Save Company'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
