import React from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useSalesLeadControllerMasters, useSalesCompanyControllerMasters } from '@vernoxy-pulse/api-client';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Drawer } from '../common/Drawer';
import { ChipGroup, FilterSection, MultiSelectField, PanelFooter, SelectField, TextField } from '../common/FilterFields';
import { EMPTY_LEAD_MASTERS } from '../../types/sales.types';
import type { LeadStatusType, SalesLeadMastersResponse, SalesMastersResponse } from '../../types/sales.types';

/** What the lead list shows by status: Open = New + Contacted + Qualified + On Hold. */
export type LeadStatusFilter = LeadStatusType | 'All' | 'Open';

export interface LeadFilterState {
  lead_by: string; // '' (all) | 'me' | emp_id
  city: string[];
  industry: string[]; // industry ids
  source: string[]; // lead sources
  service_fit: string[];
  follow_up_filter: string; // '' | 'overdue' | 'today' | 'this_week' | 'none'
  /** '' | 'today' | 'this_week' | 'this_month' | 'range' (then date_after / date_before, as YYYY-MM-DD) */
  date_added: string;
  date_after: string;
  date_before: string;
  nature: string[];
  is_gidc: '' | 'yes' | 'no';
  gidc_name: string[];
  website_quality: string[];
  state: string[];
  inactive_days: string; // '' | '7' | '15' | '30'
  lost_reason: string;
}

export const EMPTY_LEAD_FILTERS: LeadFilterState = {
  lead_by: '',
  city: [],
  industry: [],
  source: [],
  service_fit: [],
  follow_up_filter: '',
  date_added: '',
  date_after: '',
  date_before: '',
  nature: [],
  is_gidc: '',
  gidc_name: [],
  website_quality: [],
  state: [],
  inactive_days: '',
  lost_reason: '',
};

/** How many filters are set (a date range, or the pair of dates, counts once). */
export function countLeadFilters(f: LeadFilterState): number {
  return (
    (f.lead_by ? 1 : 0) +
    [f.city, f.industry, f.source, f.service_fit, f.nature, f.gidc_name, f.website_quality, f.state].filter((a) => a.length > 0).length +
    (f.follow_up_filter ? 1 : 0) +
    (f.date_added ? 1 : 0) +
    (f.is_gidc ? 1 : 0) +
    (f.inactive_days ? 1 : 0) +
    (f.lost_reason ? 1 : 0)
  );
}

export interface LeadFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: LeadFilterState;
  status: LeadStatusFilter;
  onApply: (filters: LeadFilterState, status: LeadStatusFilter) => void;
  onReset: () => void;
}

const STATUS: Array<{ id: LeadStatusFilter; label: string; dot?: string }> = [
  { id: 'Open', label: 'Open', dot: 'bg-blue-500' },
  { id: 'New', label: 'New', dot: 'bg-sky-500' },
  { id: 'Contacted', label: 'Contacted', dot: 'bg-amber-500' },
  { id: 'Qualified', label: 'Qualified', dot: 'bg-violet-500' },
  { id: 'On Hold', label: 'On Hold', dot: 'bg-orange-400' },
  { id: 'Converted', label: 'Won', dot: 'bg-emerald-500' },
  { id: 'Lost', label: 'Lost', dot: 'bg-slate-400' },
  { id: 'All', label: 'All' },
];
const FOLLOW_UP = [
  { id: '', label: 'Any' },
  { id: 'today', label: 'Due today', dot: 'bg-amber-500' },
  { id: 'overdue', label: 'Overdue', dot: 'bg-rose-500' },
  { id: 'this_week', label: 'This week', dot: 'bg-emerald-500' },
  { id: 'none', label: 'No follow-up', dot: 'bg-slate-400' },
];
const DATE_ADDED = [
  { id: '', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'range', label: 'Date range' },
];
const INACTIVE = [
  { id: '', label: 'Any' },
  { id: '7', label: '7+ days' },
  { id: '15', label: '15+ days' },
  { id: '30', label: '30+ days' },
];

