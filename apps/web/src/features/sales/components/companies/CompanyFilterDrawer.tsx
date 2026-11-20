import React from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useSalesCompanyControllerMasters, useSalesLeadControllerMasters } from '@vernoxy-pulse/api-client';
import { Drawer } from '../common/Drawer';
import { ChipGroup, FilterSection, MultiSelectField, PanelFooter, SelectField, TextField } from '../common/FilterFields';
import { EMPTY_LEAD_MASTERS } from '../../types/sales.types';
import type { SalesCompanyControllerListParams, SalesLeadMastersResponse, SalesMastersResponse } from '../../types/sales.types';

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
  { id: 'all', label: 'All' },
  { id: 'not_a_lead', label: 'Not a lead', dot: 'bg-slate-400' },
  { id: 'open', label: 'Open lead', dot: 'bg-blue-500' },
  { id: 'client', label: 'Client', dot: 'bg-emerald-500' },
  { id: 'lost', label: 'Lost', dot: 'bg-rose-500' },
];
const YES_NO_ANY = [
  { id: '', label: 'Any' },
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
];

/** Filters that live under "More filters". */
const MORE_KEYS = [
  'state', 'country', 'gidc_name', 'gidc_area_phase', 'designation',
  'employees_min', 'employees_max', 'turnover_min', 'turnover_max', 'year_min', 'year_max',
  'has_website', 'has_brochure', 'added_by', 'added_from', 'added_to',
] as const;

/** A filter value that may hold one or many entries (the API takes a comma separated list). */
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);
const tri = (v: unknown): string => (v === true ? 'yes' : v === false ? 'no' : '');
const isSet = (v: unknown) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
const num = (v: unknown): number | undefined => (v === undefined || v === null || v === '' ? undefined : Number(v));
const rupees = (n?: number) => (n === undefined || Number.isNaN(n) ? '' : `₹ ${n.toLocaleString('en-IN')}`);

/** One "From – To" pair of number boxes. */
const RangeFields: React.FC<{
  label: string;
  min: unknown;
  max: unknown;
  onMin: (v: number | undefined) => void;
  onMax: (v: number | undefined) => void;
  minPlaceholder: string;
  maxPlaceholder: string;
  hint?: React.ReactNode;
  error?: string | null;
}> = ({ label, min, max, onMin, onMax, minPlaceholder, maxPlaceholder, hint, error }) => (
  <div>
    <div className="mb-1.5 text-[13px] font-semibold text-slate-700">{label}</div>
    <div className="grid grid-cols-2 gap-2.5">
      <TextField type="number" min={0} inputMode="numeric" aria-label={`${label} from`} placeholder={minPlaceholder} value={min === undefined ? '' : String(min)} onChange={(e) => onMin(e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))} />
      <TextField type="number" min={0} inputMode="numeric" aria-label={`${label} to`} placeholder={maxPlaceholder} value={max === undefined ? '' : String(max)} onChange={(e) => onMax(e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))} />
    </div>
    {hint && <p className="mt-1 text-[12px] text-slate-400">{hint}</p>}
    {error && <p role="alert" className="mt-1 text-[13px] text-rose-600">{error}</p>}
  </div>
);

