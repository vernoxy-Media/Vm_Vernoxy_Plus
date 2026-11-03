import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { History, Upload, Download, RotateCcw, AlertCircle, Loader2, RefreshCw, Eye, FileSpreadsheet, FileText, CheckCircle2, ChevronUp } from 'lucide-react';
import { useSalesImportExportControllerHistory, useSalesImportExportControllerUndo, useSalesImportExportControllerGetImport } from '@vernoxy-pulse/api-client';

import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { ActionMenu, type ActionMenuItem } from '../components/common/ActionMenu';
import { downloadSalesFile } from '../utils/download';
import { formatDateTimeIST, formatRemainingHours, timeAgo } from '../utils/date';
import type { BlockerItem } from '../components/common/ConfirmDialog';
import { parseApiError } from '../utils/error';
import { unwrapList } from '../utils/response';
import { getAvatarColor, getInitials } from '../utils/formatters';
import { useSalesRights } from '../hooks/useSalesRights';
import type { HistoryItem, ImportJobResponse } from '../types/sales.types';

const TABS = [
  { id: 'all' as const, label: 'All operations' },
  { id: 'import' as const, label: 'Imports' },
  { id: 'export' as const, label: 'Exports' },
];

const OperationBadge: React.FC<{ kind: HistoryItem['kind'] }> = ({ kind }) => {
  const isImport = kind === 'import';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isImport ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'bg-violet-50 text-violet-700 ring-1 ring-violet-100'}`}>
      {isImport ? <Upload className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
      {isImport ? 'Import' : 'Export'}
    </span>
  );
};

const FileCell: React.FC<{ item: HistoryItem }> = ({ item }) => {
  const format = (item.format || 'xlsx').toLowerCase();
  const Icon = format === 'csv' ? FileText : FileSpreadsheet;
  const tone = item.kind === 'import' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600';
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900" title={item.file_name || undefined}>
          {item.file_name || `${item.list || 'Export'} file`}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
          <span className="rounded bg-slate-100 px-1.5 py-px font-mono text-[10px] font-semibold uppercase text-slate-500">{format}</span>
        </p>
      </div>
    </div>
  );
};

const ByCell: React.FC<{ name?: string | null }> = ({ name }) => {
  const label = name || 'System';
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${getAvatarColor(label)}`}>{getInitials(label)}</span>
      <span className="truncate text-sm text-slate-700">{label}</span>
    </div>
  );
};

const ResultCell: React.FC<{ item: HistoryItem }> = ({ item }) => {
  const isImport = item.kind === 'import';
  if (isImport && item.undo?.undone) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
        <RotateCcw className="h-3.5 w-3.5" />
        Undone
      </span>
    );
  }
  if (isImport && item.counts) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {item.counts.created} created
        </span>
        {item.counts.errors > 0 && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">{item.counts.errors} errors</span>}
      </div>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Completed
    </span>
  );
};

