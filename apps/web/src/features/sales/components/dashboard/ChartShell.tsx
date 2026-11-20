import React, { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { Info, type LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Floating hover tooltip (follows the cursor, never shifts the layout) */
/* ------------------------------------------------------------------ */

export interface TipState<T> {
  x: number;
  y: number;
  flip: boolean;
  data: T;
}

export function useChartTooltip<T>() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState<T> | null>(null);

  const move = useCallback((e: React.MouseEvent, data: T) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setTip({ x, y, flip: x > r.width * 0.55, data });
  }, []);

  const hide = useCallback(() => setTip(null), []);
  return { ref, tip, move, hide };
}

export const ChartTooltip: React.FC<{ tip: TipState<unknown> | null; children: React.ReactNode }> = ({
  tip,
  children,
}) => {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-40 min-w-[150px] max-w-[270px] rounded-xl bg-slate-900/95 px-3 py-2.5 text-xs text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-sm"
      style={{
        left: tip.x,
        top: Math.max(tip.y, 48),
        transform: `translate(${tip.flip ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
      }}
    >
      {children}
    </div>
  );
};

export const TipTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-1.5 border-b border-white/10 pb-1.5 text-[13px] font-semibold leading-tight">{children}</div>
);

export const TipRow: React.FC<{ color?: string; label: React.ReactNode; value: React.ReactNode }> = ({
  color,
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-4 py-0.5">
    <span className="flex items-center gap-1.5 text-slate-300">
      {color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </span>
    <span className="font-semibold tabular-nums text-white">{value}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Width measurement so SVG charts render in real pixels                */
/* ------------------------------------------------------------------ */

export function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                      */
/* ------------------------------------------------------------------ */

const CHIP = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
} as const;

const BADGE = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
} as const;

export const Badge: React.FC<{ tone?: keyof typeof BADGE; children: React.ReactNode }> = ({
  tone = 'slate',
  children,
}) => (
  <span
    className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${BADGE[tone]}`}
  >
    {children}
  </span>
);

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`cursor-pointer rounded-md px-2.5 py-1 transition ${
            value === o.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const LegendDot: React.FC<{ color: string; label: string; shape?: 'dot' | 'square' | 'line' }> = ({
  color,
  label,
  shape = 'dot',
}) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
    <span
      className={shape === 'line' ? 'h-1 w-4 rounded-full' : shape === 'square' ? 'h-2.5 w-2.5 rounded-sm' : 'h-2.5 w-2.5 rounded-full'}
      style={{ backgroundColor: color }}
    />
    {label}
  </span>
);

export const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex min-h-[140px] items-center justify-center text-sm text-slate-400">{text}</div>
);

/* ------------------------------------------------------------------ */
/* Card shell                                                           */
/* ------------------------------------------------------------------ */

interface ChartCardProps {
  icon: LucideIcon;
  tone?: keyof typeof CHIP;
  title: string;
  badge?: React.ReactNode;
  subtitle: string;
  info: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  cardRef?: React.Ref<HTMLDivElement>;
  tooltip?: React.ReactNode;
  onLeave?: () => void;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  icon: Icon,
  tone = 'blue',
  title,
  badge,
  subtitle,
  info,
  actions,
  footer,
  cardRef,
  tooltip,
  onLeave,
  children,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div
      ref={cardRef}
      onMouseLeave={onLeave}
      className="relative flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_-8px_rgba(15,23,42,0.08)] transition-shadow duration-200 hover:shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${CHIP[tone]}`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="text-[15px] font-semibold leading-tight tracking-tight text-slate-900">{title}</h3>
              {badge}
            </div>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {actions}
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
              onFocus={() => setShowInfo(true)}
              onBlur={() => setShowInfo(false)}
              aria-label="About this chart"
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <Info className="h-4 w-4" />
            </button>
            {showInfo && (
              <div className="absolute right-0 top-9 z-50 w-64 rounded-xl bg-slate-900 p-3 text-xs leading-relaxed text-white shadow-xl">
                {info}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">{children}</div>

      {footer && (
        <div className="border-t border-slate-100 pt-3 text-center text-[11px] text-slate-400">{footer}</div>
      )}
      {tooltip}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Trend (line / area) SVG with axes, guide line and per-column hover   */
/* ------------------------------------------------------------------ */

export interface TrendSeries {
  key: string;
  color: string;
  values: number[];
  area?: boolean;
}

export const TrendSvg: React.FC<{
  labels: string[];
  series: TrendSeries[];
  height?: number;
  hoverIndex: number | null;
  onHover: (i: number, e: React.MouseEvent) => void;
  alwaysShowMarkers?: boolean;
}> = ({ labels, series, height = 200, hoverIndex, onHover, alwaysShowMarkers }) => {
  const [wrapRef, width] = useMeasuredWidth();
  const gid = useId().replace(/:/g, '');

  const padL = 34;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const innerW = Math.max(width - padL - padR, 10);
  const innerH = height - padT - padB;
  const n = labels.length;

  const rawMax = Math.max(1, ...series.flatMap((s) => s.values));
  const step = Math.max(1, niceStep(rawMax / 4));
  const max = Math.ceil(rawMax / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const maxLabels = Math.max(2, Math.floor(innerW / 72));
  const labelStep = Math.max(1, Math.ceil(n / maxLabels));
  const colW = n <= 1 ? innerW : innerW / (n - 1);

  return (
    <div ref={wrapRef} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible">
          <defs>
            {series
              .filter((s) => s.area)
              .map((s) => (
                <linearGradient key={s.key} id={`${gid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              ))}
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={width - padR}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? '#e2e8f0' : '#f1f5f9'}
                strokeDasharray={t === 0 ? undefined : '4 4'}
              />
              <text x={padL - 8} y={y(t) + 3.5} textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums">
                {t}
              </text>
            </g>
          ))}

          {labels.map(
            (l, i) =>
              i % labelStep === 0 && (
                <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">
                  {l}
                </text>
              ),
          )}

          {hoverIndex !== null && (
            <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={padT} y2={padT + innerH} stroke="#cbd5e1" strokeDasharray="3 3" />
          )}

          {series.map((s) => {
            const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
            const line = pts.length ? `M ${pts.join(' L ')}` : '';
            const area = pts.length
              ? `${line} L ${x(n - 1)},${padT + innerH} L ${x(0)},${padT + innerH} Z`
              : '';
            return (
              <g key={s.key}>
                {s.area && area && <path d={area} fill={`url(#${gid}-${s.key})`} />}
                {line && (
                  <path d={line} fill="none" stroke={s.color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
                )}
                {s.values.map((v, i) => {
                  const active = hoverIndex === i;
                  if (!active && !alwaysShowMarkers) return null;
                  return (
                    <circle
                      key={i}
                      cx={x(i)}
                      cy={y(v)}
                      r={active ? 5 : 3.5}
                      fill="#fff"
                      stroke={s.color}
                      strokeWidth={2}
                      className="transition-all"
                    />
                  );
                })}
              </g>
            );
          })}

          {labels.map((_, i) => (
            <rect
              key={i}
              x={x(i) - colW / 2}
              y={padT}
              width={colW}
              height={innerH}
              fill="transparent"
              className="cursor-crosshair"
              onMouseMove={(e) => onHover(i, e)}
            />
          ))}
        </svg>
      )}
    </div>
  );
};

function niceStep(x: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(x)));
  const n = x / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

/** Faint horizontal guides behind a column chart. */
export const BarGuides: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className={`h-px w-full ${i === 3 ? 'bg-slate-200' : 'border-t border-dashed border-slate-100'}`} />
    ))}
  </div>
);
