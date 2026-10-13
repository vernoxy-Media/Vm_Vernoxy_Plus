import React from 'react';
import { Link } from 'react-router-dom';
import { CompanyListItemDto } from '@vernoxy-pulse/api-client';
import { LinkValue } from '../../../components/LinkValue';
import { Users, Eye, Edit2, Trash2 } from 'lucide-react';

export interface CompanyCardProps {
  company: CompanyListItemDto;
  onDelete: (company: CompanyListItemDto) => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company, onDelete }) => {
  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            to={`/companies/${company.company_id}`}
            className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-sm"
          >
            {company.name}
          </Link>
          <div className="text-xs text-slate-500 mt-0.5">
            {[company.city, company.state].filter(Boolean).join(', ') || 'No location set'}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            company.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {company.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
        <div>
          <span className="text-xs uppercase font-semibold text-slate-400 block">Type</span>
          <span className="font-medium text-slate-700">{company.customer_type?.name}</span>
        </div>
        <div>
          <span className="text-xs uppercase font-semibold text-slate-400 block">Industry</span>
          <span className="font-medium text-slate-700 truncate block">
            {company.sub_industry?.name || company.industry?.name}
          </span>
        </div>
        <div>
          <span className="text-xs uppercase font-semibold text-slate-400 block">Owner</span>
          <span className="font-medium text-slate-700">{company.owner?.name || 'Unassigned'}</span>
        </div>
        <div>
          <span className="text-xs uppercase font-semibold text-slate-400 block">Contacts</span>
          <span className="font-medium text-slate-700 inline-flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" />
            {company.contact_count}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-1">
        <div className="space-y-1">
          {company.primary_email && (
            <div>
              <LinkValue type="email" value={company.primary_email} className="text-xs" />
            </div>
          )}
          {company.primary_phone && (
            <div>
              <LinkValue type="phone" value={company.primary_phone} className="text-xs" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Link
            to={`/companies/${company.company_id}`}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/companies/${company.company_id}/edit`}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit Company"
          >
            <Edit2 className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(company)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete Company"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
