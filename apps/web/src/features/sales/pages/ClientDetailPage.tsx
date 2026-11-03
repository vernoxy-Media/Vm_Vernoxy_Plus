import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSalesClientControllerGet } from '@vernoxy-pulse/api-client';
import { useSalesRights } from '../hooks/useSalesRights';
import { DetailSkeleton } from '../components/common/SkeletonLoader';
import { ReverseConversionModal } from '../components/leads/ReverseConversionModal';
import { formatDateIST, formatDateTimeIST } from '../utils/date';
import { getInitials, getAvatarColor } from '../utils/formatters';
import { parseApiError } from '../utils/error';
import type { ClientDetailResponse } from '../types/sales.types';
import {
  ArrowLeft,
  Building2,
  Trophy,
  Calendar,
  UserCheck,
  FileText,
  Phone,
  Mail,
  Users,
  MessageSquare,
  StickyNote,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Briefcase,
} from 'lucide-react';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useSalesRights();
  const clientId = Number(id);

  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);

  const {
    data: clientResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useSalesClientControllerGet(clientId, {
    query: {
      enabled: Boolean(clientId && !isNaN(clientId)),
      staleTime: 1000 * 60 * 5,
    },
  });

  const client = (
    (clientResponse as unknown as { data?: ClientDetailResponse })?.data ??
    (clientResponse as unknown as ClientDetailResponse)
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="h-8 w-48 bg-slate-200/80 rounded animate-pulse" />
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !client) {
    const parsed = parseApiError(error);
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mx-auto mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Client Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          {parsed.message || 'The requested client details could not be loaded.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/sales/companies')}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Go to Companies
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const companyInitials = getInitials(client.company.name);
  const companyAvatarColor = getAvatarColor(client.company.name);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Sales CRM &bull; Client Record
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {client.client_code}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Client
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            to={`/sales/companies/${client.company.company_id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Building2 className="h-4 w-4 text-slate-500" />
            <span>Company Profile</span>
          </Link>

          {/* Admin Reverse Conversion */}
          {isAdmin && client.converted_from_lead && (
            <button
              type="button"
              onClick={() => setIsReverseModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-800 hover:bg-amber-100/80 transition-colors shadow-2xs cursor-pointer"
              title="Reverse conversion back to Qualified lead (Admin only)"
            >
              <RotateCcw className="h-4 w-4 text-amber-600" />
              <span>Reverse Conversion</span>
            </button>
          )}
        </div>
      </div>

      {/* Linked Company Hero Card */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`h-14 w-14 shrink-0 rounded-2xl ${companyAvatarColor} text-white font-bold flex items-center justify-center text-lg shadow-sm`}
            >
              {companyInitials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/sales/companies/${client.company.company_id}`}
                  className="text-lg sm:text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors"
                >
                  {client.company.name}
                </Link>
                {client.company.company_code && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200/70">
                    {client.company.company_code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 mt-1 flex-wrap">
                {(client.company.city || client.company.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {[client.company.city, client.company.state].filter(Boolean).join(', ')}
                  </span>
                )}
                {client.company.industry && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                    {client.company.industry}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link
            to={`/sales/companies/${client.company.company_id}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            <span>View Company</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Won Details & Scope Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Won Details Card */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Trophy className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Deal Won Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Won On Date */}
            <div className="p-3.5 rounded-xl bg-slate-50/75 border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Won On Date</span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {formatDateIST(client.won_on)}
              </div>
            </div>

            {/* Account Owner */}
            <div className="p-3.5 rounded-xl bg-slate-50/75 border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>Account Owner</span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {client.owner?.name ?? '—'}
              </div>
              {client.owner?.emp_id && (
                <div className="text-xs text-slate-400 font-mono">
                  EMP-{client.owner.emp_id}
                </div>
              )}
            </div>

            {/* Converted From Lead */}
            <div className="p-3.5 rounded-xl bg-slate-50/75 border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>Origin Lead</span>
              </div>
              {client.converted_from_lead ? (
                <Link
                  to={`/sales/leads/${client.converted_from_lead.lead_id}`}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <span>{client.converted_from_lead.lead_code || `Lead #${client.converted_from_lead.lead_id}`}</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <div className="text-sm font-bold text-slate-900">—</div>
              )}
            </div>
          </div>

          {/* Win Note / Scope */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>Win Note & Scope of Agreement</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
              {client.win_note || 'No win notes recorded during conversion.'}
            </div>
          </div>
        </div>

        {/* Carried Forward Stats Card */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Carried Forward</h2>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            All historical interactions, key contacts, and intelligence accumulated across the sales lifecycle
            are preserved and linked to this client account.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-slate-700">Key Contacts</span>
              </div>
              <span className="text-base font-bold text-slate-900">
                {client.carried_forward?.contacts ?? client.contacts.length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-slate-700">Conversations & Calls</span>
              </div>
              <span className="text-base font-bold text-slate-900">
                {client.carried_forward?.communications ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <StickyNote className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-slate-700">Pinned & Team Notes</span>
              </div>
              <span className="text-base font-bold text-slate-900">
                {client.carried_forward?.notes ?? 0}
              </span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400">
            Account created on {formatDateTimeIST(client.created_at)}
          </div>
        </div>
      </div>

      {/* Key Contacts Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Client Contacts ({client.contacts.length})
            </h2>
          </div>
        </div>

        {client.contacts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No contacts recorded for this client.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {client.contacts.map((contact) => (
              <div
                key={contact.person_id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                    {getInitials(contact.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{contact.name}</span>
                      {contact.is_primary && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                          Primary Contact
                        </span>
                      )}
                    </div>
                    {contact.designation && (
                      <div className="text-xs text-slate-500">{contact.designation}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-600 sm:justify-end">
                  {contact.mobile && (
                    <a
                      href={`tel:${contact.mobile}`}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors min-h-[44px] py-1"
                    >
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{contact.mobile}</span>
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors min-h-[44px] py-1"
                    >
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{contact.email}</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Converted Deals History (if more than 1) */}
      {client.leads && client.leads.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Trophy className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Converted Deals History ({client.leads.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {client.leads.map((l) => (
              <div
                key={l.lead_id}
                className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 flex items-center justify-between"
              >
                <div>
                  <Link
                    to={`/sales/leads/${l.lead_id}`}
                    className="font-bold text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <span>{l.lead_code || `Lead #${l.lead_id}`}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Won on {formatDateIST(l.won_on)}
                  </div>
                </div>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Won
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Reverse Conversion Modal */}
      {isAdmin && client.converted_from_lead && (
        <ReverseConversionModal
          isOpen={isReverseModalOpen}
          onClose={() => setIsReverseModalOpen(false)}
          leadId={client.converted_from_lead.lead_id}
          leadCode={client.converted_from_lead.lead_code ?? undefined}
          companyName={client.company.name}
          onSuccess={() => {
            navigate(`/sales/leads/${client.converted_from_lead?.lead_id}`);
          }}
        />
      )}
    </div>
  );
};
