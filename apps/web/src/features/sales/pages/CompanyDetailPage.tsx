import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Building2,
  MapPin,
  Calendar,
  
  
  
  Globe,
  Share2,
  Edit2,
  Trash2,
  UserPlus,
  Briefcase,
  AlertCircle,
  ExternalLink,
  
  
  Layers,
  History,
} from 'lucide-react';
import {
  useSalesCompanyControllerGet,
  useSalesCompanyControllerRemove,
  useSalesActivityControllerCompanyHistory,
} from '@vernoxy-pulse/api-client';

import { ContactsManager } from '../components/companies/ContactsManager';
import { CompanyCommunications } from '../components/companies/CompanyCommunications';
import { ConvertToLeadModal } from '../components/companies/ConvertToLeadModal';
import { ScheduleFollowUpModal } from '../components/follow-ups/ScheduleFollowUpModal';
import { WebsiteQualityBadge } from '../components/common/WebsiteQualityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { DetailSkeleton } from '../components/common/SkeletonLoader';

import {
  formatDateIST,
  
  timeAgo,
} from '../utils/date';
import {
  getInitials,
  getAvatarColor,
  formatCurrencyINR,
} from '../utils/formatters';
import type { BlockerItem } from '../components/common/ConfirmDialog';
import { parseApiError } from '../utils/error';
import { unwrapList } from '../utils/response';
import type {
  SalesCompanyDetailResponse,
  ActivityItem,
} from '../types/sales.types';

