import React from 'react';
import { useSalesCompanyControllerMasters } from '@vernoxy-pulse/api-client';
import { Drawer } from '../common/Drawer';
import { ChipGroup, FilterSection, MultiSelectField, PanelFooter, TextField } from '../common/FilterFields';
import type { SalesCompanyControllerListParams, SalesMastersResponse } from '../../types/sales.types';

export interface CompanyFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SalesCompanyControllerListParams;
  /** Optional: when the page already has the masters. Otherwise the drawer loads them itself. */
  masters?: SalesMastersResponse;
  onApply: (filters: Partial<SalesCompanyControllerListParams>) => void;
  onReset: () => void;
}

type Local = SalesCompanyControllerListParams;

const LEAD_STATUS = [
  { id: 'all', label: 'All companies' },
  { id: 'open', label: 'Open leads', dot: 'bg-blue-500' },
  { id: 'not_a_lead', label: 'Not a lead', dot: 'bg-slate-400' },
  { id: 'client', label: 'Client', dot: 'bg-emerald-500' },
  { id: 'lost', label: 'Lost', dot: 'bg-rose-500' },
];

/** A filter value that may hold one or many entries (the API takes a comma separated list). */
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

export const CompanyFilterDrawer: React.FC<CompanyFilterDrawerProps> = ({ isOpen, onClose, filters, masters: given, onApply, onReset }) => {
  const [local, setLocal] = React.useState<Local>({ ...filters });

  // Start from the filters in force each time the panel opens (a reset elsewhere must show here too)
  React.useEffect(() => {
    if (isOpen) setLocal({ ...filters });
  }, [isOpen, filters]);

  const { data: raw } = useSalesCompanyControllerMasters({ query: { enabled: !given } });
  const masters = given ?? ((raw as unknown as { data?: SalesMastersResponse })?.data ?? (raw as unknown as SalesMastersResponse | undefined));

  const set = (key: keyof Local, value: unknown) =>
    setLocal((p) => {
      const next = { ...p } as Record<string, unknown>;
      if (value === '' || value === undefined || (Array.isArray(value) && value.length === 0)) delete next[key];
      else next[key] = value;
      return next as Local;
    });

  const industries = masters?.industries ?? [];
  const industryOptions = industries.map((i) => {
    const parent = i.parent_id ? industries.find((p) => p.id === i.parent_id) : null;
    return { value: String(i.id), label: parent ? `${parent.name} › ${i.name}` : i.name };
  });
  const options = (items?: string[]) => (items ?? []).map((s) => ({ value: s, label: s }));

  const gidcNames = list(local.gidc_name);
  const areaMap = masters?.gidc_area_map ?? {};
  const areaItems = gidcNames.length
    ? Array.from(new Set([...gidcNames.flatMap((n) => areaMap[n] ?? []), ...(masters?.gidc_common_areas ?? [])]))
    : masters?.gidc_areas ?? [];

  const qualities = masters?.website_quality?.length ? masters.website_quality : ['Good', 'Average', 'Poor', 'No Website'];
  const chosenQualities = list(local.website_quality);

  const minEmp = local.employees_min;
  const maxEmp = local.employees_max;
  const rangeError = minEmp !== undefined && maxEmp !== undefined && Number(minEmp) > Number(maxEmp) ? 'Min Employees cannot be more than Max Employees.' : null;

  const count = Object.entries(local).filter(([k, v]) => k !== 'lead' || v !== 'all').filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)).length;

  const apply = () => {
    if (rangeError) return;
    onApply(local);
    onClose();
  };
  const reset = () => {
    setLocal({});
    onReset();
    onClose();
  };

  const toggleQuality = (q: string) => {
    const on = chosenQualities.includes(q);
    set('website_quality', (on ? chosenQualities.filter((x) => x !== q) : [...chosenQualities, q]).join(','));
  };

  const Toggle: React.FC<{ on: boolean; label: string; onClick: () => void }> = ({ on, label, onClick }) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition-all ${
        on ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/15' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Companies"
      subtitle="Narrow down the companies list"
      footer={<PanelFooter onReset={reset} onApply={apply} applyLabel="Apply filters" activeCount={count} />}
      size="lg"
    >
      <FilterSection title="Lead status">
        <ChipGroup ariaLabel="Lead status" options={LEAD_STATUS} value={local.lead ?? 'all'} onChange={(id) => set('lead', id || 'all')} />
      </FilterSection>

      <FilterSection title="Location">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <MultiSelectField ariaLabel="State" value={list(local.state)} onChange={(v) => set('state', v)} placeholder="All states" options={options(masters?.states)} />
          <MultiSelectField ariaLabel="City" value={list(local.city)} onChange={(v) => set('city', v)} placeholder="All cities" options={options(masters?.cities)} />
        </div>
      </FilterSection>

      <FilterSection title="Business">
        <div className="space-y-2.5">
          <MultiSelectField
            ariaLabel="Industry"
            value={Array.isArray(local.industry_ids) ? local.industry_ids.map(String) : []}
            onChange={(v) => set('industry_ids', v.map(Number))}
            placeholder="All industries"
            options={industryOptions}
          />
          <MultiSelectField
            ariaLabel="Nature of business"
            value={list(local.nature_of_business)}
            onChange={(v) => set('nature_of_business', v)}
            placeholder="All types of business"
            options={options(masters?.nature_of_business)}
          />
        </div>
      </FilterSection>

      <FilterSection title="Located in GIDC?">
        <ChipGroup
          ariaLabel="Located in GIDC"
          value={local.is_gidc === true ? 'yes' : local.is_gidc === false ? 'no' : ''}
          options={[
            { id: '', label: 'Any' },
            { id: 'yes', label: 'Yes' },
            { id: 'no', label: 'No' },
          ]}
          onChange={(id) =>
            setLocal((p) => {
              const next = { ...p } as Record<string, unknown>;
              delete next.gidc_name;
              delete next.gidc_area_phase;
              if (id === 'yes') next.is_gidc = true;
              else if (id === 'no') next.is_gidc = false;
              else delete next.is_gidc;
              return next as Local;
            })
          }
        />
        {local.is_gidc === true && (
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <MultiSelectField
              ariaLabel="GIDC name"
              value={gidcNames}
              onChange={(v) =>
                setLocal((p) => {
                  const next = { ...p } as Record<string, unknown>;
                  // keep only the areas that still belong to a chosen GIDC
                  const allowed = new Set(v.length ? [...v.flatMap((n) => areaMap[n] ?? []), ...(masters?.gidc_common_areas ?? [])] : (masters?.gidc_areas ?? []));
                  const keep = list(next.gidc_area_phase).filter((x) => allowed.has(x));
                  if (keep.length) next.gidc_area_phase = keep;
                  else delete next.gidc_area_phase;
                  if (v.length) next.gidc_name = v;
                  else delete next.gidc_name;
                  return next as Local;
                })
              }
              placeholder="Any GIDC"
              options={options(masters?.gidc_names)}
            />
            <MultiSelectField
              ariaLabel="Area or phase"
              value={list(local.gidc_area_phase)}
              onChange={(v) => set('gidc_area_phase', v)}
              placeholder="Any area / phase"
              options={options(areaItems)}
            />
          </div>
        )}
      </FilterSection>

      <FilterSection title="Website quality" hint="pick one or more">
        <div className="flex flex-wrap gap-2">
          {qualities.map((q) => (
            <Toggle key={q} on={chosenQualities.includes(q)} label={q} onClick={() => toggleQuality(q)} />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Employees">
        <div className="grid grid-cols-2 gap-2.5">
          <TextField type="number" min={0} inputMode="numeric" aria-label="Min employees" placeholder="Min" value={minEmp ?? ''} onChange={(e) => set('employees_min', e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))} />
          <TextField type="number" min={0} inputMode="numeric" aria-label="Max employees" placeholder="Max" value={maxEmp ?? ''} onChange={(e) => set('employees_max', e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))} />
        </div>
        {rangeError && <p role="alert" className="mt-2 text-[13px] text-rose-600">{rangeError}</p>}
      </FilterSection>

      <FilterSection title="Has">
        <div className="flex flex-wrap gap-2">
          <Toggle on={local.has_website === true} label="Website" onClick={() => set('has_website', local.has_website === true ? undefined : true)} />
          <Toggle on={local.has_brochure === true} label="Brochure" onClick={() => set('has_brochure', local.has_brochure === true ? undefined : true)} />
        </div>
      </FilterSection>
    </Drawer>
  );
};
