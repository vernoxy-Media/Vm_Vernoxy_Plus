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
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  WITHDRAWN: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLATION_REQUESTED: 'bg-orange-50 text-orange-700 border-orange-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const StatusBadge: React.FC<{ status: LeaveStatus | string; label?: string }> = ({ status, label }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
      STATUS_STYLES[status] || STATUS_STYLES.WITHDRAWN
    }`}
  >
    {label || status}
  </span>
);

export const PaidTag: React.FC<{ paid: boolean }> = ({ paid }) =>
  paid ? (
    <span className="inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
      Paid
    </span>
  ) : (
    <span className="inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/70">
      Unpaid
    </span>
  );

export const ShortNoticeTag: React.FC = () => (
  <span className="inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
    Short notice
  </span>
);

export const FieldError: React.FC<{ message?: string | null }> = ({ message }) =>
  message ? <p className="mt-1 text-[11px] font-medium text-rose-600">{message}</p> : null;

// -----------------------------------------------------------------------------
// Modal shell
// -----------------------------------------------------------------------------

export const Modal: React.FC<{
  open: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}> = ({ open, title, subtitle, onClose, children, footer, width = 'max-w-2xl' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${width} border border-slate-200 max-h-[92vh] flex flex-col text-xs`}>
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {subtitle && <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'; loading?: boolean }
> = ({ variant = 'secondary', loading, children, className = '', disabled, ...rest }) => {
  const styles: Record<string, string> = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200',
    danger: 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent',
  };
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