export const CompanyFilterDrawer: React.FC<CompanyFilterDrawerProps> = ({ isOpen, onClose, filters, masters: given, onApply, onReset }) => {
  const [local, setLocal] = React.useState<Local>({ ...filters });
  const [moreOpen, setMoreOpen] = React.useState(false);

  // Start from the filters in force each time the panel opens; "More filters" opens by itself when one of them is set
  React.useEffect(() => {
    if (!isOpen) return;
    setLocal({ ...filters });
    setMoreOpen(MORE_KEYS.some((k) => isSet((filters as Record<string, unknown>)[k])));
  }, [isOpen, filters]);

  const { data: raw } = useSalesCompanyControllerMasters({ query: { enabled: !given } });
  const masters = given ?? ((raw as unknown as { data?: SalesMastersResponse })?.data ?? (raw as unknown as SalesMastersResponse | undefined));
  const { data: leadRaw } = useSalesLeadControllerMasters();
  const leadMasters: SalesLeadMastersResponse =
    (leadRaw as unknown as { data?: SalesLeadMastersResponse })?.data ?? (leadRaw as unknown as SalesLeadMastersResponse) ?? EMPTY_LEAD_MASTERS;

  const get = (k: string) => (local as Record<string, unknown>)[k];
  const set = (key: string, value: unknown) =>
    setLocal((p) => {
      const next = { ...p } as Record<string, unknown>;
      if (!isSet(value)) delete next[key];
      else next[key] = value;
      return next as Local;
    });

  const industries = masters?.industries ?? [];
  const industryOptions = industries.map((i) => {
    const parent = i.parent_id ? industries.find((p) => p.id === i.parent_id) : null;
    return { value: String(i.id), label: parent ? `${parent.name} › ${i.name}` : i.name };
  });
  const options = (items?: string[]) => (items ?? []).map((s) => ({ value: s, label: s }));

  const gidcNames = list(get('gidc_name'));
  const areaMap = masters?.gidc_area_map ?? {};
  const areaItems = gidcNames.length
    ? Array.from(new Set([...gidcNames.flatMap((n) => areaMap[n] ?? []), ...(masters?.gidc_common_areas ?? [])]))
    : masters?.gidc_areas ?? [];

  const qualities = masters?.website_quality?.length ? masters.website_quality : ['Good', 'Average', 'Poor', 'No Website'];
  const chosenQualities = list(get('website_quality'));
  const toggleQuality = (q: string) => set('website_quality', (chosenQualities.includes(q) ? chosenQualities.filter((x) => x !== q) : [...chosenQualities, q]).join(','));

  // Checks that stop Apply: a range the wrong way round, an impossible year, dates back to front
  const thisYear = new Date().getFullYear();
  const errors = {
    employees: num(get('employees_min')) !== undefined && num(get('employees_max')) !== undefined && num(get('employees_min'))! > num(get('employees_max'))! ? 'The first number cannot be more than the second.' : null,
    turnover: num(get('turnover_min')) !== undefined && num(get('turnover_max')) !== undefined && num(get('turnover_min'))! > num(get('turnover_max'))! ? 'The first amount cannot be more than the second.' : null,
    year:
      (num(get('year_min')) !== undefined && (num(get('year_min'))! < 1800 || num(get('year_min'))! > thisYear)) || (num(get('year_max')) !== undefined && (num(get('year_max'))! < 1800 || num(get('year_max'))! > thisYear))
        ? `Enter a year between 1800 and ${thisYear}.`
        : num(get('year_min')) !== undefined && num(get('year_max')) !== undefined && num(get('year_min'))! > num(get('year_max'))!
          ? 'The first year cannot be later than the second.'
          : null,
    added: get('added_from') && get('added_to') && String(get('added_from')) > String(get('added_to')) ? '"From" cannot be after "To".' : null,
  };
  const hasError = Object.values(errors).some(Boolean);

  // Counts: a From-To pair is one filter
  const pair = (a: string, b: string) => (isSet(get(a)) || isSet(get(b)) ? 1 : 0);
  const moreCount =
    ['state', 'country', 'gidc_name', 'gidc_area_phase', 'designation', 'has_website', 'has_brochure', 'added_by'].filter((k) => isSet(get(k))).length +
    pair('employees_min', 'employees_max') + pair('turnover_min', 'turnover_max') + pair('year_min', 'year_max') + pair('added_from', 'added_to');
  const mainCount =
    (get('lead') && get('lead') !== 'all' ? 1 : 0) +
    ['city', 'industry_ids', 'nature_of_business', 'is_gidc', 'website_quality'].filter((k) => isSet(get(k))).length;
  const count = mainCount + moreCount;

  const apply = () => {
    if (hasError) {
      setMoreOpen(true);
      return;
    }
    onApply(local);
    onClose();
  };
  const reset = () => {
    setLocal({});
    onReset();
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Companies"
      subtitle="A company is shown only when it matches every filter you set"
      footer={<PanelFooter onReset={reset} onApply={apply} applyLabel="Apply filters" activeCount={count} />}
      size="lg"
    >
      {/* ───── Always shown ───── */}
      <FilterSection title="Lead">
        <ChipGroup ariaLabel="Lead" options={LEAD_STATUS} value={(get('lead') as string) ?? 'all'} onChange={(id) => set('lead', id || 'all')} />
      </FilterSection>

      <FilterSection title="City" hint="pick one or many">
        <MultiSelectField ariaLabel="City" value={list(get('city'))} onChange={(v) => set('city', v)} placeholder="All cities" options={options(masters?.cities)} />
      </FilterSection>

      <FilterSection title="Industry" hint="pick one or many">
        <MultiSelectField
          ariaLabel="Industry"
          value={Array.isArray(get('industry_ids')) ? (get('industry_ids') as unknown[]).map(String) : list(get('industry_ids'))}
          onChange={(v) => set('industry_ids', v.map(Number))}
          placeholder="All industries"
          options={industryOptions}
        />
      </FilterSection>

      <FilterSection title="Nature of business" hint="pick one or many">
        <MultiSelectField ariaLabel="Nature of business" value={list(get('nature_of_business'))} onChange={(v) => set('nature_of_business', v)} placeholder="All types of business" options={options(masters?.nature_of_business)} />
      </FilterSection>

      <FilterSection title="Is GIDC?">
        <ChipGroup
          ariaLabel="Is GIDC"
          value={tri(get('is_gidc'))}
          options={[{ id: '', label: 'All' }, { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]}
          onChange={(id) =>
            setLocal((p) => {
              const next = { ...p } as Record<string, unknown>;
              // The GIDC name and area only mean something for a GIDC company
              delete next.gidc_name;
              delete next.gidc_area_phase;
              if (id === 'yes') next.is_gidc = true;
              else if (id === 'no') next.is_gidc = false;
              else delete next.is_gidc;
              return next as Local;
            })
          }
        />
      </FilterSection>

      <FilterSection title="Website quality" hint="pick one or many">
        <div className="flex flex-wrap gap-2">
          {qualities.map((q) => {
            const on = chosenQualities.includes(q);
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
            <FilterSection title="State and country">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <MultiSelectField ariaLabel="State" value={list(get('state'))} onChange={(v) => set('state', v)} placeholder="All states" options={options(masters?.states)} />
                <MultiSelectField ariaLabel="Country" value={list(get('country'))} onChange={(v) => set('country', v)} placeholder="All countries" options={options(masters?.countries)} />
              </div>
            </FilterSection>

            {get('is_gidc') === true && (
              <FilterSection title="GIDC" hint="pick a GIDC, then its areas">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                  <MultiSelectField ariaLabel="Area or phase" value={list(get('gidc_area_phase'))} onChange={(v) => set('gidc_area_phase', v)} placeholder="Any area / phase" options={options(areaItems)} />
                </div>
              </FilterSection>
            )}

            <FilterSection title="Designation of a contact" hint="companies that have a contact with it">
              <MultiSelectField ariaLabel="Designation" value={list(get('designation'))} onChange={(v) => set('designation', v)} placeholder="Any designation, e.g. IT Head" options={options(masters?.designation)} />
            </FilterSection>

            <FilterSection title="Size and age">
              <div className="space-y-4">
                <RangeFields label="Estimated employees" min={get('employees_min')} max={get('employees_max')} onMin={(v) => set('employees_min', v)} onMax={(v) => set('employees_max', v)} minPlaceholder="From" maxPlaceholder="To" error={errors.employees} />
                <RangeFields
                  label="Estimated turnover (in rupees)"
                  min={get('turnover_min')}
                  max={get('turnover_max')}
                  onMin={(v) => set('turnover_min', v)}
                  onMax={(v) => set('turnover_max', v)}
                  minPlaceholder="From, e.g. 5000000"
                  maxPlaceholder="To"
                  hint={num(get('turnover_min')) !== undefined || num(get('turnover_max')) !== undefined ? `${rupees(num(get('turnover_min'))) || 'any'} to ${rupees(num(get('turnover_max'))) || 'any'}` : undefined}
                  error={errors.turnover}
                />
                <RangeFields label="Year established" min={get('year_min')} max={get('year_max')} onMin={(v) => set('year_min', v)} onMax={(v) => set('year_max', v)} minPlaceholder="From, e.g. 1995" maxPlaceholder={`To, e.g. ${thisYear}`} error={errors.year} />
              </div>
            </FilterSection>

            <FilterSection title="Website and brochure">
              <div className="space-y-3">
                <div>
                  <div className="mb-1.5 text-[13px] font-semibold text-slate-700">Has website</div>
                  <ChipGroup ariaLabel="Has website" options={YES_NO_ANY} value={tri(get('has_website'))} onChange={(id) => set('has_website', id === 'yes' ? true : id === 'no' ? false : undefined)} />
                </div>
                <div>
                  <div className="mb-1.5 text-[13px] font-semibold text-slate-700">Has brochure</div>
                  <ChipGroup ariaLabel="Has brochure" options={YES_NO_ANY} value={tri(get('has_brochure'))} onChange={(id) => set('has_brochure', id === 'yes' ? true : id === 'no' ? false : undefined)} />
                </div>
              </div>
            </FilterSection>

            <FilterSection title="Added by and added on">
              <div className="space-y-2.5">
                <SelectField
                  ariaLabel="Added by"
                  value={get('added_by') ? String(get('added_by')) : ''}
                  onChange={(v) => set('added_by', v ? Number(v) : undefined)}
                  placeholder="Anyone"
                  options={(leadMasters.lead_by_users ?? []).map((u) => ({ value: String(u.emp_id), label: u.name }))}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-400">From</span>
                    <TextField type="date" max={String(get('added_to') || '') || undefined} value={String(get('added_from') ?? '')} onChange={(e) => set('added_from', e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-400">To</span>
                    <TextField type="date" min={String(get('added_from') || '') || undefined} value={String(get('added_to') ?? '')} onChange={(e) => set('added_to', e.target.value)} />
                  </label>
                </div>
                {errors.added && <p role="alert" className="text-[13px] text-rose-600">{errors.added}</p>}
              </div>
            </FilterSection>
          </div>
        )}
      </div>
    </Drawer>
  );
};
