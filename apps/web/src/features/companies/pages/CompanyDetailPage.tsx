import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCompanyDetailQuery, useDeleteCompanyMutation } from '../api/companies.api';
import { LinkValue } from '../../../components/LinkValue';
import {
  Building2,
  Edit2,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Users,
  Radio,
} from 'lucide-react';

export const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const companyId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const { data: company, isLoading, error } = useCompanyDetailQuery(companyId);
  const deleteMutation = useDeleteCompanyMutation();

  const handleDelete = async () => {
    if (!company) return;
    if (!window.confirm(`Are you sure you want to delete "${company.name}"?`)) return;

    try {
      await deleteMutation.mutateAsync(company.company_id);
      navigate('/companies');
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || 'Cannot delete company: in use by child companies or active leads');
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading company details...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h2 className="text-sm font-bold text-slate-800">Company Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          The requested company does not exist or has been deleted.
        </p>
        <Link
          to="/companies"
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Link
            to="/companies"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="Back to Companies"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{company.name}</h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  company.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {company.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              {[company.address, company.city, company.state, company.country]
                .filter(Boolean)
                .join(', ') || 'No address specified'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to={`/companies/${company.company_id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overview Card & Channels Card */}
        <div className="space-y-6">
          {/* Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Company Overview
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Customer Type</span>
                <span className="font-semibold text-slate-800">{company.customer_type?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Industry</span>
                <span className="font-semibold text-slate-800">{company.industry?.name}</span>
                {company.sub_industry && (
                  <span className="text-slate-500 block text-[11px]">↳ {company.sub_industry.name}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Account Owner</span>
                <span className="font-semibold text-slate-800">
                  {company.owner?.name || <span className="text-slate-400 italic">Unassigned</span>}
                </span>
              </div>
              {company.parent && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Parent Organization</span>
                  <Link
                    to={`/companies/${company.parent.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {company.parent.name}
                  </Link>
                </div>
              )}
              {company.children && company.children.length > 0 && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Subsidiaries ({company.children.length})</span>
                  <div className="space-y-1 mt-1">
                    {company.children.map((child) => (
                      <Link
                        key={child.id}
                        to={`/companies/${child.id}`}
                        className="text-blue-600 hover:underline block font-medium"
                      >
                        • {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Channels Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-600" />
              Communication Channels
            </h2>

            {company.channels?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No communication channels added.</p>
            ) : (
              <div className="space-y-2.5">
                {company.channels?.map((ch) => (
                  <div
                    key={ch.channel_id}
                    className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {ch.channel_type}
                        </span>
                        {ch.is_primary && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                            Primary
                          </span>
                        )}
                        {ch.label && <span className="text-[10px] text-slate-500">({ch.label})</span>}
                      </div>
                      <LinkValue
                        type={ch.channel_type as any}
                        value={ch.value}
                        className="text-xs font-medium truncate block"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contacts Table (spans 2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Associated Contacts ({company.contacts?.length || 0})
            </h2>
          </div>

          {company.contacts?.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No contacts associated with this company yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Contact</th>
                    <th className="py-3 px-5">Designation & Dept</th>
                    <th className="py-3 px-5">Contact Details</th>
                    <th className="py-3 px-5">Shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {company.contacts?.map((contact) => (
                    <tr key={contact.company_person_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {contact.name}
                          {contact.is_primary && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              Primary
                            </span>
                          )}
                        </div>
                        {contact.linkedin_url && (
                          <div className="mt-0.5">
                            <LinkValue type="linkedin" value={contact.linkedin_url} className="text-[11px]" />
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600">
                        <div className="font-medium text-slate-800">{contact.designation || '—'}</div>
                        <div className="text-[11px] text-slate-400">{contact.department?.label}</div>
                      </td>
                      <td className="py-3.5 px-5 space-y-1">
                        {contact.email && (
                          <div>
                            <LinkValue type="email" value={contact.email} className="text-xs" />
                          </div>
                        )}
                        {contact.mobile && (
                          <div>
                            <LinkValue type="phone" value={contact.mobile} className="text-xs" />
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        {contact.linked_company_count > 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium">
                            {contact.linked_company_count} companies
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">1 company</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
