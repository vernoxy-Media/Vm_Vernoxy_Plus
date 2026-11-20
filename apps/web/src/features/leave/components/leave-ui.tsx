import React from 'react';
import { X, Loader2 } from 'lucide-react';
import type { LeaveStatus, ReportTable } from '../hooks/use-leave';

// -----------------------------------------------------------------------------
// Formatting
// -----------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toYmd(value?: string | Date | null): string {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayYmd(): string {
  return toYmd(new Date());
}

/** "06 Nov 2026" */
export function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const s = value.slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return '—';
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}

/** "06 Nov" */
export function fmtDayMonth(value?: string | null): string {
  if (!value) return '—';
  const [, m, d] = value.slice(0, 10).split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

/** "Fri 06 Nov" */
export function fmtWeekday(value: string): string {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${DAYS[dt.getUTCDay()]} ${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDays(n?: number | null): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(1);
}

export function durationLabel(d?: string): string {
  if (d === 'FIRST_HALF') return 'First Half';
  if (d === 'SECOND_HALF') return 'Second Half';
  return 'Full Day';
}

export function dateRangeLabel(from: string, to: string, duration?: string): string {
  if (from === to) {
    return `${fmtDate(from)}${duration && duration !== 'FULL_DAY' ? ` (${durationLabel(duration)})` : ''}`;
  }
  return `${fmtDayMonth(from)} – ${fmtDate(to)}`;
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export function errMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  return err?.detail || err?.message || fallback;
}

/** Maps API problem details to { field: message } for messages next to fields. */
export function fieldErrors(err: any): Record<string, string> {
  const out: Record<string, string> = {};
  const list: any[] = err?.errors || err?.invalid_params || [];
  for (const e of list) {
    if (e && typeof e === 'object' && e.field && !out[e.field]) out[e.field] = e.message;
  }
  if (err?.field && !out[err.field]) out[err.field] = err.detail || err.message;
  return out;
}

// -----------------------------------------------------------------------------
// Colours: the colour CODE comes from master data; this only maps it to styles.
// -----------------------------------------------------------------------------

const COLOR_STYLES: Record<string, { dot: string; soft: string; text: string; ring: string; bar: string }> = {
  blue: { dot: 'bg-blue-500', soft: 'bg-blue-50', text: 'text-blue-700', ring: 'border-blue-200', bar: 'bg-blue-500' },
  emerald: { dot: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', ring: 'border-emerald-200', bar: 'bg-emerald-500' },
  green: { dot: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', ring: 'border-emerald-200', bar: 'bg-emerald-500' },
  amber: { dot: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-700', ring: 'border-amber-200', bar: 'bg-amber-500' },
  purple: { dot: 'bg-purple-500', soft: 'bg-purple-50', text: 'text-purple-700', ring: 'border-purple-200', bar: 'bg-purple-500' },
  rose: { dot: 'bg-rose-500', soft: 'bg-rose-50', text: 'text-rose-700', ring: 'border-rose-200', bar: 'bg-rose-500' },
  indigo: { dot: 'bg-indigo-500', soft: 'bg-indigo-50', text: 'text-indigo-700', ring: 'border-indigo-200', bar: 'bg-indigo-500' },
  teal: { dot: 'bg-teal-500', soft: 'bg-teal-50', text: 'text-teal-700', ring: 'border-teal-200', bar: 'bg-teal-500' },
  slate: { dot: 'bg-slate-400', soft: 'bg-slate-100', text: 'text-slate-700', ring: 'border-slate-200', bar: 'bg-slate-400' },
};

export function colorStyle(code?: string | null) {
  return COLOR_STYLES[(code || '').toLowerCase()] || COLOR_STYLES.slate;
}

// -----------------------------------------------------------------------------
// Badges
// -----------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200/80',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200/80',
  WITHDRAWN: 'bg-slate-100 text-slate-600 ring-slate-200',
  CANCELLATION_REQUESTED: 'bg-orange-50 text-orange-700 ring-orange-200/80',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-amber-500',
  APPROVED: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
  WITHDRAWN: 'bg-slate-400',
  CANCELLATION_REQUESTED: 'bg-orange-500',
  CANCELLED: 'bg-slate-400',
};

export const StatusBadge: React.FC<{ status: LeaveStatus | string; label?: string }> = ({ status, label }) => (
  <span
    className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-inset ${
      STATUS_STYLES[status] || STATUS_STYLES.WITHDRAWN
    }`}
  >
    <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] || STATUS_DOT.WITHDRAWN}`} />
    {label || status}
  </span>
);

export const PaidTag: React.FC<{ paid: boolean }> = ({ paid }) =>
  paid ? (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
      Paid
    </span>
  ) : (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70">
      Unpaid
    </span>
  );

export const ShortNoticeTag: React.FC = () => (
  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200/80">
    Short notice
  </span>
);

export const FieldError: React.FC<{ message?: string | null }> = ({ message }) =>
  message ? <p className="mt-1 text-[11px] font-medium text-rose-600">{message}</p> : null;

// -----------------------------------------------------------------------------
// Modal shell
// -----------------------------------------------------------------------------

let openDialogs = 0;
let pageOverflowBefore = '';

export const Modal: React.FC<{
  open: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}> = ({ open, title, subtitle, onClose, children, footer, width = 'max-w-2xl' }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Counted, so a dialog opened over another one never leaves the page stuck without scrolling
    if (openDialogs++ === 0) pageOverflowBefore = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      if (--openDialogs === 0) document.body.style.overflow = pageOverflowBefore;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white text-[13px] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 sm:max-h-[92vh] sm:rounded-3xl ${width}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>
            {subtitle && <div className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
};

export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'; loading?: boolean }
> = ({ variant = 'secondary', loading, children, className = '', disabled, ...rest }) => {
  const styles: Record<string, string> = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white border-transparent shadow-md shadow-blue-600/25 focus-visible:ring-blue-300',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 focus-visible:ring-slate-300',
    danger: 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200 focus-visible:ring-rose-200',
    success: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white border-transparent shadow-md shadow-emerald-600/25 focus-visible:ring-emerald-300',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent focus-visible:ring-slate-300',
  };
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-4 py-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${styles[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
};

/** In-page confirmation (no browser dialogs). */
export const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel, variant = 'primary', loading, onConfirm, onCancel }) => (
  <Modal
    open={open}
    title={title}
    onClose={onCancel}
    width="max-w-md"
    footer={
      <>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant={variant === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Btn>
      </>
    }
  >
    <div className="text-slate-600 text-xs leading-relaxed">{message}</div>
  </Modal>
);

// -----------------------------------------------------------------------------
// PDF (print) of a report table — matches the screen and the Excel export
// -----------------------------------------------------------------------------

export function printTable(table: ReportTable, subtitle?: string) {
  const esc = (v: any) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const html = `<!doctype html><html><head><title>${esc(table.title)}</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;margin:24px;}
    h1{font-size:16px;margin:0 0 4px}
    p{font-size:11px;color:#64748b;margin:0 0 14px}
    table{border-collapse:collapse;width:100%;font-size:10.5px}
    th{background:#1e293b;color:#fff;text-align:left;padding:6px;font-weight:600}
    td{border-bottom:1px solid #e2e8f0;padding:5px 6px;vertical-align:top}
    @page{size:landscape;margin:12mm}
  </style></head><body>
  <h1>${esc(table.title)}</h1><p>Vernoxy Pulse · ${esc(subtitle || '')} · Printed ${esc(new Date().toLocaleString())}</p>
  <table><thead><tr>${table.columns.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
  <tbody>${table.rows
    .map((r) => `<tr>${table.columns.map((c) => `<td>${esc(r[c.key])}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>
  <script>window.onload=function(){window.print();}</script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
