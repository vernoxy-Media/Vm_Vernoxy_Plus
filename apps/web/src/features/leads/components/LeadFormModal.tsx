import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  Building2,
  MapPin,
  User,
  Globe,
  TrendingUp,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Lead, LeadMasters } from '../api/leads.api';
import { leadFormSchema, LeadFormData } from '../schemas/lead-form.schema';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => Promise<void>;
  initialData?: Lead | null;
  defaultStage?: string;
  masters?: LeadMasters;
  currentUserId?: number;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultStage = 'New',
  masters,
  currentUserId = 1,
}) => {
  const [activeTab, setActiveTab] = useState<'company' | 'location' | 'contact' | 'digital' | 'sales'>('company');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      company_name: '',
      no_of_branches: 0,
      no_of_plants: 0,
      products_services: '',
      nature_of_business: '',
      industry: '',
      industry_id: undefined,
      estimated_employees: undefined,
      estimated_turnover: undefined,
      year_established: undefined,
      existing_major_clients: '',

      full_address: '',
      city: '',
      state: 'Gujarat',
      country: 'India',
      pin: '',
      google_maps_url: '',
      is_gidc: false,
      gidc_name: '',
      gidc_area_phase: '',

      contact_person: '',
      designation: '',
      mobile: '',
      email: '',

      website: '',
      website_quality: 'Good',
      developed_by: '',
      linkedin_url: '',
      instagram_url: '',
      facebook_url: '',
      youtube_url: '',
      google_business_profile_url: '',
      brochure_url: '',

      lead_source: 'Cold calling',
      lead_by_id: currentUserId,
      service_fit: '',
      status: defaultStage,
    },
  });

  const isGidc = watch('is_gidc');

  useEffect(() => {
    if (initialData) {
      reset({
        company_name: initialData.company_name || '',
        no_of_branches: initialData.no_of_branches ?? 0,
        no_of_plants: initialData.no_of_plants ?? 0,
        products_services: initialData.products_services || '',
        nature_of_business: initialData.nature_of_business || '',
        industry: initialData.industry || '',
        industry_id: initialData.industry_id || undefined,
        estimated_employees: initialData.estimated_employees || undefined,
        estimated_turnover: initialData.estimated_turnover || undefined,
        year_established: initialData.year_established || undefined,
        existing_major_clients: initialData.existing_major_clients || '',

        full_address: initialData.full_address || '',
        city: initialData.city || '',
        state: initialData.state || 'Gujarat',
        country: initialData.country || 'India',
        pin: initialData.pin || '',
        google_maps_url: initialData.google_maps_url || '',
        is_gidc: Boolean(initialData.is_gidc),
        gidc_name: initialData.gidc_name || '',
        gidc_area_phase: initialData.gidc_area_phase || '',

        contact_person: initialData.contact_person || '',
        designation: initialData.designation || '',
        mobile: initialData.mobile || '',
        email: initialData.email || '',

        website: initialData.website || '',
        website_quality: initialData.website_quality || 'Good',
        developed_by: initialData.developed_by || '',
        linkedin_url: initialData.linkedin_url || '',
        instagram_url: initialData.instagram_url || '',
        facebook_url: initialData.facebook_url || '',
        youtube_url: initialData.youtube_url || '',
        google_business_profile_url: initialData.google_business_profile_url || '',
        brochure_url: initialData.brochure_url || '',

        lead_source: initialData.lead_source || 'Cold calling',
        lead_by_id: initialData.lead_by_id || currentUserId,
        service_fit: initialData.service_fit || '',
        status: initialData.lead_stage || defaultStage,
      });
    } else {
      reset({
        company_name: '',
        no_of_branches: 0,
        no_of_plants: 0,
        products_services: '',
        nature_of_business: '',
        industry: '',
        industry_id: undefined,
        estimated_employees: undefined,
        estimated_turnover: undefined,
        year_established: undefined,
        existing_major_clients: '',

        full_address: '',
        city: '',
        state: 'Gujarat',
        country: 'India',
        pin: '',
        google_maps_url: '',
        is_gidc: false,
        gidc_name: '',
        gidc_area_phase: '',

        contact_person: '',
        designation: '',
        mobile: '',
        email: '',

        website: '',
        website_quality: 'Good',
        developed_by: '',
        linkedin_url: '',
        instagram_url: '',
        facebook_url: '',
        youtube_url: '',
        google_business_profile_url: '',
        brochure_url: '',

        lead_source: 'Cold calling',
        lead_by_id: currentUserId,
        service_fit: masters?.service_fits[0]?.label || 'Web Development',
        status: defaultStage,
      });
    }
    setActiveTab('company');
  }, [initialData, defaultStage, currentUserId, masters, reset, isOpen]);

  if (!isOpen) return null;

  const onFormSubmit = async (values: LeadFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(values);
      onClose();
    } catch (err) {
      console.error('Failed to save lead:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'location', label: 'Location & GIDC', icon: MapPin },
    { id: 'contact', label: 'Contact Person', icon: User },
    { id: 'digital', label: 'Digital Presence', icon: Globe },
    { id: 'sales', label: 'Sales & Pipeline', icon: TrendingUp },
  ];

  const currentDateFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialData ? `Edit Lead: ${initialData.company_name}` : 'Add New Sales Lead'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter complete prospecting and qualification parameters matching standard CRM
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: Company Profile */}
          {activeTab === 'company' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('company_name')}
                    placeholder="e.g. Sterling Precision Components Pvt Ltd"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.company_name && (
                    <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.company_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nature of Business
                  </label>
                  <select
                    {...register('nature_of_business')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Business Nature</option>
                    {masters?.nature_of_business.map((n) => (
                      <option key={n.code} value={n.label}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Industry
                  </label>
                  <select
                    {...register('industry')}
                    onChange={(e) => {
                      setValue('industry', e.target.value);
                      const matched = masters?.industries.find((i) => i.name === e.target.value);
                      if (matched) setValue('industry_id', matched.industry_id);
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Industry</option>
                    {masters?.industries.map((ind) => (
                      <option key={ind.industry_id} value={ind.name}>
                        {ind.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Products / Services Offered
                  </label>
                  <input
                    type="text"
                    {...register('products_services')}
                    placeholder="e.g. CNC Machine tools, Industrial pumps, Castings"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. of Branches
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('no_of_branches')}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. of Plants
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('no_of_plants')}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Year Established (YYYY)
                  </label>
                  <input
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    {...register('year_established')}
                    placeholder="e.g. 2010"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.year_established && (
                    <p className="text-xs text-rose-500 mt-1">{errors.year_established.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimated Employees
                  </label>
                  <input
                    type="number"
                    min="1"
                    {...register('estimated_employees')}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimated Annual Turnover (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('estimated_turnover')}
                    placeholder="e.g. 25000000 (2.5 Cr)"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Existing Major Clients
                  </label>
                  <textarea
                    rows={2}
                    {...register('existing_major_clients')}
                    placeholder="e.g. Tata Motors, Adani Power, Reliance, L&T"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Location & GIDC */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Address
                </label>
                <textarea
                  rows={2}
                  {...register('full_address')}
                  placeholder="Plot/Survey number, Street, Landmark"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    {...register('city')}
                    placeholder="e.g. Ahmedabad"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    {...register('state')}
                    placeholder="e.g. Gujarat"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    {...register('country')}
                    placeholder="India"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    {...register('pin')}
                    placeholder="e.g. 382445"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  {errors.pin && (
                    <p className="text-xs text-rose-500 mt-1">{errors.pin.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Maps URL / Location Link
                </label>
                <input
                  type="url"
                  {...register('google_maps_url')}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* GIDC SECTION */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_gidc"
                    {...register('is_gidc')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <label htmlFor="is_gidc" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Is located inside GIDC / Industrial Estate?
                  </label>
                </div>

                {isGidc && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        GIDC Name <span className="text-rose-500">*</span>
                      </label>
                      <select
                        {...register('gidc_name')}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select GIDC Name</option>
                        {masters?.gidc_names.map((g) => (
                          <option key={g.code} value={g.label}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                      {errors.gidc_name && (
                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.gidc_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        GIDC Area / Phase
                      </label>
                      <select
                        {...register('gidc_area_phase')}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select Area / Phase</option>
                        {masters?.gidc_phases.map((p) => (
                          <option key={p.code} value={p.label}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Contact Person */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    {...register('contact_person')}
                    placeholder="e.g. Kiritbhai Patel"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation
                  </label>
                  <select
                    {...register('designation')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Designation</option>
                    {masters?.designations.map((d) => (
                      <option key={d.code} value={d.label}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile (10 Digits)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    {...register('mobile')}
                    placeholder="e.g. 9825012345"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  {errors.mobile && (
                    <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.mobile.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="e.g. info@company.com"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.email && (
                    <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Digital Presence & Media */}
          {activeTab === 'digital' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                  <input
                    type="url"
                    {...register('website')}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website Quality</label>
                  <select
                    {...register('website_quality')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Good">Good</option>
                    <option value="Average">Average</option>
                    <option value="Poor">Poor</option>
                    <option value="No Website">No Website</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Developed By</label>
                  <input
                    type="text"
                    {...register('developed_by')}
                    placeholder="Agency / Freelancer / WordPress"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brochure File URL</label>
                  <input
                    type="text"
                    {...register('brochure_url')}
                    placeholder="Link to PDF brochure / storage URL"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    {...register('linkedin_url')}
                    placeholder="https://linkedin.com/company/..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Instagram URL</label>
                  <input
                    type="url"
                    {...register('instagram_url')}
                    placeholder="https://instagram.com/..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facebook URL</label>
                  <input
                    type="url"
                    {...register('facebook_url')}
                    placeholder="https://facebook.com/..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">YouTube URL</label>
                  <input
                    type="url"
                    {...register('youtube_url')}
                    placeholder="https://youtube.com/@..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Google Business Profile URL</label>
                  <input
                    type="url"
                    {...register('google_business_profile_url')}
                    placeholder="https://business.google.com/..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Sales & Status */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lead Source <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register('lead_source')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Cold calling">Cold calling (Default)</option>
                    {masters?.lead_sources.map((s) => (
                      <option key={s.code} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lead By (Active Sales User & Admin) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register('lead_by_id')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {masters?.sales_users.map((u) => (
                      <option key={u.emp_id} value={u.emp_id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  {errors.lead_by_id && (
                    <p className="text-xs text-rose-500 mt-1">{errors.lead_by_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Fit <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register('service_fit')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Service Fit</option>
                    {masters?.service_fits.map((sf) => (
                      <option key={sf.code} value={sf.label}>
                        {sf.label}
                      </option>
                    ))}
                  </select>
                  {errors.service_fit && (
                    <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.service_fit.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status / Pipeline Stage <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="New">New (Default)</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                <div className="md:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                  <span>
                    <strong>Date Added:</strong> Auto timestamped upon creation
                  </span>
                  <span className="font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-700">
                    {initialData ? initialData.created_at : `${currentDateFormatted()} (Auto)`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex gap-2">
              {activeTab !== 'company' && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
                    if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1].id as any);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Previous
                </button>
              )}
              {activeTab !== 'sales' && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
                    if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1].id as any);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                >
                  Next Tab
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? 'Saving Lead...' : initialData ? 'Update Lead' : 'Create Sales Lead'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
