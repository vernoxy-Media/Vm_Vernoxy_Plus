import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { useClientList, type ClientListItem } from '@/features/sales/hooks/useClientList';
import { TemplateEditor } from '../components/TemplateEditor';
import type { QuotationTestValues } from '../types';

const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

const inputCls =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 transition focus:border-blue-500 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10';

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; wide?: boolean }> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  wide,
}) => (
  <label className={`block text-[11px] font-medium text-slate-500 ${wide ? 'sm:col-span-2' : ''}`}>
    {label}
    <input className={`${inputCls} mt-1`} type={type} value={value} placeholder={placeholder} maxLength={200} onChange={(e) => onChange(e.target.value)} />
  </label>
);

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function locationOf(c: ClientListItem): string {
  return [c.company.city, c.company.state].filter(Boolean).join(', ');
}

/**
 * Search won clients and fill company, Kind Attn and location. A name that is not in the list can still be used.
 */
const ClientCombobox: React.FC<{
  company: string;
  onPickClient: (c: ClientListItem) => void;
  onPickName: (name: string) => void;
}> = ({ company, onPickClient, onPickName }) => {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const debounced = useDebounced(open ? query : '', 250);
  const list = useClientList({ q: debounced.trim() || undefined, sort: 'name', order: 'asc', page: 1, limit: 50 });
  const items = list.data?.items ?? [];
  const q = query.trim().toLowerCase();
  const exact = items.some((c) => c.company.name.toLowerCase() === q);
  const failed = list.isError;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (failed) {
    return (
      <label className="block text-[11px] font-medium text-slate-500 sm:col-span-2">
        Client
        <input className={`${inputCls} mt-1`} value={company} maxLength={200} placeholder="Type the company name" onChange={(e) => onPickName(e.target.value)} />
        <span className="mt-1 block text-[11px] font-normal text-slate-400">The client list is not available, so type the name.</span>
      </label>
    );
  }

  const rows: Array<{ kind: 'client'; client: ClientListItem } | { kind: 'new'; name: string }> = [
    ...items.map((client) => ({ kind: 'client' as const, client })),
    ...(q && !exact ? [{ kind: 'new' as const, name: query.trim() }] : []),
  ];

  const chooseClient = (c: ClientListItem) => {
    onPickClient(c);
    setQuery('');
    setOpen(false);
  };
  const chooseName = (name: string) => {
    onPickName(name);
    setQuery('');
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(rows.length - 1, i + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    }
    if (e.key === 'Enter' && open && rows[active]) {
      e.preventDefault();
      const r = rows[active];
      if (r.kind === 'client') chooseClient(r.client);
      else chooseName(r.name);
    }
  };

  return (
    <label className="block text-[11px] font-medium text-slate-500 sm:col-span-2">
      Client
      <div ref={root} className="relative mt-1">
        <input
          className={`${inputCls} pr-8`}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={open ? query : company}
          placeholder={list.isLoading && !list.data ? 'Loading clients…' : 'Search clients'}
          onFocus={() => {
            setQuery('');
            setOpen(true);
            setActive(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKey}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
          {list.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
        </span>
        {open && (
          <div role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {!list.isFetching && rows.length === 0 && (
              <p className="px-3 py-3 text-center text-[12px] font-normal text-slate-500">
                {list.data && list.data.total === 0 && !debounced.trim() ? 'No clients yet — type the company name.' : 'No client matches your search.'}
              </p>
            )}
            {rows.map((r, i) => (
              <button
                key={r.kind === 'client' ? r.client.client_id : `new-${r.name}`}
                type="button"
                role="option"
                aria-selected={i === active}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] ${i === active ? 'bg-slate-50' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => (r.kind === 'client' ? chooseClient(r.client) : chooseName(r.name))}
              >
                {r.kind === 'client' ? (
                  <>
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{r.client.company.name}</span>
                    {r.client.client_code && <span className="shrink-0 text-[11px] text-slate-400">{r.client.client_code}</span>}
                  </>
                ) : (
                  <span className="text-slate-600">Use “{r.name}” as the company name</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
};

/**
 * Settings → Quotation Template (Admin). The cover page design is edited on the left; on the right
 * pick a client, a service and who prepared it (or type the details) to test the page.
 */
export const QuotationTemplatePage: React.FC = () => {
  const { user } = useAuth();
  const today = todayIST();
  const { data: services = [] } = useLookupsQuery('service_fit');
  const { data: employees = [] } = useEmployeeOptionsQuery();
  const [values, setValues] = useState<QuotationTestValues>(() => ({
    service_name: 'ERP / CRM',
    attention_name: '',
    client_company: '',
    location: '',
    qt_number: '001',
    revision: '00',
    date: today,
    offer_number: '',
    prepared_by: { name: user?.name ?? '', date: today, email: user?.email ?? '', contact: user?.mob ?? '' },
  }));

  const set = (patch: Partial<QuotationTestValues>) => setValues((v) => ({ ...v, ...patch }));
  const setPrep = (patch: Partial<QuotationTestValues['prepared_by']>) => setValues((v) => ({ ...v, prepared_by: { ...v.prepared_by, ...patch } }));
  const subject = useMemo(() => ({ ...values }) as unknown as Record<string, unknown>, [values]);

  const serviceMatch = services.some((s) => s.label === values.service_name);
  const prepMatch = employees.find((e) => e.email === values.prepared_by.email && e.name === values.prepared_by.name);

  return (
    <TemplateEditor
      kind="sales_quotation"
      heading="Quotation Template"
      intro="Design the quotation cover page: logo, photo, texts and tiles. Pick a client and a service on the right to try it, or type the details."
      documentsName="quotations"
      subject={subject}
      printLabel="Print test cover"
      testToolbar={<span className="text-[12px] font-medium text-slate-600">Test details</span>}
      testPanel={
        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
          <ClientCombobox
            company={values.client_company}
            onPickClient={(c) =>
              set({
                client_company: c.company.name,
                location: locationOf(c),
                attention_name: c.contact?.name ?? '',
              })
            }
            onPickName={(name) => set({ client_company: name })}
          />
          <Field label="Client company" value={values.client_company} onChange={(v) => set({ client_company: v })} placeholder="Acme Industries Pvt. Ltd." />
          <Field label="Kind Attn (person)" value={values.attention_name} onChange={(v) => set({ attention_name: v })} placeholder="Mr. Rajesh Patel" />
          <Field label="Location" value={values.location} onChange={(v) => set({ location: v })} placeholder="Ahmedabad, Gujarat" />

          {services.length > 0 ? (
            <label className="block text-[11px] font-medium text-slate-500">
              Service
              <select
                className={`${inputCls} mt-1`}
                value={serviceMatch ? values.service_name : ''}
                onChange={(e) => set({ service_name: e.target.value })}
              >
                <option value="">Type a name below, or pick…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Field label={services.length > 0 ? 'Service name' : 'Service'} value={values.service_name} onChange={(v) => set({ service_name: v })} placeholder="ERP / CRM" />

          <Field label="Quotation number" value={values.qt_number} onChange={(v) => set({ qt_number: v })} />
          <Field label="Revision" value={values.revision} onChange={(v) => set({ revision: v })} />
          <Field label="Date" type="date" value={values.date} onChange={(v) => set({ date: v })} />
          <Field
            label="Offer number"
            value={values.offer_number}
            onChange={(v) => set({ offer_number: v })}
            placeholder="Empty = made from client, service, month, number, revision"
          />
          <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:col-span-2">Prepared By</p>
          {employees.length > 0 ? (
            <label className="block text-[11px] font-medium text-slate-500 sm:col-span-2">
              Employee
              <select
                className={`${inputCls} mt-1`}
                value={prepMatch ? String(prepMatch.emp_id) : ''}
                onChange={(e) => {
                  const emp = employees.find((x) => String(x.emp_id) === e.target.value);
                  if (emp) setPrep({ name: emp.name, email: emp.email });
                }}
              >
                <option value="">Choose an employee…</option>
                {employees.map((e) => (
                  <option key={e.emp_id} value={e.emp_id}>
                    {e.name}
                    {e.employee_code ? ` (${e.employee_code})` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Field label="Name" value={values.prepared_by.name} onChange={(v) => setPrep({ name: v })} />
          <Field label="Date" type="date" value={values.prepared_by.date} onChange={(v) => setPrep({ date: v })} />
          <Field label="Email" value={values.prepared_by.email} onChange={(v) => setPrep({ email: v })} />
          <Field label="Contact number" value={values.prepared_by.contact} onChange={(v) => setPrep({ contact: v })} />
        </div>
      }
    />
  );
};

export default QuotationTemplatePage;
