import React from 'react';
import { Link } from 'react-router-dom';
import { User, Eye, MapPin, } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { FollowUpFlagBadge } from '../common/FollowUpFlagBadge';
import { formatDateIST, } from '../../utils/date';
import { getInitials, getAvatarColor } from '../../utils/formatters';
import type { LeadListItem } from '../../types/sales.types';

export interface LeadRowProps {
  lead: LeadListItem;
  isSelected: boolean;
  /** "table" renders the <tr> for the desktop table, "card" the stacked card for small screens. */
  variant?: 'table' | 'card';
  onToggleSelect: (id: number) => void;
}

export const LeadRow: React.FC<LeadRowProps> = ({
  variant = 'table',
  lead,
  isSelected,
  onToggleSelect,
}) => {
  const companyInitials = lead.company?.initials || getInitials(lead.company?.name || 'Lead');
  const companyColor = getAvatarColor(lead.company?.name || 'Lead');

  const leadByInitials = lead.lead_by?.name ? getInitials(lead.lead_by.name) : '—';
  const leadByColor = lead.lead_by?.name ? getAvatarColor(lead.lead_by.name) : 'bg-gray-400';

  return (
    <>
      {/* Desktop Table Row */}
      {variant === 'table' && (
      <tr
        className={`hidden lg:table-row transition-colors ${
          isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-gray-50/75'
        }`}
      >
        {/* Checkbox */}
        <td className="py-3.5 px-4 w-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(lead.lead_id)}
            className="w-4 h-4 rounded text-primary focus:ring-primary/20 border-gray-300 cursor-pointer"
          />
        </td>

        {/* Lead Code & Status */}
        <td className="py-3.5 px-4">
          <div className="flex flex-col gap-1 items-start">
            <Link
              to={`/sales/leads/${lead.lead_id}`}
              className="font-mono text-xs font-bold text-primary hover:underline"
            >
              {lead.lead_code || `LEAD-${lead.lead_id}`}
            </Link>
            <StatusBadge status={lead.status} size="sm" />
          </div>
        </td>

        {/* Company & Location */}
        <td className="py-3.5 px-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-2xs shrink-0 ${companyColor}`}
            >
              {companyInitials}
            </div>
            <div className="min-w-0">
              <Link
                to={`/sales/companies/${lead.company?.company_id}`}
                className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors block truncate max-w-[200px]"
              >
                {lead.company?.name}
              </Link>
              {lead.company?.city && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>{lead.company.city}</span>
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Contact Person */}
        <td className="py-3.5 px-4 text-xs text-gray-700">
          {lead.contact_person ? (
            <div className="flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate max-w-[150px]">{lead.contact_person}</span>
            </div>
          ) : (
            <span className="text-gray-400 italic">No contact</span>
          )}
        </td>

        {/* Lead By */}
        <td className="py-3.5 px-4">
          {lead.lead_by ? (
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-2xs font-bold text-white shrink-0 ${leadByColor}`}
              >
                {leadByInitials}
              </div>
              <span className="text-xs font-medium text-gray-800 truncate max-w-[120px]">
                {lead.lead_by.name}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Unassigned</span>
          )}
        </td>

        {/* Service Fit */}
        <td className="py-3.5 px-4">
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {lead.service_fit && lead.service_fit.length > 0 ? (
              lead.service_fit.slice(0, 2).map((fit) => (
                <span
                  key={fit}
                  className="px-2 py-0.5 rounded text-2xs font-medium bg-gray-100 text-gray-700 truncate"
                >
                  {fit}
                </span>
              ))
            ) : (
              <span className="text-2xs text-gray-400">—</span>
            )}
            {lead.service_fit && lead.service_fit.length > 2 && (
              <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-gray-100 text-gray-500">
                +{lead.service_fit.length - 2}
              </span>
            )}
          </div>
        </td>

        {/* Date Added */}
        <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
          {formatDateIST(lead.date_added)}
        </td>

        {/* Next Follow-up Flag */}
        <td className="py-3.5 px-4 whitespace-nowrap">
          {lead.next_follow_up ? (
            <FollowUpFlagBadge
              flag={lead.next_follow_up.flag}
              at={lead.next_follow_up.at}
            />
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-gray-100 text-gray-500">
              No follow-up
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="py-3.5 px-4 text-right">
          <Link
            to={`/sales/leads/${lead.lead_id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </Link>
        </td>
      </tr>
      )}
      {variant === 'card' && (
        <>

      {/* Mobile Stacked Card View */}
      <div
        className={`overflow-hidden rounded-2xl border bg-white transition-all ${
          isSelected ? 'border-primary/40 bg-primary/5' : 'border-gray-200 shadow-2xs'
        }`}
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-2xs ${companyColor}`}>
            {companyInitials}
          </div>

          <div className="min-w-0 flex-1">
            <Link to={`/sales/leads/${lead.lead_id}`} className="block truncate text-[15px] font-semibold leading-tight text-gray-900 hover:text-primary">
              {lead.company?.name}
            </Link>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="whitespace-nowrap rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-gray-600">
                {lead.lead_code || `LEAD-${lead.lead_id}`}
              </span>
              <StatusBadge status={lead.status} size="sm" />
            </div>
          </div>

          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(lead.lead_id)}
            aria-label={`Select ${lead.company?.name ?? 'lead'}`}
            className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded-md border-gray-300 text-primary focus:ring-primary/20"
          />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 px-4 py-3 text-xs">
          <div className="min-w-0">
            <dt className="text-[11px] text-gray-400">Contact</dt>
            <dd className="mt-0.5 truncate font-medium text-gray-800">{lead.contact_person || '—'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] text-gray-400">Lead by</dt>
            <dd className="mt-0.5 truncate font-medium text-gray-800">{lead.lead_by?.name || 'Unassigned'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] text-gray-400">Added</dt>
            <dd className="mt-0.5 font-medium text-gray-800">{formatDateIST(lead.date_added)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="mb-0.5 text-[11px] text-gray-400">Next follow-up</dt>
            <dd>
              {lead.next_follow_up ? (
                <FollowUpFlagBadge flag={lead.next_follow_up.flag} at={lead.next_follow_up.at} />
              ) : lead.no_follow_up ? (
                <FollowUpFlagBadge noFollowUp />
              ) : (
                <span className="text-gray-400">None</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-2.5">
          <div className="flex min-w-0 flex-wrap gap-1">
            {(lead.service_fit ?? []).slice(0, 2).map((fit) => (
              <span key={fit} className="max-w-[9rem] truncate rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                {fit}
              </span>
            ))}
            {(lead.service_fit?.length ?? 0) > 2 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">+{(lead.service_fit?.length ?? 0) - 2}</span>
            )}
          </div>
          <Link
            to={`/sales/leads/${lead.lead_id}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Open
          </Link>
        </div>
      </div>
</>
      )}
    </>
  );
};
