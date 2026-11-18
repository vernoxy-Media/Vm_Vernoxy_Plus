import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, Megaphone } from 'lucide-react';
import { useCampaign, useCampaignMasters, useCreateCampaign, useUpdateCampaign } from '../hooks/useCampaigns';
import { parseApiError } from '../utils/error';
import { CAMPAIGN_STATUSES, CAMPAIGN_TYPES, type CampaignFormValues } from '../types/campaign.types';

const ymd = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function blank(): CampaignFormValues {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);
  return {
    name: '',
    campaign_type: 'Calling',
    target_cities: [],
    target_state: null,
    industry_id: null,
    start_date: ymd(start),
    end_date: ymd(end),
    objective: '',
    description: '',
    status: 'Active',
  };
}

/** "Vapi, Valsad" -> ["Vapi", "Valsad"] (no empty names, no repeats). */
function splitCities(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(',')
    .map((c) => c.trim())
    .filter((c) => {
      const key = c.toLowerCase();
      if (!c || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// The look of the Company form's "Basic Information" card.
const CARD =
  'space-y-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-8 ' +
  '[&_h2]:text-xl [&_h2]:font-bold [&_h2+p]:text-sm [&_h2+p]:text-slate-500 ' +
  '[&_label]:mb-1.5 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_label]:text-slate-700 ' +
  '[&_input]:min-h-[48px] [&_select]:min-h-[48px] [&_input]:rounded-xl [&_select]:rounded-xl [&_textarea]:rounded-xl ' +
  '[&_input]:px-4 [&_select]:px-4 [&_textarea]:px-4 [&_textarea]:py-3 ' +
  '[&_input]:text-[15px] [&_select]:text-[15px] [&_textarea]:text-[15px] [&_.grid]:gap-5';

const fieldBase = 'w-full border bg-white text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 transition-all';
const field = (bad?: boolean) =>
  `${fieldBase} ${bad ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-gray-300 focus:ring-primary/20 focus:border-primary'}`;

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? <p className="mt-1.5 text-sm font-medium text-red-600">{message}</p> : null;

/** Create a campaign, or edit one (Admin only). */
export const CampaignFormPage: React.FC = () => {
  const { id } = useParams();
  const campaignId = id ? Number(id) : undefined;
  const editing = campaignId !== undefined;
  const navigate = useNavigate();

  const { data: masters } = useCampaignMasters();
  const existing = useCampaign(campaignId);
  const create = useCreateCampaign();
  const update = useUpdateCampaign(campaignId ?? 0);

  const [values, setValues] = useState<CampaignFormValues>(blank);
  const [cityText, setCityText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const c = existing.data && 'campaign' in existing.data ? existing.data.campaign : null;
    if (!c) return;
    setValues({
      name: c.name,
      campaign_type: c.campaign_type,
      target_cities: c.target_cities,
      target_state: c.target_state,
      industry_id: c.industry_id,
      start_date: c.start_date,
      end_date: c.end_date,
      objective: c.objective ?? '',
      description: c.description ?? '',
      status: c.status,
    });
    setCityText(c.target_cities.join(', '));
  }, [existing.data]);

  const set = <K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: '' } : e));
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!values.name.trim()) e.name = 'Please fill this field.';
    if (!values.start_date) e.start_date = 'Please fill this field.';
    if (!values.end_date) e.end_date = 'Please fill this field.';
    if (values.start_date && values.end_date && values.end_date < values.start_date) e.end_date = 'The end date cannot be before the start date.';
    return e;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setFormError('Please correct the highlighted fields.');
      return;
    }
    setFormError(null);
    const body: CampaignFormValues = {
      ...values,
      name: values.name.trim(),
      target_cities: splitCities(cityText),
      target_state: values.target_state || null,
      objective: values.objective?.trim() || null,
      description: values.description?.trim() || null,
    };
    const onError = (err: unknown) => {
      const parsed = parseApiError(err);
      setErrors(parsed.fieldErrors);
      setFormError(Object.keys(parsed.fieldErrors).length > 0 ? 'Please correct the highlighted fields.' : parsed.message);
    };
    if (editing) {
      update.mutate(body, { onSuccess: () => navigate(`/sales/campaigns/${campaignId}`), onError });
    } else {
      create.mutate(body, { onSuccess: (c) => navigate(`/sales/campaigns/${c.campaign_id}`), onError });
    }
  };

  const busy = create.isPending || update.isPending;
  const back = editing ? `/sales/campaigns/${campaignId}` : '/sales/campaigns';

  if (editing && existing.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (editing && existing.isError) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <p role="alert" className="text-sm text-red-600">{parseApiError(existing.error).message}</p>
        <Link to="/sales/campaigns" className="mt-4 inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Back to campaigns
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link to={back} aria-label="Back" className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-2xs transition-colors hover:bg-gray-50 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{editing ? 'Edit Campaign' : 'New Campaign'}</h1>
          <p className="mt-0.5 text-sm text-gray-500">After saving, you choose the companies and share them with your team.</p>
        </div>
      </div>

      {formError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p>{formError}</p>
        </div>
      )}

      <section className={CARD}>
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-gray-900">Campaign Information</h2>
            <p>Name, target and dates.</p>
          </div>
        </div>

        <div>
          <label htmlFor="cf-name">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            id="cf-name"
            className={field(Boolean(errors.name))}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Vapi Industrial Outreach – November 2026"
            maxLength={200}
            aria-invalid={Boolean(errors.name)}
          />
          <FieldError message={errors.name} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div>
            <label htmlFor="cf-type">Campaign Type</label>
            <select id="cf-type" className={field()} value={values.campaign_type} onChange={(e) => set('campaign_type', e.target.value)}>
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <FieldError message={errors.campaign_type} />
          </div>
          <div>
            <label htmlFor="cf-status">Campaign Status</label>
            <select id="cf-status" className={field()} value={values.status} onChange={(e) => set('status', e.target.value)}>
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <FieldError message={errors.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3">
          <div>
            <label htmlFor="cf-city">Target City</label>
            <input
              id="cf-city"
              list="cf-cities"
              className={field(Boolean(errors.target_cities))}
              value={cityText}
              onChange={(e) => {
                setCityText(e.target.value);
                setErrors((x) => (x.target_cities ? { ...x, target_cities: '' } : x));
              }}
              placeholder="e.g. Vapi, Valsad"
            />
            <datalist id="cf-cities">
              {(masters?.cities ?? []).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="mt-1.5 text-sm text-slate-400">Separate several cities with a comma.</p>
            <FieldError message={errors.target_cities} />
          </div>
          <div>
            <label htmlFor="cf-state">Target State</label>
            <select id="cf-state" className={field()} value={values.target_state ?? ''} onChange={(e) => set('target_state', e.target.value || null)}>
              <option value="">Any state</option>
              {(masters?.states ?? []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cf-industry">Target Industry</label>
            <select id="cf-industry" className={field(Boolean(errors.industry_id))} value={values.industry_id ?? ''} onChange={(e) => set('industry_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">Any industry</option>
              {(masters?.industries ?? []).map((i) => (
                <option key={i.industry_id} value={i.industry_id}>{i.name}</option>
              ))}
            </select>
            <FieldError message={errors.industry_id} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div>
            <label htmlFor="cf-start">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input id="cf-start" type="date" className={field(Boolean(errors.start_date))} value={values.start_date} onChange={(e) => set('start_date', e.target.value)} aria-invalid={Boolean(errors.start_date)} />
            <FieldError message={errors.start_date} />
          </div>
          <div>
            <label htmlFor="cf-end">
              End Date <span className="text-red-500">*</span>
            </label>
            <input id="cf-end" type="date" className={field(Boolean(errors.end_date))} value={values.end_date} min={values.start_date || undefined} onChange={(e) => set('end_date', e.target.value)} aria-invalid={Boolean(errors.end_date)} />
            <FieldError message={errors.end_date} />
          </div>
        </div>

        <div>
          <label htmlFor="cf-objective">Campaign Objective</label>
          <input id="cf-objective" className={field(Boolean(errors.objective))} value={values.objective ?? ''} onChange={(e) => set('objective', e.target.value)} placeholder="e.g. Generate potential ERP enquiries" />
          <FieldError message={errors.objective} />
        </div>

        <div>
          <label htmlFor="cf-description">Description</label>
          <textarea
            id="cf-description"
            rows={4}
            className={`${field(Boolean(errors.description))} resize-y`}
            value={values.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Anything the team should know about this campaign"
          />
          <FieldError message={errors.description} />
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
          <Link to={back} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{editing ? 'Update Campaign' : 'Create Campaign'}</span>
          </button>
        </div>
      </section>
    </form>
  );
};
