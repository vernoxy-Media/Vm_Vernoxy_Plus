import React from 'react';
import {
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  ArrowRightCircle,
  Pencil,
  Trash2,
  Briefcase,
  FileText,
  Share2,
} from 'lucide-react';
import { Lead } from '../api/leads.api';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onDelete: (leadId: number) => void;
  onStageChange: (leadId: number, newStage: string) => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onEdit,
  onConvert,
  onDelete,
  onStageChange,
}) => {
  if (!isOpen || !lead) return null;

  const formatCurrency = (val: number | null) => {
    if (!val) return 'Not Specified';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const STAGE_ORDER = ['New', 'Contacted', 'Qualified', 'Converted'];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200/80 bg-slate-50/50 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                  {lead.lead_stage || 'New'}
                </span>
                {lead.is_gidc && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
                    <MapPin className="w-3 h-3 text-amber-600" />
                    {lead.gidc_name}
                  </span>
                )}
                {lead.company_id && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Converted Client #{lead.company_id}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{lead.company_name}</h2>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <span>{lead.city || 'India'}</span>
                {lead.nature_of_business && <span>• {lead.nature_of_business}</span>}
                {lead.industry && <span>• {lead.industry}</span>}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEdit(lead)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Edit Lead"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Stage Pipeline Stepper */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <div className="text-xs font-semibold text-slate-500 mb-2">Stage Progression</div>
              <div className="grid grid-cols-4 gap-1.5">
                {STAGE_ORDER.map((stageName, idx) => {
                  const currentIdx = STAGE_ORDER.indexOf(lead.lead_stage || 'New');
                  const isCurrent = lead.lead_stage === stageName;
                  const isPast = currentIdx > idx;

                  return (
                    <button
                      key={stageName}
                      type="button"
                      onClick={() => onStageChange(lead.lead_id, stageName)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isPast
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {stageName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions & Convert */}
            <div className="flex flex-wrap gap-2">
              {!lead.company_id && (
                <button
                  type="button"
                  onClick={() => onConvert(lead)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  Convert to Company Client
                </button>
              )}

              {lead.mobile && (
                <a
                  href={`tel:${lead.mobile}`}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  Call
                </a>
              )}

              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  Email
                </a>
              )}

              {lead.website && (
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  Website
                </a>
              )}

              {lead.google_maps_url && (
                <a
                  href={lead.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  Map
                </a>
              )}
            </div>

            {/* Section 1: Contact Details */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Contact Person Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Name</span>
                  <span className="font-semibold text-slate-800">{lead.contact_person || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Designation</span>
                  <span className="font-semibold text-slate-800">{lead.designation || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Mobile Phone</span>
                  <span className="font-mono font-semibold text-slate-800">{lead.mobile || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Email Address</span>
                  <span className="font-semibold text-slate-800">{lead.email || '-'}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Company & Operations */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Company & Operations
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Products / Services</span>
                  <span className="font-semibold text-slate-800">{lead.products_services || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Est. Annual Turnover</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(lead.estimated_turnover)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Est. Employees</span>
                  <span className="font-semibold text-slate-800">{lead.estimated_employees || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Year Established</span>
                  <span className="font-semibold text-slate-800">{lead.year_established || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">No. of Branches</span>
                  <span className="font-semibold text-slate-800">{lead.no_of_branches ?? 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">No. of Plants</span>
                  <span className="font-semibold text-slate-800">{lead.no_of_plants ?? 0}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">Existing Major Clients</span>
                  <span className="font-semibold text-slate-800">{lead.existing_major_clients || '-'}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Location & GIDC */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Location & Industrial Zone
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="col-span-2">
                  <span className="text-slate-400 block">Address</span>
                  <span className="font-semibold text-slate-800">{lead.full_address || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">City / State</span>
                  <span className="font-semibold text-slate-800">
                    {lead.city || '-'}, {lead.state || 'Gujarat'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">PIN / Postal Code</span>
                  <span className="font-mono font-semibold text-slate-800">{lead.pin || '-'}</span>
                </div>
                {lead.is_gidc && (
                  <>
                    <div>
                      <span className="text-slate-400 block">GIDC Estate</span>
                      <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                        {lead.gidc_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">GIDC Area / Phase</span>
                      <span className="font-semibold text-slate-800">{lead.gidc_area_phase || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Section 4: Digital Presence */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Digital Footprint & Web
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Website Quality</span>
                  <span className="font-semibold text-slate-800">{lead.website_quality || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Developed By</span>
                  <span className="font-semibold text-slate-800">{lead.developed_by || '-'}</span>
                </div>
                {lead.brochure_url && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Brochure Document</span>
                    <a
                      href={lead.brochure_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 mt-0.5 font-semibold"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Brochure Document
                    </a>
                  </div>
                )}
                <div className="col-span-2 flex flex-wrap gap-2 pt-1">
                  {lead.linkedin_url && (
                    <a
                      href={lead.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3 text-blue-600" /> LinkedIn
                    </a>
                  )}
                  {lead.instagram_url && (
                    <a
                      href={lead.instagram_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3 text-pink-600" /> Instagram
                    </a>
                  )}
                  {lead.facebook_url && (
                    <a
                      href={lead.facebook_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3 text-blue-700" /> Facebook
                    </a>
                  )}
                  {lead.youtube_url && (
                    <a
                      href={lead.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3 text-red-600" /> YouTube
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Section 5: Sales Attribution */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                Sales Attribution & Audit
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Service Fit</span>
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">
                    {lead.service_fit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Lead Source</span>
                  <span className="font-semibold text-slate-800">{lead.lead_source}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Lead By (Sales Rep)</span>
                  <span className="font-semibold text-slate-800">
                    {lead.employees_leads_owner_idToemployees?.name || 'Sales User'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Date Added (Auto)</span>
                  <span className="font-mono text-slate-800">{formatDate(lead.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <button
              type="button"
              onClick={() => onDelete(lead.lead_id)}
              className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete Lead
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
