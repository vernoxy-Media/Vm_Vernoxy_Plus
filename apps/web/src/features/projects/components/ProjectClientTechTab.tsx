import React, { useEffect, useState } from 'react';
import { Briefcase, Code2, Edit3, ExternalLink, Eye, EyeOff, Loader2, Plus, Server, Trash2 } from 'lucide-react';
import { updateProject } from '../api/projects.api';
import type { ProjectItem } from '../types';

type Section = 'tech' | 'client' | 'deployment';

interface Credential {
  admin_label: string;
  admin_id: string;
  admin_password: string;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 transition focus:border-blue-500 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10';
const labelCls = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400';

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}-${m}-${y}`; // DD-MM-YYYY (BFD 1.6)
};

const Value: React.FC<{ label: string; value?: React.ReactNode; wide?: boolean }> = ({ label, value, wide }) => (
  <div className={wide ? 'sm:col-span-2' : ''}>
    <span className={labelCls}>{label}</span>
    <div className="whitespace-pre-wrap break-words text-xs font-semibold text-slate-800">{value || <span className="font-normal italic text-slate-400">Not set</span>}</div>
  </div>
);

const CardHeader: React.FC<{ icon: React.ElementType; title: string; hint: string; tone: string; action?: React.ReactNode }> = ({ icon: Icon, title, hint, tone, action }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
    <div className="flex items-center gap-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ring-1 ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">{title}</h3>
        <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
      </div>
    </div>
    {action}
  </div>
);

/**
 * Project Management BFD 2.3–2.5: Additional Details (client), Tech Stack and Deployment Details.
 * Tech Stack is visible to everyone; client and deployment only to the Admin and Project Manager,
 * who are also the only ones who can edit (BFD 2.8).
 */
export const ProjectClientTechTab: React.FC<{
  project: ProjectItem;
  canManage: boolean;
  onSaved: (p: ProjectItem) => void;
}> = ({ project, canManage, onSaved }) => {
  const [editing, setEditing] = useState<Section | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [shown, setShown] = useState<number[]>([]);

  const [tech, setTech] = useState({ frontend: '', backend: '', cloud: '' });
  const [client, setClient] = useState({ name: '', lead: '', approved: '' });
  const [dep, setDep] = useState({ vercel_account: '', vercel_link: '', domain_link: '', storage_account: '', deployment_date: '', go_live_date: '', done_by: '', admin_login_link: '' });
  const [creds, setCreds] = useState<Array<Credential & { show?: boolean }>>([]);

  const reset = () => {
    setTech({ frontend: project.tech_frontend || '', backend: project.tech_backend || '', cloud: project.tech_cloud || '' });
    setClient({
      name: project.client_name || '',
      lead: project.lead_received_date?.slice(0, 10) || '',
      approved: project.project_approved_date?.slice(0, 10) || '',
    });
    const d = project.deployment;
    setDep({
      vercel_account: d?.vercel_account || '',
      vercel_link: d?.vercel_link || '',
      domain_link: d?.domain_link || '',
      storage_account: d?.storage_account || '',
      deployment_date: d?.deployment_date?.slice(0, 10) || '',
      go_live_date: d?.go_live_date?.slice(0, 10) || '',
      done_by: d?.deployment_done_by ? String(d.deployment_done_by) : '',
      admin_login_link: d?.admin_login_link || '',
    });
    setCreds((project.credentials || []).map((c) => ({ admin_label: c.admin_label, admin_id: c.admin_id, admin_password: c.admin_password_encrypted || '' })));
  };

  useEffect(reset, [project]);

  const save = async (section: Section) => {
    setMsg(null);
    let payload: any;
    if (section === 'tech') {
      payload = { tech_frontend: tech.frontend.trim(), tech_backend: tech.backend.trim(), tech_cloud: tech.cloud.trim() };
    } else if (section === 'client') {
      if (client.name.length > 150) return setMsg({ tone: 'error', text: 'Client can be up to 150 characters.' });
      if (client.lead && client.approved && client.approved < client.lead) {
        return setMsg({ tone: 'error', text: 'The Project Approved Date cannot be before the Lead Received Date.' });
      }
      payload = { client_name: client.name.trim(), lead_received_date: client.lead || null, project_approved_date: client.approved || null };
    } else {
      const bad = creds.find((c) => (c.admin_id.trim() && !c.admin_password.trim()) || (!c.admin_id.trim() && c.admin_password.trim()));
      if (bad) return setMsg({ tone: 'error', text: 'Each admin login needs both an Admin ID and a password.' });
      payload = {
        deployment: {
          vercel_account: dep.vercel_account.trim(),
          vercel_link: dep.vercel_link.trim(),
          domain_link: dep.domain_link.trim(),
          storage_account: dep.storage_account.trim(),
          deployment_date: dep.deployment_date || undefined,
          go_live_date: dep.go_live_date || undefined,
          deployment_done_by: dep.done_by ? Number(dep.done_by) : undefined,
          admin_login_link: dep.admin_login_link.trim(),
        },
        credentials: creds
          .filter((c) => c.admin_id.trim() && c.admin_password.trim())
          .map((c) => ({ admin_label: c.admin_label.trim() || 'Admin', admin_id: c.admin_id.trim(), admin_password: c.admin_password.trim() })),
      };
    }
    setSaving(true);
    try {
      const updated = await updateProject(project.project_id, payload);
      onSaved(updated);
      setEditing(null);
      setMsg({ tone: 'ok', text: section === 'tech' ? 'Tech Stack saved.' : section === 'client' ? 'Client details saved.' : 'Deployment details saved.' });
    } catch (err: any) {
      setMsg({ tone: 'error', text: err?.detail || err?.message || 'Could not save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const editBtn = (s: Section) =>
    canManage && editing !== s ? (
      <button
        type="button"
        onClick={() => {
          reset();
          setMsg(null);
          setEditing(s);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Edit3 className="h-3.5 w-3.5" /> Edit
      </button>
    ) : null;

  const footer = (s: Section) => (
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => {
          reset();
          setEditing(null);
        }}
        className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => save(s)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
      </button>
    </div>
  );

  const link = (url?: string | null) =>
    url ? (
      <a href={/^https?:\/\//i.test(url) ? url : `https://${url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
        {url} <ExternalLink className="h-3 w-3" />
      </a>
    ) : null;

  const doneByName = project.deployment?.deployment_done_by_name || project.members?.find((m) => m.employee_id === project.deployment?.deployment_done_by)?.name;

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${msg.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{msg.text}</div>
      )}

      {/* Tech Stack (BFD 2.4) */}
      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <CardHeader icon={Code2} title="Tech Stack" hint="Technologies used in the project" tone="bg-violet-50 text-violet-600 ring-violet-100" action={editBtn('tech')} />
        {editing === 'tech' ? (
          <>
            <div className="grid gap-3">
              {(
                [
                  ['frontend', 'Front-End'],
                  ['backend', 'Back-End'],
                  ['cloud', 'Cloud Platform'],
                ] as const
              ).map(([k, l]) => (
                <div key={k}>
                  <label className={labelCls}>{l}</label>
                  <textarea rows={2} className={inputCls} value={tech[k]} onChange={(e) => setTech((t) => ({ ...t, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            {footer('tech')}
          </>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-3">
            <Value label="Front-End" value={project.tech_frontend} />
            <Value label="Back-End" value={project.tech_backend} />
            <Value label="Cloud Platform" value={project.tech_cloud} />
          </div>
        )}
      </div>

      {canManage && (
        <>
          {/* Additional Details (BFD 2.3) */}
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <CardHeader icon={Briefcase} title="Client & Additional Details" hint="Visible only to the Admin and Project Manager" tone="bg-blue-50 text-blue-600 ring-blue-100" action={editBtn('client')} />
            {editing === 'client' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelCls}>Client</label>
                    <input className={inputCls} maxLength={150} value={client.name} onChange={(e) => setClient((c) => ({ ...c, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Lead Received Date</label>
                    <input type="date" className={inputCls} value={client.lead} onChange={(e) => setClient((c) => ({ ...c, lead: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Project Approved Date</label>
                    <input type="date" className={inputCls} min={client.lead || undefined} value={client.approved} onChange={(e) => setClient((c) => ({ ...c, approved: e.target.value }))} />
                  </div>
                </div>
                {footer('client')}
              </>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Value label="Client" value={project.client_name} />
                <Value label="Lead Received Date" value={project.lead_received_date ? fmtDate(project.lead_received_date) : null} />
                <Value label="Project Approved Date" value={project.project_approved_date ? fmtDate(project.project_approved_date) : null} />
              </div>
            )}
          </div>

          {/* Deployment Details (BFD 2.5) */}
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <CardHeader icon={Server} title="Deployment Details" hint="Visible only to the Admin and Project Manager" tone="bg-emerald-50 text-emerald-600 ring-emerald-100" action={editBtn('deployment')} />
            {editing === 'deployment' ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ['vercel_account', 'Vercel Account', 'text'],
                      ['vercel_link', 'Vercel Link', 'url'],
                      ['domain_link', 'Domain Link', 'url'],
                      ['storage_account', 'Storage Account', 'text'],
                      ['deployment_date', 'Date (Deployment)', 'date'],
                      ['go_live_date', 'Go Live Date', 'date'],
                    ] as const
                  ).map(([k, l, t]) => (
                    <div key={k}>
                      <label className={labelCls}>{l}</label>
                      <input type={t} className={inputCls} value={dep[k]} onChange={(e) => setDep((d) => ({ ...d, [k]: e.target.value }))} />
                    </div>
                  ))}
                  <div>
                    <label className={labelCls}>Deployment Done By</label>
                    <select className={inputCls} value={dep.done_by} onChange={(e) => setDep((d) => ({ ...d, done_by: e.target.value }))}>
                      <option value="">Select employee</option>
                      {(project.members || []).map((m) => (
                        <option key={m.employee_id} value={m.employee_id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Admin Login Link</label>
                    <input type="url" className={inputCls} value={dep.admin_login_link} onChange={(e) => setDep((d) => ({ ...d, admin_login_link: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className={labelCls}>Admin ID & Admin Password</label>
                    <button type="button" onClick={() => setCreds((c) => [...c, { admin_label: '', admin_id: '', admin_password: '' }])} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {creds.map((c, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                        <input className={inputCls} placeholder="Label" value={c.admin_label} onChange={(e) => setCreds((list) => list.map((x, j) => (j === i ? { ...x, admin_label: e.target.value } : x)))} />
                        <input className={inputCls} placeholder="Admin ID" value={c.admin_id} onChange={(e) => setCreds((list) => list.map((x, j) => (j === i ? { ...x, admin_id: e.target.value } : x)))} />
                        <div className="relative">
                          <input
                            type={c.show ? 'text' : 'password'}
                            className={`${inputCls} pr-8`}
                            placeholder="Password"
                            value={c.admin_password}
                            autoComplete="new-password"
                            onChange={(e) => setCreds((list) => list.map((x, j) => (j === i ? { ...x, admin_password: e.target.value } : x)))}
                          />
                          <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setCreds((list) => list.map((x, j) => (j === i ? { ...x, show: !x.show } : x)))}>
                            {c.show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => setCreds((list) => list.filter((_, j) => j !== i))} aria-label="Remove login">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {!creds.length && <p className="text-[11px] italic text-slate-400">No admin logins. Click Add to add one.</p>}
                  </div>
                </div>
                {footer('deployment')}
              </>
            ) : (
              <>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Value label="Vercel Account" value={project.deployment?.vercel_account} />
                  <Value label="Vercel Link" value={link(project.deployment?.vercel_link)} />
                  <Value label="Domain Link" value={link(project.deployment?.domain_link)} />
                  <Value label="Storage Account" value={project.deployment?.storage_account} />
                  <Value label="Date (Deployment)" value={project.deployment?.deployment_date ? fmtDate(project.deployment.deployment_date) : null} />
                  <Value label="Go Live Date" value={project.deployment?.go_live_date ? fmtDate(project.deployment.go_live_date) : null} />
                  <Value label="Deployment Done By" value={doneByName} />
                  <Value label="Admin Login Link" value={link(project.deployment?.admin_login_link)} />
                </div>
                <div>
                  <span className={labelCls}>Admin ID & Admin Password</span>
                  {(project.credentials || []).length ? (
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                      {(project.credentials || []).map((c, i) => (
                        <div key={c.credential_id ?? i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                          <span className="font-semibold text-slate-700">{c.admin_label || 'Admin'}</span>
                          <span className="font-mono text-slate-700">{c.admin_id}</span>
                          <span className="flex items-center gap-2 font-mono text-slate-700">
                            {shown.includes(i) ? c.admin_password_encrypted : '••••••••'}
                            <button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => setShown((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))} aria-label="Show password">
                              {shown.includes(i) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400">Not set</p>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
