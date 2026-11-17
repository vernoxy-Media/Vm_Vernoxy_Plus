import { getAccessToken } from '@vernoxy-pulse/api-client';

/**
 * Excel, PDF or CSV of exactly what the screen shows (Licenses, Complaints).
 * Excel is built by the module's own export endpoint, which applies that module's rules.
 */
export interface ExportColumn {
  header: string;
  key: string;
  money?: boolean;
}

export interface ExportSpec {
  title: string;
  sheet: string;
  /** API endpoint that turns the rows into .xlsx, e.g. /api/v1/licenses/export */
  endpoint?: string;
  columns: ExportColumn[];
  rows: Array<Record<string, any>>;
}

const stamp = () => new Date().toISOString().slice(0, 10);
const fileBase = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'licenses';

function save(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/** Excel, built by the server from the rows on screen. */
export async function exportExcel(spec: ExportSpec) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Requested-With': 'pulse-web' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(spec.endpoint || '/api/v1/licenses/export', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ title: spec.title, sheet: spec.sheet, columns: spec.columns, rows: spec.rows }),
  });
  if (!res.ok) {
    let msg = 'Export failed.';
    try {
      const j = await res.json();
      msg = j.detail || j.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  save(await res.blob(), `${fileBase(spec.sheet)}-${stamp()}.xlsx`);
}

/** CSV of the rows on screen. */
export function exportCsv(spec: ExportSpec) {
  const cell = (v: any) => {
    const t = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lines = [spec.columns.map((c) => cell(c.header)).join(','), ...spec.rows.map((r) => spec.columns.map((c) => cell(r[c.key])).join(','))];
  save(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), `${fileBase(spec.sheet)}-${stamp()}.csv`);
}

const esc = (v: any) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** PDF: a clean printable page; the browser's "Save as PDF" makes the file. */
export function exportPdf(spec: ExportSpec) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow pop-ups to save the PDF.');
    return;
  }
  const money = (v: any) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? esc(v) : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(spec.title)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;margin:24px}
  h1{font-size:18px;margin:0 0 4px} p{font-size:11px;color:#64748b;margin:0 0 14px}
  table{width:100%;border-collapse:collapse;font-size:10.5px}
  th{background:#e2e8f0;text-align:left;padding:6px;border:1px solid #cbd5e1}
  td{padding:5px 6px;border:1px solid #e2e8f0;vertical-align:top}
  tr:nth-child(even) td{background:#f8fafc}
  @media print{body{margin:10mm}}
</style></head><body>
<h1>${esc(spec.title)}</h1><p>Vernoxy Pulse · ${new Date().toLocaleString('en-GB')} · ${spec.rows.length} rows</p>
<table><thead><tr>${spec.columns.map((c) => `<th>${esc(c.header)}</th>`).join('')}</tr></thead>
<tbody>${spec.rows.map((r) => `<tr>${spec.columns.map((c) => `<td>${c.money ? money(r[c.key]) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>
<script>window.onload=function(){setTimeout(function(){window.print()},200)}</script>
</body></html>`);
  w.document.close();
}

/** DD-MM-YYYY for exports. */
export const dmy = (v?: string | null) => (v ? String(v).slice(0, 10).split('-').reverse().join('-') : '');
