import React from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  ArrowRightCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Lead } from '../api/leads.api';

interface LeadTableViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onConvertLead: (lead: Lead) => void;
  onDeleteLead: (leadId: number) => void;
  onStageChange: (leadId: number, newStage: string) => void;
}

export const LeadTableView: React.FC<LeadTableViewProps> = ({
  leads,
  onSelectLead,
  onEditLead,
  onConvertLead,
  onDeleteLead,
  onStageChange,
}) => {
  const getStageBadge = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'new':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'contacted':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'qualified':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'converted':
      case 'won':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'lost':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const formatCurrency = (val: number | null) => {
    if (!val) return '-';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th scope="col" className="px-4 py-3.5">Company Name</th>
              <th scope="col" className="px-4 py-3.5">Location / GIDC</th>
              <th scope="col" className="px-4 py-3.5">Contact Person</th>
              <th scope="col" className="px-4 py-3.5">Service Fit & Industry</th>
              <th scope="col" className="px-4 py-3.5">Est. Turnover</th>
              <th scope="col" className="px-4 py-3.5">Website</th>
              <th scope="col" className="px-4 py-3.5">Lead By</th>
              <th scope="col" className="px-4 py-3.5">Date Added</th>
              <th scope="col" className="px-4 py-3.5">Stage / Status</th>
              <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium">No leads found</p>
                  <p className="text-[11px] text-slate-400">Try adjusting your filters or search terms</p>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.lead_id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  onClick={() => onSelectLead(lead)}
                >
                  {/* Company Name */}
                  <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-[200px]">
                    <div className="truncate text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      {lead.company_name}
                    </div>
                    {lead.nature_of_business && (
                      <span className="text-[10px] font-normal text-slate-400">
                        {lead.nature_of_business}
                      </span>
                    )}
                  </td>

                  {/* Location / GIDC */}
                  <td className="px-4 py-3.5 max-w-[160px]">
                    <div className="truncate font-medium text-slate-700">
                      {lead.city || 'India'}
                    </div>
                    {lead.is_gidc && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 truncate">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        {lead.gidc_name} {lead.gidc_area_phase ? `(${lead.gidc_area_phase})` : ''}
                      </span>
                    )}
                  </td>

                  {/* Contact Person */}
                  <td className="px-4 py-3.5">
                    {lead.contact_person ? (
                      <div>
                        <div className="font-medium text-slate-800">{lead.contact_person}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {lead.mobile && (
                            <a
                              href={`tel:${lead.mobile}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-blue-600 flex items-center gap-0.5"
                            >
                              <Phone className="w-2.5 h-2.5 text-emerald-600" />
                              {lead.mobile}
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-blue-600 flex items-center gap-0.5"
                            >
                              <Mail className="w-2.5 h-2.5 text-blue-500" />
                              Email
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No contact</span>
                    )}
                  </td>

                  {/* Service Fit & Industry */}
                  <td className="px-4 py-3.5 max-w-[180px]">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-medium text-[11px] truncate">
                      {lead.service_fit}
                    </span>
                    {lead.industry && (
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {lead.industry}
                      </div>
                    )}
                  </td>

                  {/* Estimated Turnover */}
                  <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">
                    {formatCurrency(lead.estimated_turnover)}
                  </td>

                  {/* Website */}
                  <td className="px-4 py-3.5 max-w-[120px]">
                    {lead.website ? (
                      <div className="flex items-center gap-1">
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:underline flex items-center gap-1 truncate text-xs"
                        >
                          <Globe className="w-3 h-3 shrink-0" />
                          Link
                        </a>
                        {lead.website_quality && (
                          <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {lead.website_quality}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No website</span>
                    )}
                  </td>

                  {/* Lead By */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="font-medium text-slate-700">
                      {lead.employees_leads_owner_idToemployees?.name || 'Sales User'}
                    </span>
                    <div className="text-[10px] text-slate-400">
                      {lead.lead_source || 'Cold calling'}
                    </div>
                  </td>

                  {/* Date Added */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {formatDate(lead.created_at)}
                  </td>

                  {/* Stage / Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <select
                      value={lead.lead_stage || 'New'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onStageChange(lead.lead_id, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer ${getStageBadge(
                        lead.lead_stage || 'New'
                      )}`}
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Converted">Converted</option>
                      <option value="Lost">Lost</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {!lead.company_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onConvertLead(lead);
                          }}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Convert to Company Client"
                        >
                          <ArrowRightCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditLead(lead);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Edit Lead"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLead(lead.lead_id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
