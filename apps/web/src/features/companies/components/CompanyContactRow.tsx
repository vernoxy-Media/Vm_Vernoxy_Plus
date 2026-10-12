import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CompanyFormData } from '../schemas/company-form.schema';
import { Search, UserCheck } from 'lucide-react';

export interface CompanyContactRowProps {
  index: number;
  form: UseFormReturn<CompanyFormData>;
  deptLookups?: { id: number; label: string }[];
  matchedPersons?: { person_id: number; name: string; email?: string | null; mobile?: string | null }[];
  lookupIndex: number | null;
  lookupQuery: string;
  onFocusLookup: (index: number) => void;
  onChangeLookup: (q: string) => void;
  onSelectPerson: (index: number, person: any) => void;
  onSetPrimary: (index: number) => void;
}

export const CompanyContactRow: React.FC<CompanyContactRowProps> = ({
  index,
  form,
  deptLookups,
  matchedPersons,
  lookupIndex,
  lookupQuery,
  onFocusLookup,
  onChangeLookup,
  onSelectPerson,
  onSetPrimary,
}) => {
  const { register, watch, formState: { errors } } = form;
  const contactsWatch = watch('contacts') || [];
  const contact = contactsWatch[index] || {};
  const isLinked = Boolean(contact.person_id || contact.company_person_id);
  const itemErrors = errors.contacts?.[index];

  return (
    <div className="space-y-4">
      {/* Lookup Bar if not linked */}
      {!isLinked && (
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={lookupIndex === index ? lookupQuery : ''}
                onFocus={() => onFocusLookup(index)}
                onChange={(e) => onChangeLookup(e.target.value)}
                placeholder="Search existing person by name, email, or phone to link..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {lookupIndex === index && matchedPersons && matchedPersons.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
              {matchedPersons.map((p) => (
                <button
                  key={p.person_id}
                  type="button"
                  onClick={() => onSelectPerson(index, p)}
                  className="w-full p-2.5 text-left hover:bg-blue-50/70 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {[p.email, p.mobile].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-600">Link Person</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isLinked && (
        <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-900">{contact.name}</span>
              <span className="text-slate-500 ml-2">
                {[contact.email, contact.mobile].filter(Boolean).join(' • ')}
              </span>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
            Linked Contact
          </span>
        </div>
      )}

      {/* Form Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {!isLinked && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Full Name *</label>
            <input
              type="text"
              {...register(`contacts.${index}.name` as const)}
              placeholder="e.g. Jane Doe"
              className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {itemErrors?.name && (
              <p className="text-[10px] text-rose-500 mt-0.5">{itemErrors.name.message}</p>
            )}
          </div>
        )}

        {!isLinked && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Email Address</label>
            <input
              type="email"
              {...register(`contacts.${index}.email` as const)}
              placeholder="jane@example.com"
              className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {itemErrors?.email && (
              <p className="text-[10px] text-rose-500 mt-0.5">{itemErrors.email.message}</p>
            )}
          </div>
        )}

        {!isLinked && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mobile Number</label>
            <input
              type="tel"
              {...register(`contacts.${index}.mobile` as const)}
              placeholder="+1 (555) 019-2834"
              className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        )}

        {!isLinked && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">LinkedIn Profile</label>
            <input
              type="text"
              {...register(`contacts.${index}.linkedin_url` as const)}
              placeholder="linkedin.com/in/janedoe"
              className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Job Title / Designation</label>
          <input
            type="text"
            {...register(`contacts.${index}.designation` as const)}
            placeholder="e.g. VP of Sales"
            className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
          <select
            {...register(`contacts.${index}.department_id` as const, {
              setValueAs: (v) => (v ? Number(v) : null),
            })}
            className="w-full appearance-none px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium"
          >
            <option value="">Select Department</option>
            {deptLookups?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Reports To (In Company)</label>
          <select
            {...register(`contacts.${index}.reports_to_index` as const, {
              setValueAs: (v) => (v !== '' && v !== null && v !== undefined ? Number(v) : null),
            })}
            className="w-full appearance-none px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium"
          >
            <option value="">None (Top level contact)</option>
            {contactsWatch.map((other, oIdx) => {
              if (oIdx === index) return null;
              const displayName = other.name || `Contact #${oIdx + 1}`;
              return (
                <option key={oIdx} value={oIdx}>
                  {displayName} {other.designation ? `(${other.designation})` : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center pt-5">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="primary-contact-radio"
              checked={Boolean(contact.is_primary)}
              onChange={() => onSetPrimary(index)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-semibold text-slate-700">Primary Contact</span>
          </label>
        </div>
      </div>
    </div>
  );
};
