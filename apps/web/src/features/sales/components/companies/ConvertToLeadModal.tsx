import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSalesConvertToLeadControllerForm, useSalesConvertToLeadControllerConvert } from '@vernoxy-pulse/api-client';
import { Modal } from '../common/Modal';
import { PersonPicker } from '../common/PersonPicker';
import { parseApiError } from '../../utils/error';
import type { ConvertToLeadFormResponse, ConvertToLeadBodyDto } from '../../types/sales.types';
import { UserPlus, Building2, User, AlertCircle, ExternalLink, Loader2, Check, Phone } from 'lucide-react';

export interface ConvertToLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number | null;
  companyName?: string;
  onSuccess?: (leadId: number) => void;
}

const Field: React.FC<{ label: string; hint?: string; required?: boolean; children: React.ReactNode }> = ({ label, hint, required, children }) => (
  <div>
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <label className="text-sm font-semibold text-slate-800">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
    {children}
  </div>
);

export const ConvertToLeadModal: React.FC<ConvertToLeadModalProps> = ({ isOpen, onClose, companyId, companyName, onSuccess }) => {
  const queryClient = useQueryClient();

  const [leadSource, setLeadSource] = useState<string>('');
  const [leadById, setLeadById] = useState<number | ''>('');
  const [selectedServiceFits, setSelectedServiceFits] = useState<string[]>([]);
  const [firstNote, setFirstNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [existingLeadConflict, setExistingLeadConflict] = useState<{ lead_id: number; lead_code: string | null; stage: string } | null>(null);

  const { data: formData, isLoading: isFormLoading } = useSalesConvertToLeadControllerForm(companyId ?? 0, {
    query: { enabled: Boolean(isOpen && companyId) },
  });

  const form = ((formData as unknown as { data?: ConvertToLeadFormResponse })?.data ?? (formData as unknown as ConvertToLeadFormResponse | undefined)) ?? null;

  // Start with what the API suggests: its default source, and the person converting as the owner
  useEffect(() => {
    if (!form) return;
    setLeadSource(form.defaults?.lead_source ?? form.lead_sources?.[0] ?? '');
    setLeadById(form.defaults?.lead_by?.emp_id ?? form.lead_by_users?.[0]?.emp_id ?? '');
    setExistingLeadConflict(form.open_lead ?? null);
    setSelectedServiceFits([]);
    setFirstNote('');
    setErrorMessage(null);
  }, [form]);

  const convertMutation = useSalesConvertToLeadControllerConvert();

  const toggleServiceFit = (fit: string) => setSelectedServiceFits((prev) => (prev.includes(fit) ? prev.filter((f) => f !== fit) : [...prev, fit]));

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!companyId) return;

    setErrorMessage(null);
    setExistingLeadConflict(null);

    const body: ConvertToLeadBodyDto = {
      lead_source: leadSource,
      lead_by_id: Number(leadById),
      service_fit: selectedServiceFits,
      first_note: firstNote.trim() || undefined,
    };

    try {
      const response = await convertMutation.mutateAsync({ id: companyId, data: body });
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/companies'] });
      await queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/sales/leads') });
      const newLeadId = (response as unknown as { lead_id?: number })?.lead_id ?? (response as unknown as { data?: { lead_id?: number } })?.data?.lead_id;
      onClose();
      if (newLeadId && onSuccess) onSuccess(newLeadId);
    } catch (err: unknown) {
      const parsedErr = parseApiError(err);
      if (parsedErr.openLead) setExistingLeadConflict(parsedErr.openLead);
      else setErrorMessage(parsedErr.message);
    }
  };

  const ready = Boolean(leadById && leadSource) && selectedServiceFits.length > 0;

  const footer = existingLeadConflict ? (
    <>
      <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
        Close
      </button>
      <Link
        to={`/sales/leads/${existingLeadConflict.lead_id}`}
        onClick={onClose}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        Open {existingLeadConflict.lead_code ?? `LEAD-${existingLeadConflict.lead_id}`}
        <ExternalLink className="h-4 w-4" />
      </Link>
    </>
  ) : (
    <>
      <button type="button" onClick={onClose} disabled={convertMutation.isPending} className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
        Cancel
      </button>
      <button
        type="button"
        onClick={() => handleSubmit()}
        disabled={convertMutation.isPending || isFormLoading || !ready}
        title={!selectedServiceFits.length ? 'Choose at least one service fit' : undefined}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {convertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Create lead
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <UserPlus className="h-5 w-5" />
          </span>
          <span>Convert to lead</span>
        </div>
      }
      subtitle={companyName ? `Make "${companyName}" an active lead` : 'Start a new sales lead'}
      footer={footer}
      size="lg"
    >
      {isFormLoading ? (
        <div className="flex flex-col items-center justify-center space-y-3 p-10">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Getting the form ready…</p>
        </div>
      ) : existingLeadConflict ? (
        <div className="space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h4 className="text-sm font-semibold">This company already has an open lead</h4>
              <p className="mt-1 text-sm text-amber-800">
                It is <span className="font-bold">{existingLeadConflict.lead_code ?? `LEAD-${existingLeadConflict.lead_id}`}</span> ({existingLeadConflict.stage}). A company can have only one open lead at a time.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* The company, and the Lead ID it will get */}
          {form?.company && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{form.company.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span className="font-mono">{form.company.company_code ?? `COM-${form.company.company_id}`}</span>
                    {form.primary_contact && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {form.primary_contact.name}
                        {form.primary_contact.mobile && (
                          <>
                            <Phone className="ml-1 h-3 w-3" />
                            {form.primary_contact.mobile}
                          </>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {form.next_lead_code && (
                <span className="rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-500 ring-1 ring-slate-200">
                  Lead ID <span className="font-mono font-semibold text-slate-800">{form.next_lead_code}</span>
                </span>
              )}
            </div>
          )}

          <Field label="Lead source" required>
            <div role="radiogroup" aria-label="Lead source" className="flex flex-wrap gap-2">
              {(form?.lead_sources ?? []).map((source) => {
                const on = leadSource === source;
                return (
                  <button
                    key={source}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setLeadSource(source)}
                    className={`h-10 rounded-xl border px-4 text-sm font-medium transition ${on ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/15' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    {source}
                  </button>
                );
              })}
              {(form?.lead_sources ?? []).length === 0 && <p className="text-sm text-slate-400">No lead sources are set up yet. Add some in Settings.</p>}
            </div>
          </Field>

          <Field label="Lead owner" hint="Who will work this lead" required>
            <PersonPicker people={form?.lead_by_users ?? []} value={leadById === '' ? null : Number(leadById)} onChange={(id) => setLeadById(id)} />
          </Field>

          <Field label="Service fit" hint="Choose one or more" required>
            <div className="flex flex-wrap gap-2">
              {(form?.service_fits ?? []).map((fit) => {
                const on = selectedServiceFits.includes(fit);
                return (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => toggleServiceFit(fit)}
                    aria-pressed={on}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition ${
                      on ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {on && <Check className="h-4 w-4" />}
                    {fit}
                  </button>
                );
              })}
              {(form?.service_fits ?? []).length === 0 && <p className="text-sm text-slate-400">No services are set up yet. Add some in Settings.</p>}
            </div>
          </Field>

          <Field label="First note" hint="Optional">
            <textarea
              rows={3}
              placeholder="What do you know so far? e.g. interested in automation, wants a quote by Q1"
              value={firstNote}
              onChange={(e) => setFirstNote(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
            />
          </Field>
        </form>
      )}
    </Modal>
  );
};
