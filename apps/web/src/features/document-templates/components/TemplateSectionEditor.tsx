import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Cloud,
  Code,
  Globe,
  Layers,
  Lock,
  Settings,
  Shield,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { CatalogOption, CatalogSection, LayoutField, LayoutSection } from '../types';

const inputCls =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 transition focus:border-blue-500 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400';

const TILE_ICONS: Record<string, LucideIcon> = {
  code: Code,
  layers: Layers,
  users: Users,
  chart: TrendingUp,
  cog: Settings,
  cloud: Cloud,
  shield: Shield,
  mobile: Smartphone,
  cart: ShoppingCart,
  globe: Globe,
};

interface Props {
  section: LayoutSection;
  catalog: CatalogSection;
  onChange: (section: LayoutSection) => void;
  /** Extra controls for this section (e.g. the signature image upload), shown under its options. */
  children?: React.ReactNode;
}

/**
 * One section of the layout: its title, whether it prints, its fields (show/hide, rename, reorder)
 * and its options. Amount rows that make up a total are always shown (the lock icon), so the printed
 * rows always add up to the printed total.
 */
export const TemplateSectionEditor: React.FC<Props> = ({ section, catalog, onChange, children }) => {
  const fieldDef = (key: string) => catalog.fields.find((f) => f.key === key);
  const setField = (index: number, patch: Partial<LayoutField>) =>
    onChange({ ...section, fields: section.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)) });
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= section.fields.length) return;
    const fields = [...section.fields];
    [fields[index], fields[target]] = [fields[target], fields[index]];
    onChange({ ...section, fields });
  };
  const setOption = (key: string, value: string | boolean) =>
    onChange({ ...section, options: { ...section.options, [key]: value } });

  return (
    <div className={`rounded-2xl border bg-white p-4 ${section.visible ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-70'}`}>
      <div className="flex flex-wrap items-center gap-3">
        {catalog.has_title ? (
          <input
            className={`${inputCls} max-w-xs font-semibold`}
            value={section.title}
            maxLength={60}
            aria-label={`${catalog.title} heading`}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
          />
        ) : (
          <span className="text-[13px] font-semibold text-slate-800">{catalog.title}</span>
        )}
        {catalog.can_hide ? (
          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
            <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={section.visible} onChange={(e) => onChange({ ...section, visible: e.target.checked })} />
            Show section
          </label>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Lock className="h-3 w-3" /> Always printed
          </span>
        )}
      </div>

      {section.visible && section.fields.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {section.fields.map((f, i) => {
            const def = fieldDef(f.key);
            const required = Boolean(def?.required);
            const labelEditable = def?.label_editable !== false;
            return (
              <li key={f.key} className="flex items-center gap-2">
                {required ? (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-400" title="Always shown: it is part of a total">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-blue-600"
                    checked={f.visible}
                    aria-label={`Show ${f.label}`}
                    onChange={(e) => setField(i, { visible: e.target.checked })}
                  />
                )}
                {labelEditable ? (
                  <input className={inputCls} value={f.label} maxLength={60} disabled={!f.visible} aria-label={`${def?.label ?? f.key} label`} onChange={(e) => setField(i, { label: e.target.value })} />
                ) : (
                  <span className="flex h-9 w-full items-center rounded-lg bg-slate-50 px-2.5 text-[12px] text-slate-500">{f.label}</span>
                )}
                <div className="flex shrink-0">
                  <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" disabled={i === section.fields.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {section.visible && catalog.options.length > 0 && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {groupOptions(catalog.options).map((block) =>
            block.group ? (
              <div key={block.group} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{block.group}</p>
                {block.options.map((o) => (
                  <OptionField key={o.key} option={o} section={section} onChange={setOption} />
                ))}
              </div>
            ) : (
              block.options.map((o) => <OptionField key={o.key} option={o} section={section} onChange={setOption} />)
            ),
          )}
        </div>
      )}

      {section.visible && children && <div className="mt-3 border-t border-slate-100 pt-3">{children}</div>}
    </div>
  );
};

function groupOptions(options: CatalogOption[]): Array<{ group: string | null; options: CatalogOption[] }> {
  const blocks: Array<{ group: string | null; options: CatalogOption[] }> = [];
  for (const o of options) {
    const g = o.group ?? null;
    const last = blocks[blocks.length - 1];
    if (g && last && last.group === g) last.options.push(o);
    else blocks.push({ group: g, options: [o] });
  }
  return blocks;
}

const OptionField: React.FC<{
  option: CatalogOption;
  section: LayoutSection;
  onChange: (key: string, value: string | boolean) => void;
}> = ({ option: o, section, onChange }) => {
  const value = section.options[o.key];

  if (o.type === 'boolean') {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
        <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={Boolean(value)} onChange={(e) => onChange(o.key, e.target.checked)} />
        {o.label}
      </label>
    );
  }

  if (o.type === 'choice') {
    const icon = typeof value === 'string' ? value : '';
    const Icon = TILE_ICONS[icon];
    const colorOpt = o.group ? section.options[o.key.replace(/_icon$/, '_color')] : undefined;
    const previewColor = typeof colorOpt === 'string' ? colorOpt : '#1d4ed8';
    return (
      <label className="block text-[12px] text-slate-600">
        <span className="mb-1 block font-medium">{o.label}</span>
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-5 w-5 shrink-0" style={{ color: previewColor }} /> : <span className="h-5 w-5 shrink-0" />}
          <select className={inputCls} value={icon} onChange={(e) => onChange(o.key, e.target.value)} aria-label={o.label}>
            {(o.suggestions ?? []).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </label>
    );
  }

  if (o.type === 'color') {
    const hex = typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : '#1d4ed8';
    const six = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    return (
      <div className="text-[12px] text-slate-600">
        <span className="mb-1 block font-medium">{o.label}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {(o.suggestions ?? []).map((swatch) => (
            <button
              key={swatch}
              type="button"
              title={swatch}
              aria-label={`Colour ${swatch}`}
              aria-pressed={six.toLowerCase() === swatch.toLowerCase()}
              className={`h-7 w-7 rounded-full border border-black/10 ${six.toLowerCase() === swatch.toLowerCase() ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}
              style={{ background: swatch }}
              onClick={() => onChange(o.key, swatch)}
            />
          ))}
          <input
            type="color"
            className="h-7 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
            value={six}
            aria-label={o.label}
            onChange={(e) => onChange(o.key, e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <label className="block text-[12px] text-slate-600">
      <span className="mb-1 block font-medium">{o.label}</span>
      <input
        className={inputCls}
        maxLength={300}
        list={o.suggestions?.length ? `${section.key}-${o.key}-options` : undefined}
        placeholder={o.suggestions?.length ? 'Choose or type' : undefined}
        value={String(value ?? '')}
        onChange={(e) => onChange(o.key, e.target.value)}
      />
      {o.suggestions?.length ? (
        <datalist id={`${section.key}-${o.key}-options`}>
          {o.suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </label>
  );
};