export const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const companyId = id ? Number(id) : 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modals
  const [convertToLeadOpen, setConvertToLeadOpen] = useState(false);
  const [logCommunicationOpen, setLogCommunicationOpen] = useState(false);
  const [scheduleFollowUpOpen, setScheduleFollowUpOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<BlockerItem[]>([]);

  // Fetch company details
  const {
    data: rawData,
    isLoading,
    isError,
    error,
    
  } = useSalesCompanyControllerGet(companyId, {
    query: {
      enabled: Boolean(companyId),
    },
  });

  const company: SalesCompanyDetailResponse | null = (
    (rawData as unknown as { data?: SalesCompanyDetailResponse })?.data ??
    (rawData as unknown as SalesCompanyDetailResponse) ??
    null
  );

  // Fetch company history
  const { data: historyRaw } = useSalesActivityControllerCompanyHistory(
    companyId,
    undefined as never,
    {
      query: {
        enabled: Boolean(companyId),
      },
    },
  );

  const historyItems: ActivityItem[] = unwrapList<ActivityItem>(historyRaw);

  // Delete mutation
  const deleteMutation = useSalesCompanyControllerRemove({
    mutation: {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });
        navigate('/sales/companies');
      },
      onError: (err: unknown) => {
        const parsed = parseApiError(err);
        setDeleteError(parsed.message || 'Cannot delete company');
        setDeleteBlockers(parsed.blockers || []);
      },
    },
  });

  const handleDeleteConfirm = async () => {
    setDeleteError(null);
    setDeleteBlockers([]);
    await deleteMutation.mutateAsync({ id: companyId });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-lg mx-auto mt-12 shadow-2xs">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900">Failed to load company</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          {parseApiError(error).message || 'Company could not be found or you do not have permission to view it.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/sales/companies')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Companies</span>
        </button>
      </div>
    );
  }

  const f = company.fields || {};
  const avatarColor = getAvatarColor(f.name);
  const initials = getInitials(f.name);
  const hasOpenLead = company.lead.kind === 'lead' && company.lead.stage !== 'Lost' && company.lead.stage !== 'Converted';
  const isClient = company.lead.kind === 'client';

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Link
              to="/sales/companies"
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-2xs transition-colors shrink-0 mt-0.5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-xs shrink-0 ${avatarColor}`}
            >
              {initials}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {f.name}
                </h1>
                {company.company_code && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                    {company.company_code}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                {(f.city || f.state) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {[f.city, f.state].filter(Boolean).join(', ')}
                  </span>
                )}
                {company.created_at && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Added on {formatDateIST(company.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lead / Client Status Tag */}
          <div className="shrink-0 self-start sm:self-auto">
            {company.lead.kind === 'client' ? (
              <Link
                to={company.lead.client_id ? `/sales/clients/${company.lead.client_id}` : '#'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
              >
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                <span>Client: {company.lead.client_code ?? 'Active'}</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </Link>
            ) : company.lead.kind === 'lead' && company.lead.lead_id ? (
              <div className="flex items-center gap-2">
                <Link
                  to={`/sales/leads/${company.lead.lead_id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs"
                >
                  <span className="font-mono">{company.lead.lead_code ?? 'Lead'}</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </Link>
                {company.lead.stage && <StatusBadge status={company.lead.stage} size="sm" />}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                Not a Lead
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2.5 justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {/* Convert to Lead Button */}
            <button
              type="button"
              onClick={() => setConvertToLeadOpen(true)}
              disabled={!company.can_convert_to_lead || hasOpenLead}
              title={
                hasOpenLead
                  ? 'An open lead already exists for this company'
                  : isClient
                  ? 'This client is buying more: create a new lead'
                  : 'Convert this company into an active sales lead'
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-colors min-h-[40px]"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isClient ? 'New lead for more work' : 'Convert to Lead'}</span>
            </button>

            {/* Log Communication Button */}
            <button
              type="button"
              onClick={() => setLogCommunicationOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors min-h-[40px]"
            >
              <Phone className="w-4 h-4 text-gray-500" />
              <span>Log Communication</span>
            </button>

            {/* Schedule Follow-up Button */}
            <button
              type="button"
              onClick={() => setScheduleFollowUpOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors min-h-[40px]"
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Schedule Follow-up</span>
            </button>

            {/* Edit Button */}
            <Link
              to={`/sales/companies/${companyId}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors min-h-[40px]"
            >
              <Edit2 className="w-4 h-4 text-gray-500" />
              <span>Edit Company</span>
            </Link>
          </div>

          {/* Delete Button (Rights Aware / Blockers check) */}
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmOpen(true);
              setDeleteError(null);
              setDeleteBlockers([]);
            }}
            title="Delete company"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 shadow-2xs transition-colors min-h-[40px]"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Contacts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Overview & Firmographics */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-gray-900">Company Overview</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-gray-400 font-medium">Year Established</p>
                <p className="text-gray-800 font-semibold mt-0.5">
                  {f.year_established || '—'}
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-medium">Annual Turnover (INR)</p>
                <p className="text-gray-800 font-semibold mt-0.5">
                  {f.estimated_turnover ? formatCurrencyINR(f.estimated_turnover) : '—'}
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-medium">Estimated Employees</p>
                <p className="text-gray-800 font-semibold mt-0.5">
                  {f.estimated_employees ? `${f.estimated_employees} Employees` : '—'}
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-medium">Branches</p>
                <p className="text-gray-800 font-semibold mt-0.5">
                  {f.no_of_branches ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-medium">Plants / Factories</p>
                <p className="text-gray-800 font-semibold mt-0.5">
                  {f.no_of_plants ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-medium">Added By</p>
                <p className="text-gray-800 font-semibold mt-0.5">
                  {company.created_by?.name || 'System / Import'}
                </p>
              </div>
            </div>
          </div>

          {/* Section: Address & Industrial Zone */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-gray-900">Address & Premise</h3>
              </div>
              {f.google_maps_url && (
                <a
                  href={f.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  <span>Open in Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {f.full_address && (
                <div>
                  <p className="text-gray-400 font-medium">Full Street Address</p>
                  <p className="text-gray-800 mt-0.5 whitespace-pre-line leading-relaxed">
                    {f.full_address}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-gray-400 font-medium">City</p>
                  <p className="text-gray-800 font-semibold mt-0.5">{f.city || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">State</p>
                  <p className="text-gray-800 font-semibold mt-0.5">{f.state || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Pincode</p>
                  <p className="text-gray-800 font-semibold mt-0.5">{f.pin || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Country</p>
                  <p className="text-gray-800 font-semibold mt-0.5">{f.country || 'India'}</p>
                </div>
              </div>

              {/* GIDC Zone Information */}
              {f.is_gidc && (
                <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Layers className="w-3.5 h-3.5" />
                    <span>GIDC Industrial Estate</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-gray-500">Estate Name:</span>{' '}
                      <span className="font-semibold text-gray-800">{f.gidc_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Area / Phase:</span>{' '}
                      <span className="font-semibold text-gray-800">
                        {f.gidc_area_phase || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Business Profile & Offerings */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Briefcase className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900">Business Profile & Offerings</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-400 font-medium">Industry Domain</p>
                  <p className="text-gray-800 font-semibold mt-0.5">
                    {f.industry || company.industry?.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Nature of Business</p>
                  <p className="text-gray-800 font-semibold mt-0.5">
                    {f.nature_of_business || '—'}
                  </p>
                </div>
              </div>

              {f.products_services && (
                <div>
                  <p className="text-gray-400 font-medium">Products & Services</p>
                  <p className="text-gray-800 mt-0.5 leading-relaxed">{f.products_services}</p>
                </div>
              )}

              {f.existing_major_clients && (
                <div>
                  <p className="text-gray-400 font-medium">Major Clients / Segment</p>
                  <p className="text-gray-800 mt-0.5 leading-relaxed">{f.existing_major_clients}</p>
                </div>
              )}

              {company.brochure_url && (
                <div>
                  <p className="text-gray-400 font-medium">Company Brochure</p>
                  <a
                    href={company.brochure_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium mt-0.5"
                  >
                    <span>View Brochure Document</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Key Contacts Manager */}
          <ContactsManager
            companyId={companyId}
            contacts={company.contacts || []}
          />

          {/* Calls, emails and visits */}
          <CompanyCommunications
            companyId={companyId}
            contacts={company.contacts || []}
            logOpen={logCommunicationOpen}
            onLogOpenChange={setLogCommunicationOpen}
          />
        </div>

        {/* Right 1 Col: Digital Presence & Activity History */}
        <div className="space-y-6">
          {/* Section: Digital Presence & Audit */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Globe className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-semibold text-gray-900">Online Presence</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-gray-400 font-medium">Website</p>
                {f.website ? (
                  <a
                    href={f.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium mt-0.5 break-all"
                  >
                    <span>{f.website}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <p className="text-gray-500 mt-0.5">No website recorded</p>
                )}
              </div>

              <div>
                <p className="text-gray-400 font-medium">Website Quality Assessment</p>
                <div className="mt-1">
                  <WebsiteQualityBadge quality={f.website_quality} />
                </div>
              </div>

              {f.developed_by && (
                <div>
                  <p className="text-gray-400 font-medium">Developed By</p>
                  <p className="text-gray-800 font-medium mt-0.5">{f.developed_by}</p>
                </div>
              )}

              {/* Social Handles */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-gray-400 font-medium">Social & Web Links</p>
                <div className="space-y-1.5">
                  {f.linkedin_url && (
                    <a
                      href={f.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors truncate"
                    >
                      <Share2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">LinkedIn Company Page</span>
                    </a>
                  )}

                  {f.google_business_profile_url && (
                    <a
                      href={f.google_business_profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors truncate"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Google Business Profile</span>
                    </a>
                  )}

                  {f.instagram_url && (
                    <a
                      href={f.instagram_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors truncate"
                    >
                      <Globe className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                      <span className="truncate">Instagram</span>
                    </a>
                  )}

                  {f.facebook_url && (
                    <a
                      href={f.facebook_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors truncate"
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span className="truncate">Facebook</span>
                    </a>
                  )}

                  {f.youtube_url && (
                    <a
                      href={f.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors truncate"
                    >
                      <Globe className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span className="truncate">YouTube</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Activity & Change History */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <History className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Activity History</h3>
            </div>

            {historyItems.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No recent activity recorded.
              </p>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-gray-100">
                {historyItems.slice(0, 8).map((item) => (
                  <div key={item.log_id} className="relative flex items-start gap-3 pl-6 text-xs">
                    <span className="absolute left-1.5 top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-white" />
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 leading-tight">
                        {item.summary || item.event}
                      </p>
                      <p className="text-2xs text-gray-400">
                        {item.performed_by ? `${item.performed_by.name} • ` : ''}
                        {timeAgo(item.performed_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Convert to Lead Modal */}
      <ConvertToLeadModal
        isOpen={convertToLeadOpen}
        onClose={() => setConvertToLeadOpen(false)}
        companyId={companyId}
        companyName={f.name}
        onSuccess={(leadId) => {
          setConvertToLeadOpen(false);
          queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/companies/${companyId}`] });
          navigate(`/sales/leads/${leadId}`);
        }}
      />

      {/* Schedule Follow-up Modal */}
      <ScheduleFollowUpModal
        isOpen={scheduleFollowUpOpen}
        onClose={() => setScheduleFollowUpOpen(false)}
        companyId={companyId}
        companyName={f.name}
        contacts={company.contacts || []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/companies/${companyId}`] });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteConfirmOpen(false);
            setDeleteError(null);
            setDeleteBlockers([]);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={`Delete "${f.name}"?`}
        message={
          deleteError ?? 'Are you sure you want to delete this company? This action can only be completed if the company has no associated leads, client records, or communications.'
        }
        confirmLabel="Delete Company"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
        blockers={deleteBlockers}
      />
    </div>
  );
};
