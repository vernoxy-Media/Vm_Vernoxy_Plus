import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useCampaign, useCampaignMasters, useCreateCampaign, useUpdateCampaign } from '../hooks/useCampaigns';
import { parseApiError } from '../utils/error';
import { CAMPAIGN_STATUSES, CAMPAIGN_TYPES, type CampaignFormValues } from '../types/campaign.types';
import { FieldError, cardCls, inputCls, labelCls, primaryBtn, secondaryBtn, textareaCls } from '../components/campaigns/campaign-ui';

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
    status: 'Draft',
  };
}

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
  const [cityInput, setCityInput] = useState('');
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
  }, [existing.data]);

  const set = <K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: '' } : e));
  };

  const addCity = (raw: string) => {
    const city = raw.trim().replace(/,+$/, '').trim();
    if (!city) return;
    if (!values.target_cities.some((c) => c.toLowerCase() === city.toLowerCase())) set('target_cities', [...values.target_cities, city]);
    setCityInput('');
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
    // A city typed but not yet added with Enter still counts.
    const cities = cityInput.trim() ? [...values.target_cities, cityInput.trim()] : values.target_cities;
    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setFormError(null);
    const body: CampaignFormValues = {
      ...values,
      name: values.name.trim(),
      target_cities: cities,
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

  if (editing && existing.isLoading) return <p className="py-12 text-center text-sm text-gray-500">Loading…</p>;
  if (editing && existing.isError) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <p role="alert" className="text-sm text-rose-600">{parseApiError(existing.error).message}</p>
        <Link to="/sales/campaigns" className={`${secondaryBtn} mt-4`}>Back to campaigns</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-12">
      <div>
        <Link to={back} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> {editing ? 'Back to campaign' : 'Back to campaigns'}
        </Link>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{editing ? 'Edit campaign' : 'New campaign'}</h1>
        {!editing && <p className="mt-0.5 text-sm text-gray-500">After saving you choose the companies and share them with your Sales team.</p>}
      </div>

      <form onSubmit={submit} noValidate className={`${cardCls} space-y-5 p-5`}>
        {formError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {formError}
          </div>
        )}

        <div>
          <label className={labelCls} htmlFor="cf-name">Campaign name <span className="text-rose-500">*</span></label>
          <input id="cf-name" className={inputCls} value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="Vapi Industrial Outreach – November 2026" maxLength={200} aria-invalid={Boolean(errors.name)} />
          <FieldError message={errors.name} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="cf-type">Campaign type</label>
            <select id="cf-type" className={inputCls} value={values.campaign_type} onChange={(e) => set('campaign_type', e.target.value)}>
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {values.campaign_type !== 'Calling' && <p className="mt-1 text-[12px] text-gray-500">Calling works now. Meetings are counted from the Meeting follow-ups your team already schedules.</p>}
            <FieldError message={errors.campaign_type} />
          </div>
          <div>
            <label className={labelCls} htmlFor="cf-status">Campaign status</label>
            <select id="cf-status" className={inputCls} value={values.status} onChange={(e) => set('status', e.target.value)}>
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="mt-1 text-[12px] text-gray-500">Employees see a campaign, and can log calls, only while it is Active.</p>
            <FieldError message={errors.status} />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="cf-city">Target city or cities</label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-2 shadow-2xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
            {values.target_cities.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {c}
                <button type="button" aria-label={`Remove ${c}`} onClick={() => set('target_cities', values.target_cities.filter((x) => x !== c))} className="text-blue-400 hover:text-blue-700">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              id="cf-city"
              list="cf-cities"
              className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm focus:outline-none"
              value={cityInput}
              placeholder={values.target_cities.length ? 'Add another city' : 'Type a city and press Enter'}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addCity(cityInput);
                } else if (e.key === 'Backspace' && !cityInput && values.target_cities.length) {
                  set('target_cities', values.target_cities.slice(0, -1));
                }
              }}
              onBlur={() => addCity(cityInput)}
            />
            <datalist id="cf-cities">
              {(masters?.cities ?? []).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <p className="mt-1 text-[12px] text-gray-500">This describes the campaign. The companies themselves are chosen in the next step.</p>
          <FieldError message={errors.target_cities} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="cf-state">Target state</label>
            <select id="cf-state" className={inputCls} value={values.target_state ?? ''} onChange={(e) => set('target_state', e.target.value || null)}>
              <option value="">Any state</option>
              {(masters?.states ?? []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="cf-industry">Target industry</label>
            <select id="cf-industry" className={inputCls} value={values.industry_id ?? ''} onChange={(e) => set('industry_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">Any industry</option>
              {(masters?.industries ?? []).map((i) => (
                <option key={i.industry_id} value={i.industry_id}>{i.name}</option>
              ))}
            </select>
            <FieldError message={errors.industry_id} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="cf-start">Start date <span className="text-rose-500">*</span></label>
            <input id="cf-start" type="date" className={inputCls} value={values.start_date} onChange={(e) => set('start_date', e.target.value)} aria-invalid={Boolean(errors.start_date)} />
            <FieldError message={errors.start_date} />
          </div>
          <div>
            <label className={labelCls} htmlFor="cf-end">End date <span className="text-rose-500">*</span></label>
            <input id="cf-end" type="date" className={inputCls} value={values.end_date} min={values.start_date || undefined} onChange={(e) => set('end_date', e.target.value)} aria-invalid={Boolean(errors.end_date)} />
            <FieldError message={errors.end_date} />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="cf-objective">Campaign objective</label>
          <input id="cf-objective" className={inputCls} value={values.objective ?? ''} onChange={(e) => set('objective', e.target.value)} placeholder="Generate potential ERP enquiries and schedule product demonstrations" />
          <FieldError message={errors.objective} />
        </div>

        <div>
          <label className={labelCls} htmlFor="cf-description">Description</label>
          <textarea id="cf-description" rows={4} className={textareaCls} value={values.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Anything the team should know about this campaign" />
          <FieldError message={errors.description} />
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Link to={back} className={secondaryBtn}>Cancel</Link>
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create campaign'}
          </button>
        </div>
      </form>
    </div>
  );
};
