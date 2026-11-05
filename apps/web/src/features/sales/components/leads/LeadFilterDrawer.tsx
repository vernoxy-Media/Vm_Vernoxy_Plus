import React from 'react';
import { ChevronDown, UserRound } from 'lucide-react';
import { useSalesLeadControllerMasters, useSalesCompanyControllerMasters } from '@vernoxy-pulse/api-client';
import { Drawer } from '../common/Drawer';
import { ChipGroup, FilterSection, PanelFooter, SelectField, TextField } from '../common/FilterFields';
import { PersonPicker } from '../common/PersonPicker';
import { EMPTY_LEAD_MASTERS } from '../../types/sales.types';
import type { SalesLeadMastersResponse, SalesMastersResponse } from '../../types/sales.types';

export interface LeadFilterState {
  lead_by: string; // '' | 'me' | emp_id
  source: string;
  service_fit: string;
  city: string;
  industry: string; // industry id
  follow_up_filter: string; // '' | 'overdue' | 'today' | 'this_week' | 'none'
  date_after: string;
  date_before: string;
  inactive_days: string; // '' | '7' | '15' | '30'
}

export interface LeadFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: LeadFilterState;
  onApply: (filters: LeadFilterState) => void;
  onReset: () => void;
}

const FOLLOW_UP = [
  { id: '', label: 'Any' },
  { id: 'overdue', label: 'Overdue', dot: 'bg-rose-500' },
  { id: 'today', label: 'Due today', dot: 'bg-amber-500' },
  { id: 'this_week', label: 'This week', dot: 'bg-emerald-500' },
  { id: 'none', label: 'None scheduled', dot: 'bg-slate-400' },
];
const INACTIVE = [
  { id: '', label: 'Any' },
  { id: '7', label: '7+ days' },
  { id: '15', label: '15+ days' },
  { id: '30', label: '30+ days' },
];

export const LeadFilterDrawer: React.FC<LeadFilterDrawerProps> = ({ isOpen, onClose, filters, onApply, onReset }) => {
  const [local, setLocal] = React.useState<LeadFilterState>(filters);
  const [pickOpen, setPickOpen] = React.useState(false);

  React.useEffect(() => {
    setLocal(filters);
    setPickOpen(false);
  }, [filters, isOpen]);

  const { data: leadRaw } = useSalesLeadControllerMasters();
  const masters: SalesLeadMastersResponse = (leadRaw as unknown as { data?: SalesLeadMastersResponse })?.data ?? (leadRaw as unknown as SalesLeadMastersResponse) ?? EMPTY_LEAD_MASTERS;
  const { data: compRaw } = useSalesCompanyControllerMasters();
  const company = ((compRaw as unknown as { data?: SalesMastersResponse })?.data ?? (compRaw as unknown as SalesMastersResponse | undefined)) ?? null;

  const set = (key: keyof LeadFilterState, value: string) => setLocal((p) => ({ ...p, [key]: value }));
  const people = masters.lead_by_users ?? [];
  const chosenPerson = /^\d+$/.test(local.lead_by) ? people.find((p) => String(p.emp_id) === local.lead_by) : undefined;
  const count = Object.values(local).filter(Boolean).length;

  const apply = () => {
    onApply(local);
    onClose();
  };
  const reset = () => {
    onReset();
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      subtitle="Narrow down your leads and the board"
      footer={<PanelFooter onReset={reset} onApply={apply} applyLabel="Show results" activeCount={count} />}
    >
      <FilterSection title="Lead owner">
        <ChipGroup
          ariaLabel="Lead owner"
          value={local.lead_by === 'me' ? 'me' : chosenPerson ? 'person' : ''}
          options={[
            { id: '', label: 'Anyone' },
            { id: 'me', label: 'Me' },
            ...(chosenPerson ? [{ id: 'person', label: chosenPerson.name }] : []),
          ]}
          onChange={(id) => {
            if (id === 'person') return;
            set('lead_by', id);
          }}
        />
        <button
          type="button"
          onClick={() => setPickOpen((o) => !o)}
          aria-expanded={pickOpen}
          className="mt-2.5 inline-flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline"
        >
          <UserRound className="h-4 w-4" />
          {chosenPerson ? 'Choose someone else' : 'Choose a person'}
          <ChevronDown className={`h-4 w-4 transition-transform ${pickOpen ? 'rotate-180' : ''}`} />
        </button>
        {pickOpen && (
          <div className="mt-2.5">
            <PersonPicker
              people={people}
              value={chosenPerson ? chosenPerson.emp_id : null}
              onChange={(id) => {
                set('lead_by', String(id));
                setPickOpen(false);
              }}
              autoFocus
            />
          </div>
        )}
      </FilterSection>

      <FilterSection title="Next follow-up">
        <ChipGroup ariaLabel="Next follow-up" options={FOLLOW_UP} value={local.follow_up_filter} onChange={(id) => set('follow_up_filter', id)} />
      </FilterSection>

      <FilterSection title="No conversation for" hint="days since the last one">
        <ChipGroup ariaLabel="Inactivity" options={INACTIVE} value={local.inactive_days} onChange={(id) => set('inactive_days', id)} />
      </FilterSection>

      <FilterSection title="Where it came from">
        <div className="space-y-2.5">
          <SelectField
            ariaLabel="Lead source"
            value={local.source}
            onChange={(v) => set('source', v)}
            placeholder="Any lead source"
            options={(masters.lead_sources ?? []).map((s) => ({ value: s, label: s }))}
          />
          <SelectField
            ariaLabel="Service fit"
            value={local.service_fit}
            onChange={(v) => set('service_fit', v)}
            placeholder="Any service fit"
            options={(masters.service_fits ?? []).map((s) => ({ value: s, label: s }))}
          />
        </div>
      </FilterSection>

      <FilterSection title="Company">
        <div className="space-y-2.5">
          <SelectField
            ariaLabel="Industry"
            value={local.industry}
            onChange={(v) => set('industry', v)}
            placeholder="Any industry"
            options={(company?.industries ?? []).map((i) => ({ value: String(i.id), label: i.name }))}
          />
          <TextField aria-label="City" value={local.city} onChange={(e) => set('city', e.target.value)} placeholder="City, e.g. Surat" />
        </div>
      </FilterSection>

      <FilterSection title="Date added">
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-400">From</span>
            <TextField type="date" value={local.date_after} onChange={(e) => set('date_after', e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-400">To</span>
            <TextField type="date" value={local.date_before} onChange={(e) => set('date_before', e.target.value)} />
          </label>
        </div>
      </FilterSection>
    </Drawer>
  );
};
