import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  User,
  Calendar,
  Lock,
  Pencil,
  Send,
} from 'lucide-react';
import { Lead } from '../api/leads.api';

interface LeadCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  isOverlay?: boolean;
}

const STAGE_BORDER_STYLES: Record<
  string,
  {
    border: string;
    hoverBorder: string;
    bg: string;
    overlayBorder: string;
    overlayRing: string;
    accentLeft: string;
  }
> = {
  New: {
    border: 'border-blue-400',
    hoverBorder: 'hover:border-blue-500',
    bg: 'bg-gradient-to-br from-blue-50/20 via-white to-white',
    overlayBorder: 'border-blue-500',
    overlayRing: 'ring-blue-500/25',
    accentLeft: 'border-l-blue-500',
  },
  Contacted: {
    border: 'border-amber-400',
    hoverBorder: 'hover:border-amber-500',
    bg: 'bg-gradient-to-br from-amber-50/30 via-white to-white',
    overlayBorder: 'border-amber-500',
    overlayRing: 'ring-amber-500/25',
    accentLeft: 'border-l-amber-500',
  },
  Qualified: {
    border: 'border-purple-400',
    hoverBorder: 'hover:border-purple-500',
    bg: 'bg-gradient-to-br from-purple-50/25 via-white to-white',
    overlayBorder: 'border-purple-500',
    overlayRing: 'ring-purple-500/25',
    accentLeft: 'border-l-purple-500',
  },
  Converted: {
    border: 'border-emerald-500',
    hoverBorder: 'hover:border-emerald-600',
    bg: 'bg-gradient-to-br from-emerald-50/30 via-white to-white',
    overlayBorder: 'border-emerald-500',
    overlayRing: 'ring-emerald-500/25',
    accentLeft: 'border-l-emerald-500',
  },
  Lost: {
    border: 'border-rose-400',
    hoverBorder: 'hover:border-rose-500',
    bg: 'bg-gradient-to-br from-rose-50/20 via-white to-white',
    overlayBorder: 'border-rose-500',
    overlayRing: 'ring-rose-500/25',
    accentLeft: 'border-l-rose-500',
  },
  'On Hold': {
    border: 'border-slate-300',
    hoverBorder: 'hover:border-slate-400',
    bg: 'bg-white',
    overlayBorder: 'border-slate-400',
    overlayRing: 'ring-slate-400/25',
    accentLeft: 'border-l-slate-400',
  },
};

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onSelect,
  onEdit,
  onConvert,
  isOverlay = false,
}) => {
  const stage = lead.lead_stage || 'New';
  const stageStyles = STAGE_BORDER_STYLES[stage] || STAGE_BORDER_STYLES.New;
  const isConverted = stage === 'Converted';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(lead.lead_id),
    data: { lead },
    disabled: isOverlay,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  const formatCurrency = (val: number | null) => {
    if (!val) return null;
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Get user initials (like KR in screenshot)
  const getUserInitials = (name?: string | null) => {
    if (!name) return 'KR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  // If card is currently being dragged, show a subtle dashed placeholder in its place
  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-xl border-2 border-dashed ${stageStyles.border} bg-slate-50/50 p-4 min-h-[130px] opacity-40 transition-all duration-150`}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={isOverlay ? undefined : style}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      onClick={() => onSelect(lead)}
      className={`group relative rounded-xl border border-l-4 ${stageStyles.border} ${stageStyles.accentLeft} ${stageStyles.bg} p-3.5 transition-all select-none touch-none ${
        isOverlay
          ? `${stageStyles.overlayBorder} shadow-2xl ring-4 ${stageStyles.overlayRing} rotate-1 scale-[1.02] cursor-grabbing`
          : 'shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* Top row: Code + Tag + Turnover/Priority badge */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
            LEAD-{String(lead.lead_id).padStart(4, '0')}
          </span>
          {lead.service_fit && (
            <span
              title={lead.service_fit}
              className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md truncate max-w-[110px]"
            >
              {lead.service_fit}
            </span>
          )}
          {isConverted && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
              <Lock className="w-2.5 h-2.5" /> Approved
            </span>
          )}
        </div>

        {lead.estimated_turnover ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border bg-blue-50 text-blue-700 border-blue-200">
            {formatCurrency(Number(lead.estimated_turnover))}
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border bg-slate-50 text-slate-500 border-slate-200">
            MEDIUM
          </span>
        )}
      </div>

      {/* Title / Company Name */}
      <h3
        className={`text-sm font-semibold line-clamp-2 mb-2 transition-colors ${
          isConverted ? 'text-slate-700 group-hover:text-emerald-700' : 'text-slate-800 group-hover:text-blue-600'
        }`}
      >
        {lead.company_name}
      </h3>

      {/* Sub-info pill styled like Sub-task of TSK in Image 2 */}
      {(lead.city || lead.is_gidc) && (
        <div className="flex items-center gap-1 mb-2 text-[11px] text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-md font-medium w-fit">
          <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
          <span className="truncate max-w-[210px]">
            {lead.is_gidc
              ? `${lead.gidc_name || 'GIDC'}${lead.gidc_area_phase ? ` - ${lead.gidc_area_phase}` : ''}`
              : lead.city || 'India'}
          </span>
        </div>
      )}

      {/* Meta: Contact person, Mobile, Date (matching Clock, Calendar in Image 2) */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
        {lead.contact_person && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
            <User className="w-3 h-3 text-slate-400" />
            {lead.contact_person}
            {lead.designation ? ` (${lead.designation.split(' ')[0]})` : ''}
          </span>
        )}

        {lead.mobile && (
          <a
            href={`tel:${lead.mobile}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-100 font-mono transition-colors"
          >
            <Phone className="w-2.5 h-2.5 text-emerald-600" />
            {lead.mobile}
          </a>
        )}

        {lead.created_at && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formatDate(lead.created_at)}
          </span>
        )}
      </div>

      {/* Bottom row: Assignee Avatar (KR box) + Quick Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {/* Square initials box like KR in image 2 */}
          <span
            className="font-bold text-xs text-blue-600 hover:text-blue-700 tracking-wider"
            title={`Lead By: ${lead.employees_leads_owner_idToemployees?.name || 'Sales User'}`}
          >
            {getUserInitials(lead.employees_leads_owner_idToemployees?.name)}
          </span>
        </div>

        {/* Quick action buttons like Hold, Submit in image 2 */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {lead.website && (
            <a
              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noreferrer"
              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Visit Website"
            >
              <Globe className="w-3.5 h-3.5" />
            </a>
          )}

          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Send Email"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}

          {!lead.company_id && (
            <button
              type="button"
              onClick={() => onConvert(lead)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 transition-colors cursor-pointer"
            >
              <Send className="w-2.5 h-2.5" /> Submit
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(lead)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Edit Lead"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
