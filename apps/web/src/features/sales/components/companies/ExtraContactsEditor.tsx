import React from 'react';
import { Plus, Trash2, Mail, Phone, UserRound } from 'lucide-react';
import { getAvatarColor, getInitials } from '../../utils/formatters';

export interface ExtraContact {
  /** Only used as a React key. */
  key: number;
  name: string;
  designation: string;
  mobile: string;
  email: string;
}

export interface ExtraContactsEditorProps {
  value: ExtraContact[];
  onChange: (next: ExtraContact[]) => void;
  designations?: string[];
  /** Contacts the company already has besides the primary one (edit mode); shown as a read-only list. */
  existing?: Array<{ name: string; designation?: string | null; mobile?: string | null; email?: string | null }>;
  /** Message per row, by index. */
  errors?: Record<number, string>;
}

const INPUT =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20';

let nextKey = 1;
export const newExtraContact = (): ExtraContact => ({ key: nextKey++, name: '', designation: '', mobile: '', email: '' });

/** "More people at this company": add as many contacts as needed without leaving the form. */
export const ExtraContactsEditor: React.FC<ExtraContactsEditorProps> = ({ value, onChange, designations = [], existing = [], errors = {} }) => {
  const patch = (index: number, p: Partial<ExtraContact>) => onChange(value.map((c, i) => (i === index ? { ...c, ...p } : c)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Other contacts <span className="ml-1 rounded-full bg-slate-100 px-2 py-px text-xs font-medium text-slate-500">{existing.length + value.length}</span>
        </h3>
      </div>

      {existing.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50">
          {existing.map((c, i) => (
            <li key={`${c.name}-${i}`} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(c.name)}`}>{getInitials(c.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {c.name}
                  {c.designation && <span className="ml-2 text-xs font-normal text-slate-500">{c.designation}</span>}
                </p>
                <p className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                  {c.mobile && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {c.mobile}
                    </span>
                  )}
                  {c.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {c.email}
                    </span>
                  )}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">Saved</span>
            </li>
          ))}
        </ul>
      )}

      {value.map((c, i) => (
        <div key={c.key} className={`rounded-xl border bg-white p-4 shadow-2xs ${errors[i] ? 'border-red-300' : 'border-slate-200'}`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <UserRound className="h-3.5 w-3.5" />
              </span>
              Contact {existing.length + i + 2}
            </span>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label="Remove this contact"
              title="Remove"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="text" value={c.name} onChange={(e) => patch(i, { name: e.target.value })} placeholder="Name *" aria-label="Contact name" aria-invalid={errors[i] && !c.name.trim() ? true : undefined} className={INPUT} />
            <input type="text" value={c.designation} onChange={(e) => patch(i, { designation: e.target.value })} placeholder="Designation / role" aria-label="Designation" list="extra-contact-designations" className={INPUT} />
            <input type="tel" value={c.mobile} onChange={(e) => patch(i, { mobile: e.target.value })} placeholder="Mobile (10 digits)" aria-label="Mobile" className={INPUT} />
            <input type="email" value={c.email} onChange={(e) => patch(i, { email: e.target.value })} placeholder="Email" aria-label="Email" className={INPUT} />
          </div>
          {errors[i] && <p className="mt-2 text-xs font-medium text-red-600">{errors[i]}</p>}
        </div>
      ))}

      <datalist id="extra-contact-designations">
        {designations.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={() => onChange([...value, newExtraContact()])}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 text-sm font-semibold text-slate-600 transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Add another contact
      </button>
    </div>
  );
};
