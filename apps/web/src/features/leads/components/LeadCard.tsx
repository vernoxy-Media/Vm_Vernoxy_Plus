import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  User,
  ArrowRightCircle,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { Lead } from '../api/leads.api';

interface LeadCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onSelect,
  onEdit,
  onConvert,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(lead.lead_id),
    data: { lead },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  const formatCurrency = (val: number | null) => {
    if (!val) return null;
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const getWebsiteQualityBadge = (quality: string | null) => {
    if (!quality) return null;
    switch (quality.toLowerCase()) {
      case 'good':
        return <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Good Web</span>;
      case 'average':
        return <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">Avg Web</span>;
      case 'poor':
        return <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200">Poor Web</span>;
      case 'no website':
        return <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">No Web</span>;
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group relative rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:shadow-md hover:border-blue-400 select-none cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-40 ring-2 ring-blue-500 shadow-xl' : ''
      }`}
    >
      {/* Top Header: Company Name & Value */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(lead);
            }}
            className="text-left font-semibold text-slate-900 text-sm hover:text-blue-600 transition-colors truncate block w-full"
            title={lead.company_name}
          >
            {lead.company_name}
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
            <span className="truncate">{lead.city || 'India'}</span>
            {lead.is_gidc && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium text-[10px]">
                <MapPin className="w-2.5 h-2.5" />
                {lead.gidc_name || 'GIDC'}
              </span>
            )}
          </div>
        </div>

        {/* Turnover / Value badge */}
        {lead.estimated_turnover && (
          <div className="shrink-0 text-right">
            <span className="text-xs font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              {formatCurrency(Number(lead.estimated_turnover))}
            </span>
          </div>
        )}
      </div>

      {/* Industry / Service Fit Tags */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {lead.service_fit && (
          <span className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 truncate max-w-[150px]">
            {lead.service_fit}
          </span>
        )}
        {lead.industry && (
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md truncate max-w-[130px]">
            {lead.industry}
          </span>
        )}
        {getWebsiteQualityBadge(lead.website_quality)}
      </div>

      {/* Primary Contact Person Info */}
      {lead.contact_person && (
        <div className="pt-2.5 border-t border-slate-100 mb-2.5 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 truncate max-w-[140px] flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              {lead.contact_person}
            </span>
            {lead.designation && (
              <span className="text-[11px] text-slate-400 truncate max-w-[100px]">
                {lead.designation}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
            {lead.mobile && (
              <a
                href={`tel:${lead.mobile}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors"
                title={`Call ${lead.mobile}`}
              >
                <Phone className="w-3 h-3 text-emerald-600" />
                <span className="text-[11px] font-mono">{lead.mobile}</span>
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors"
                title={`Email ${lead.email}`}
              >
                <Mail className="w-3 h-3 text-blue-500" />
                <span className="text-[11px] truncate max-w-[120px]">{lead.email}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Card Footer: Sales Rep, Website, Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500" title={`Lead By: ${lead.employees_leads_owner_idToemployees?.name || 'Self'}`}>
          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
            {lead.employees_leads_owner_idToemployees?.name?.charAt(0) || 'U'}
          </div>
          <span className="text-[11px] text-slate-600 truncate max-w-[90px]">
            {lead.employees_leads_owner_idToemployees?.name?.split(' ')[0] || 'Sales'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {lead.website && (
            <a
              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Visit Website"
            >
              <Globe className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Quick convert button if qualified/not converted yet */}
          {!lead.company_id && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConvert(lead);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Convert to Company Client"
            >
              <ArrowRightCircle className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(lead);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Edit Lead"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(lead);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="View Details"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