export const LeadFilterDrawer: React.FC<LeadFilterDrawerProps> = ({ isOpen, onClose, filters, status, onApply, onReset }) => {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.access?.can_manage_organization);
  const [local, setLocal] = React.useState<LeadFilterState>(filters);
  const [localStatus, setLocalStatus] = React.useState<LeadStatusFilter>(status);
  const [moreOpen, setMoreOpen] = React.useState(false);

  // Start from what is in force each time the panel opens; "More filters" opens by itself when one of them is set
  React.useEffect(() => {
    if (!isOpen) return;
    setLocal(filters);
    setLocalStatus(status);
    setMoreOpen(Boolean(filters.date_added || filters.nature.length || filters.is_gidc || filters.gidc_name.length || filters.website_quality.length || filters.state.length || filters.inactive_days || filters.lost_reason));
  }, [isOpen, filters, status]);

  const { data: leadRaw } = useSalesLeadControllerMasters();
  const masters: SalesLeadMastersResponse = (leadRaw as unknown as { data?: SalesLeadMastersResponse })?.data ?? (leadRaw as unknown as SalesLeadMastersResponse) ?? EMPTY_LEAD_MASTERS;
  const { data: compRaw } = useSalesCompanyControllerMasters();
  const company = ((compRaw as unknown as { data?: SalesMastersResponse })?.data ?? (compRaw as unknown as SalesMastersResponse | undefined)) ?? null;

  const set = <K extends keyof LeadFilterState>(key: K, value: LeadFilterState[K]) => setLocal((p) => ({ ...p, [key]: value }));
  const opt = (items?: string[]) => (items ?? []).map((s) => ({ value: s, label: s }));

  const industries = company?.industries ?? [];
  const industryOptions = industries.map((i) => {
    const parent = i.parent_id ? industries.find((p) => p.id === i.parent_id) : null;
    return { value: String(i.id), label: parent ? `${parent.name} › ${i.name}` : i.name };
  });

  // Lead By: the Admin may look at anyone; a Sales user sees only their own leads
  const people = masters.lead_by_users ?? [];
  const chosenPerson = /^\d+$/.test(local.lead_by) ? people.find((p) => String(p.emp_id) === local.lead_by) : undefined;

  const qualities = company?.website_quality?.length ? company.website_quality : ['Good', 'Average', 'Poor', 'No Website'];
  const toggleQuality = (q: string) => set('website_quality', local.website_quality.includes(q) ? local.website_quality.filter((x) => x !== q) : [...local.website_quality, q]);

  const rangeError = local.date_added === 'range' && local.date_after && local.date_before && local.date_after > local.date_before ? '"From" cannot be after "To".' : null;
  const count = countLeadFilters(local) + (localStatus !== 'All' ? 1 : 0);
  const moreCount =
    (local.date_added ? 1 : 0) + (local.nature.length ? 1 : 0) + (local.is_gidc ? 1 : 0) + (local.gidc_name.length ? 1 : 0) +
    (local.website_quality.length ? 1 : 0) + (local.state.length ? 1 : 0) + (local.inactive_days ? 1 : 0) + (local.lost_reason ? 1 : 0);

  const apply = () => {
    if (rangeError) {
      setMoreOpen(true);
      return;
    }
    // The lost reason only means something for Lost leads; the GIDC name only for a GIDC company
    const next: LeadFilterState = {
      ...local,
      lost_reason: localStatus === 'Lost' ? local.lost_reason : '',
      gidc_name: local.is_gidc === 'yes' ? local.gidc_name : [],
      date_after: local.date_added === 'range' ? local.date_after : '',
      date_before: local.date_added === 'range' ? local.date_before : '',
    };
    onApply(next, localStatus);
    onClose();
  };
  const reset = () => {
    setLocal(EMPTY_LEAD_FILTERS);
    setLocalStatus('All');
    onReset();
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      subtitle="A lead is shown only when it matches every filter you set"
      footer={<PanelFooter onReset={reset} onApply={apply} applyLabel="Show results" activeCount={count} />}
      size="lg"
    >
      {/* ───── Always shown ───── */}
      <FilterSection title="Status" hint="Open = New, Contacted, Qualified, On Hold">
        <ChipGroup ariaLabel="Status" options={STATUS} value={localStatus} onChange={(id) => setLocalStatus((id || 'All') as LeadStatusFilter)} />
      </FilterSection>

      <FilterSection title="Lead by" hint={isAdmin ? undefined : 'You see your own leads'}>
        {isAdmin ? (
          <div className="space-y-2.5">
            <ChipGroup
              ariaLabel="Lead by"
              value={local.lead_by === 'me' ? 'me' : chosenPerson ? 'person' : ''}
              options={[
                { id: '', label: 'All' },
                { id: 'me', label: 'Me' },
                ...(chosenPerson ? [{ id: 'person', label: chosenPerson.name }] : []),
              ]}
              onChange={(id) => {
                if (id === 'person') return;
                set('lead_by', id);
              }}
            />
            <SelectField
              ariaLabel="Choose a user"
              value={chosenPerson ? String(chosenPerson.emp_id) : ''}
              onChange={(v) => set('lead_by', v || '')}
              placeholder="Or choose a user"
              options={people.map((p) => ({ value: String(p.emp_id), label: p.name }))}
            />
          </div>
        ) : (
          <ChipGroup ariaLabel="Lead by" value="me" options={[{ id: 'me', label: 'Me' }]} onChange={() => undefined} />
        )}
      </FilterSection>

      <FilterSection title="City" hint="from the company">
        <MultiSelectField ariaLabel="City" value={local.city} onChange={(v) => set('city', v)} placeholder="All cities" options={opt(company?.cities)} />
      </FilterSection>

      <FilterSection title="Industry" hint="from the company">
        <MultiSelectField ariaLabel="Industry" value={local.industry} onChange={(v) => set('industry', v)} placeholder="All industries" options={industryOptions} />
      </FilterSection>

      <FilterSection title="Lead source">
        <MultiSelectField ariaLabel="Lead source" value={local.source} onChange={(v) => set('source', v)} placeholder="All lead sources" options={opt(masters.lead_sources)} />
      </FilterSection>

      <FilterSection title="Service fit">
        <MultiSelectField ariaLabel="Service fit" value={local.service_fit} onChange={(v) => set('service_fit', v)} placeholder="All service fits" options={opt(masters.service_fits)} />
      </FilterSection>

      <FilterSection title="Follow-up">
        <ChipGroup ariaLabel="Follow-up" options={FOLLOW_UP} value={local.follow_up_filter} onChange={(id) => set('follow_up_filter', id)} />
      </FilterSection>

      {/* ───── More filters ───── */}
      <div className="mt-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((o) => !o)}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50"
        >
          <SlidersHorizontal className="h-4 w-4 text-slate-500" />
          <span className="flex-1 text-sm font-semibold text-slate-800">More filters</span>
          {moreCount > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{moreCount}</span>}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
        </button>

        {moreOpen && (
          <div className="mt-4 space-y-5">
            <FilterSection title="Date added">
              <ChipGroup ariaLabel="Date added" options={DATE_ADDED} value={local.date_added} onChange={(id) => set('date_added', id)} />
              {local.date_added === 'range' && (
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-400">From</span>
                    <TextField type="date" max={local.date_before || undefined} value={local.date_after} onChange={(e) => set('date_after', e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-400">To</span>
                    <TextField type="date" min={local.date_after || undefined} value={local.date_before} onChange={(e) => set('date_before', e.target.value)} />
                  </label>
                </div>
              )}
              {rangeError && <p role="alert" className="mt-2 text-[13px] text-rose-600">{rangeError}</p>}
            </FilterSection>

            <FilterSection title="Nature of business" hint="from the company">
              <MultiSelectField ariaLabel="Nature of business" value={local.nature} onChange={(v) => set('nature', v)} placeholder="All types of business" options={opt(company?.nature_of_business)} />
            </FilterSection>

            <FilterSection title="Is GIDC?">
              <ChipGroup
                ariaLabel="Is GIDC"
                value={local.is_gidc}
                options={[{ id: '', label: 'All' }, { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]}
                onChange={(id) => setLocal((p) => ({ ...p, is_gidc: id as LeadFilterState['is_gidc'], gidc_name: [] }))}
              />
              {local.is_gidc === 'yes' && (
                <div className="mt-2.5">
                  <MultiSelectField ariaLabel="GIDC name" value={local.gidc_name} onChange={(v) => set('gidc_name', v)} placeholder="Any GIDC" options={opt(company?.gidc_names)} />
                </div>
              )}
            </FilterSection>

            <FilterSection title="Website quality" hint="pick one or many">
              <div className="flex flex-wrap gap-2">
                {qualities.map((q) => {
                  const on = local.website_quality.includes(q);
                  return (
                    <button
                      key={q}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleQuality(q)}
                      className={`inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition-all ${
                        on ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/15' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title="State">
              <MultiSelectField ariaLabel="State" value={local.state} onChange={(v) => set('state', v)} placeholder="All states" options={opt(company?.states)} />
            </FilterSection>

            <FilterSection title="Last conversation" hint="no conversation in the last…">
              <ChipGroup ariaLabel="Last conversation" options={INACTIVE} value={local.inactive_days} onChange={(id) => set('inactive_days', id)} />
            </FilterSection>

            {localStatus === 'Lost' && (
              <FilterSection title="Lost reason">
                <SelectField ariaLabel="Lost reason" value={local.lost_reason} onChange={(v) => set('lost_reason', v)} placeholder="Any reason" options={opt(masters.lost_reasons)} />
              </FilterSection>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
};
