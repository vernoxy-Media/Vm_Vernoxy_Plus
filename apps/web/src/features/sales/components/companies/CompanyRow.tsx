import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Edit2, UserPlus, Trash2, MapPin, User, Briefcase, ExternalLink } from 'lucide-react';
import { getInitials, getAvatarColor } from '../../utils/formatters';
import { WebsiteQualityBadge } from '../common/WebsiteQualityBadge';
import { ActionMenu, type ActionMenuItem } from '../common/ActionMenu';
import { StatusBadge } from '../common/StatusBadge';
import type { SalesCompanyListItem } from '../../types/sales.types';

export interface CompanyRowProps {
  company: SalesCompanyListItem;
  isSelected: boolean;
  /** "table" renders the <tr> for the desktop table, "card" the stacked card for small screens. */
  variant?: 'table' | 'card' | 'grid';
  onToggleSelect: (id: number) => void;
  onConvertToLead: (company: SalesCompanyListItem) => void;
  onDelete: (company: SalesCompanyListItem) => void;
}

export const CompanyRow: React.FC<CompanyRowProps> = ({
  variant = 'table',
  company,
  isSelected,
  onToggleSelect,
  onConvertToLead,
  onDelete,
}) => {
  const avatarColor = getAvatarColor(company.name);
  const initials = company.initials || getInitials(company.name);

  const navigate = useNavigate();
  const menuItems: ActionMenuItem[] = [
    { key: 'view', label: 'View company', icon: Eye, onSelect: () => navigate(`/sales/companies/${company.company_id}`) },
    { key: 'edit', label: 'Edit company', icon: Edit2, onSelect: () => navigate(`/sales/companies/${company.company_id}/edit`) },
    {
      key: 'convert',
      label: company.lead.kind === 'client' ? 'New lead for more work' : 'Convert to lead',
      icon: UserPlus,
      onSelect: () => onConvertToLead(company),
      disabled: !company.can_convert_to_lead,
      hint: 'It already has an open lead',
    },
    { key: 'delete', label: 'Delete company', icon: Trash2, onSelect: () => onDelete(company), danger: true },
  ];

  // Render lead/client tag
  const renderLeadTag = () => {
    if (company.lead.kind === 'client') {
      return (
        <div className="flex items-center gap-1.5">
          <Link
            to={company.lead.client_id ? `/sales/clients/${company.lead.client_id}` : '#'}
            onClick={(e) => !company.lead.client_id && e.preventDefault()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
          >
            <Briefcase className="w-3 h-3 text-emerald-600" />
            <span>{company.lead.client_code ?? 'Client'}</span>
          </Link>
        </div>
      );
    }

    if (company.lead.kind === 'lead' && company.lead.lead_id) {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            to={`/sales/leads/${company.lead.lead_id}`}
            className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            <span>{company.lead.lead_code ?? `LEAD-${company.lead.lead_id}`}</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <StatusBadge status={company.lead.stage} size="sm" />
        </div>
      );
    }

    return <span className="text-xs text-slate-400 font-normal">Not a Lead</span>;
  };

  return (
    <>
      {/* Desktop table row. Cells follow the header: Company, Location, Industry, Contact, Website, Status, Actions */}
      {variant === 'table' && (
        <tr className={`group transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}>
          <td className="w-12 py-3.5 pl-5 pr-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(company.company_id)}
              aria-label={`Select ${company.name}`}
              className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </td>

          <td className="px-3 py-3.5">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs ${avatarColor}`}>{initials}</div>
              <div className="min-w-0">
                <Link to={`/sales/companies/${company.company_id}`} className="block max-w-[16rem] truncate text-sm font-semibold text-slate-900 transition-colors hover:text-blue-600" title={company.name}>
                  {company.name}
                </Link>
                <span className="mt-1 inline-block whitespace-nowrap rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
                  {company.company_code ?? `COM-${company.company_id}`}
                </span>
              </div>
            </div>
          </td>

          <td className="px-3 py-3.5 text-sm text-slate-600">
            {company.city ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{company.city}</span>
              </span>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </td>

          <td className="px-3 py-3.5 text-sm text-slate-600">
            {company.industry ? (
              <span className="inline-block max-w-[11rem] truncate rounded-lg bg-slate-100/80 px-2 py-1 text-xs font-medium text-slate-700" title={company.industry}>
                {company.industry}
              </span>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </td>

          <td className="px-3 py-3.5 text-sm text-slate-700">
            {company.contact_person ? (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="max-w-[10rem] truncate" title={company.contact_person}>
                  {company.contact_person}
                </span>
              </span>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </td>

          <td className="px-3 py-3.5">
            <WebsiteQualityBadge quality={company.website_quality} />
          </td>

          <td className="px-3 py-3.5">{renderLeadTag()}</td>

          <td className="py-3.5 pl-3 pr-4">
            <div className="flex items-center justify-end">
              <ActionMenu items={menuItems} label={`Actions for ${company.name}`} />
            </div>
          </td>
        </tr>
      )}
      {variant === 'grid' && (
        <div
          className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-md ${
            isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/80 shadow-2xs'
          }`}
        >
          <div className="flex items-start gap-3 p-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-2xs ${avatarColor}`}>{initials}</div>
            <div className="min-w-0 flex-1">
              <Link to={`/sales/companies/${company.company_id}`} className="block truncate text-[15px] font-semibold leading-tight text-slate-900 hover:text-blue-600" title={company.name}>
                {company.name}
              </Link>
              <span className="mt-1 inline-block whitespace-nowrap rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
                {company.company_code ?? `COM-${company.company_id}`}
              </span>
            </div>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(company.company_id)}
              aria-label={`Select ${company.name}`}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <ActionMenu items={menuItems} label={`Actions for ${company.name}`} />
          </div>

          <div className="flex flex-1 flex-col gap-2 px-4 pb-4 text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{company.city ?? '—'}</span>
            </span>
            <span className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{company.contact_person ?? '—'}</span>
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {company.industry && <span className="max-w-full truncate rounded-lg bg-slate-100/80 px-2 py-1 text-xs font-medium text-slate-700">{company.industry}</span>}
              <WebsiteQualityBadge quality={company.website_quality} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
            {renderLeadTag()}
            <Link to={`/sales/companies/${company.company_id}`} className="text-xs font-semibold text-slate-500 transition hover:text-blue-600">
              View
            </Link>
          </div>
        </div>
      )}
      {variant === 'card' && (
        <>

      {/* Phone / tablet card */}
      <div
        className={`overflow-hidden rounded-2xl border bg-white transition-all ${
          isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200/80 shadow-2xs'
        }`}
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-2xs ${avatarColor}`}>{initials}</div>

          <div className="min-w-0 flex-1">
            <Link to={`/sales/companies/${company.company_id}`} className="block truncate text-[15px] font-semibold leading-tight text-slate-900 hover:text-blue-600">
              {company.name}
            </Link>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="whitespace-nowrap rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                {company.company_code ?? `COM-${company.company_id}`}
              </span>
              {company.city && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {company.city}
                </span>
              )}
            </div>
          </div>

          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(company.company_id)}
            aria-label={`Select ${company.name}`}
            className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 px-4 py-3 text-xs">
          <div className="min-w-0">
            <dt className="text-[11px] text-slate-400">Industry</dt>
            <dd className="mt-0.5 truncate font-medium text-slate-800">{company.industry ?? '—'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] text-slate-400">Contact</dt>
            <dd className="mt-0.5 truncate font-medium text-slate-800">{company.contact_person ?? '—'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="mb-0.5 text-[11px] text-slate-400">Website</dt>
            <dd>
              <WebsiteQualityBadge quality={company.website_quality} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="mb-0.5 text-[11px] text-slate-400">Status</dt>
            <dd>{renderLeadTag()}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 p-3 sm:flex-row sm:items-center">
          {/* Main action: the full width on phones, on the right on wider cards */}
          <button
            type="button"
            onClick={() => onConvertToLead(company)}
            disabled={!company.can_convert_to_lead}
            title={company.can_convert_to_lead ? (company.lead.kind === 'client' ? 'This client is buying more: create a new lead' : 'Create a lead from this company') : 'This company already has an open lead'}
            className={`inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition sm:order-last sm:ml-auto sm:w-auto ${
              company.can_convert_to_lead
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.99]'
                : 'cursor-not-allowed bg-slate-100 text-slate-400'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            {company.can_convert_to_lead ? (company.lead.kind === 'client' ? 'New lead for more work' : 'Convert to lead') : 'Has an open lead'}
          </button>

          <div className="flex items-center gap-2">
            <Link
              to={`/sales/companies/${company.company_id}`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:flex-none"
            >
              <Eye className="h-4 w-4 text-slate-400" />
              View
            </Link>
            <Link
              to={`/sales/companies/${company.company_id}/edit`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:flex-none"
            >
              <Edit2 className="h-4 w-4 text-slate-400" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => onDelete(company)}
              aria-label="Delete company"
              title="Delete company"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
</>
      )}
    </>
  );
};