export const HistoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useSalesRights();

  const [directionFilter, setDirectionFilter] = useState<'all' | 'import' | 'export'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const [undoTarget, setUndoTarget] = useState<HistoryItem | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [undoBlockers, setUndoBlockers] = useState<BlockerItem[]>([]);
  const [isDownloadingErrors, setIsDownloadingErrors] = useState<string | null>(null);

  const { data: rawData, isLoading, isError, error, refetch, isFetching } = useSalesImportExportControllerHistory({ limit: 200 });

  const allItems = unwrapList<HistoryItem>(rawData);
  const countOf = (id: 'all' | 'import' | 'export') => (id === 'all' ? allItems.length : allItems.filter((h) => h.kind === id).length);
  const filteredItems = allItems.filter((h) => directionFilter === 'all' || h.kind === directionFilter);
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const items: HistoryItem[] = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const undoMutation = useSalesImportExportControllerUndo({
    mutation: {
      onSuccess: () => {
        setUndoTarget(null);
        setUndoError(null);
        setUndoBlockers([]);
        queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/history'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
      },
      onError: (err: unknown) => {
        const parsed = parseApiError(err);
        setUndoError(parsed.message || 'Failed to undo import');
        setUndoBlockers(parsed.blockers || []);
      },
    },
  });

  const handleDownloadErrors = async (jobId: string) => {
    setIsDownloadingErrors(jobId);
    try {
      await downloadSalesFile(`/api/v1/sales/imports/${jobId}/error-rows`);
    } catch {
      alert('Failed to download error rows.');
    } finally {
      setIsDownloadingErrors(null);
    }
  };

  const handleConfirmUndo = async () => {
    if (!undoTarget) return;
    setUndoError(null);
    setUndoBlockers([]);
    await undoMutation.mutateAsync({ jobId: undoTarget.job_id });
  };

  /** What can be done with one row. Exports have nothing to do, so they get no menu. */
  const actionsFor = (item: HistoryItem): ActionMenuItem[] => {
    if (item.kind !== 'import') return [];
    const expanded = expandedJobId === item.job_id;
    const list: ActionMenuItem[] = [
      { key: 'details', label: expanded ? 'Hide details' : 'View details', icon: expanded ? ChevronUp : Eye, onSelect: () => setExpandedJobId(expanded ? null : item.job_id) },
    ];
    if ((item.counts?.errors ?? 0) > 0) {
      list.push({ key: 'errors', label: 'Download error rows', icon: Download, disabled: isDownloadingErrors === item.job_id, onSelect: () => handleDownloadErrors(item.job_id) });
    }
    if (isAdmin && item.undo?.can_undo && !item.undo?.undone) {
      list.push({
        key: 'undo',
        label: item.undo.until ? `Undo import (${formatRemainingHours(item.undo.until)})` : 'Undo import',
        icon: RotateCcw,
        danger: true,
        onSelect: () => {
          setUndoTarget(item);
          setUndoError(null);
          setUndoBlockers([]);
        },
      });
    }
    return list;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Import &amp; Export History</h1>
          <p className="mt-0.5 text-sm text-slate-500">Your imports and exports, with the option to undo a recent import.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh"
          title="Refresh"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Pill tabs with counts */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {TABS.map((tab) => {
          const on = directionFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setDirectionFilter(tab.id);
                setPage(1);
              }}
              aria-pressed={on}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                on ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-px text-xs ${on ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{countOf(tab.id)}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} columns={6} />
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-2xs">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h3 className="text-base font-semibold text-slate-900">Failed to load transfer history</h3>
          <p className="mb-4 mt-1 text-sm text-slate-500">{parseApiError(error).message || 'Unable to retrieve history logs.'}</p>
          <button type="button" onClick={() => refetch()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={History} title="No history recorded yet" description="Spreadsheet import jobs and list export operations will be logged here automatically." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">File</th>
                  <th className="px-4 py-3.5">Operation</th>
                  <th className="px-4 py-3.5">Initiated by</th>
                  <th className="px-4 py-3.5">Processed</th>
                  <th className="px-4 py-3.5 text-right">Rows</th>
                  <th className="px-4 py-3.5">Result</th>
                  <th className="w-16 px-4 py-3.5" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const expanded = expandedJobId === item.job_id;
                  const actions = actionsFor(item);
                  return (
                    <React.Fragment key={item.job_id}>
                      <tr className={`transition-colors ${expanded ? 'bg-slate-50/80' : 'hover:bg-slate-50/60'}`}>
                        <td className="max-w-[280px] px-5 py-3.5">
                          <FileCell item={item} />
                        </td>
                        <td className="px-4 py-3.5">
                          <OperationBadge kind={item.kind} />
                        </td>
                        <td className="max-w-[200px] px-4 py-3.5">
                          <ByCell name={item.by?.name} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <p className="text-sm text-slate-800">{formatDateTimeIST(item.at)}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{timeAgo(item.at)}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-sm font-semibold tabular-nums text-slate-800">{item.rows ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          <ResultCell item={item} />
                        </td>
                        <td className="px-4 py-3.5 text-right">{actions.length > 0 && <ActionMenu items={actions} label="Row actions" />}</td>
                      </tr>
                      {expanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={7} className="px-5 pb-5 pt-1">
                            <ExpandedImportDetails jobId={item.job_id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {items.map((item) => {
              const expanded = expandedJobId === item.job_id;
              const actions = actionsFor(item);
              return (
                <li key={item.job_id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <FileCell item={item} />
                    </div>
                    {actions.length > 0 && <ActionMenu items={actions} label="Row actions" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <OperationBadge kind={item.kind} />
                    <ResultCell item={item} />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <ByCell name={item.by?.name} />
                    <div className="shrink-0 text-right">
                      <p className="text-slate-700">{timeAgo(item.at)}</p>
                      <p className="text-slate-400">{item.rows ?? '—'} rows</p>
                    </div>
                  </div>
                  {expanded && <ExpandedImportDetails jobId={item.job_id} />}
                </li>
              );
            })}
          </ul>

          <div className="border-t border-slate-200 px-4 py-3">
            <Pagination currentPage={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={(p) => setPage(p)} />
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(undoTarget)}
        onClose={() => {
          if (!undoMutation.isPending) {
            setUndoTarget(null);
            setUndoError(null);
            setUndoBlockers([]);
          }
        }}
        onConfirm={handleConfirmUndo}
        title="Rollback Imported Records?"
        message={undoError ?? `Are you sure you want to undo import job "${undoTarget?.file_name}"? All companies created in this batch will be safely removed.`}
        confirmLabel="Confirm Rollback"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={undoMutation.isPending}
        blockers={undoBlockers}
      />
    </div>
  );
};

const OUTCOME_TONE: Record<string, string> = {
  created: 'bg-emerald-50 text-emerald-700',
  updated: 'bg-blue-50 text-blue-700',
  skipped: 'bg-slate-100 text-slate-600',
  error: 'bg-rose-50 text-rose-700',
};

const ExpandedImportDetails: React.FC<{ jobId: string }> = ({ jobId }) => {
  const { data: rawData, isLoading } = useSalesImportExportControllerGetImport(jobId);

  const job: ImportJobResponse | null = (rawData as unknown as { data?: ImportJobResponse })?.data ?? (rawData as unknown as ImportJobResponse) ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Loading the row breakdown…</span>
      </div>
    );
  }

  if (!job) return null;

  const stats = [
    { label: 'Created', value: job.counts?.created || 0, tone: 'text-emerald-700' },
    { label: 'Skipped', value: job.counts?.skipped || 0, tone: 'text-slate-700' },
    { label: 'Errors', value: job.counts?.errors || 0, tone: 'text-rose-700' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className={`text-lg font-bold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
          <p className="text-xs text-slate-400">Existing rows</p>
          <p className="text-sm font-semibold text-slate-700">{job.options?.existing_rows === 'update_empty' ? 'Enrich empty fields' : 'Skip duplicates'}</p>
        </div>
      </div>

      {job.row_results && job.row_results.length > 0 && (
        <div className="max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-16 px-3 py-2">Row</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {job.row_results.slice(0, 50).map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-slate-500">{r.row}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{r.company}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${OUTCOME_TONE[String(r.status).toLowerCase()] ?? 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-600">{r.company_code || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
