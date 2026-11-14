import React, { useEffect, useState } from 'react';
import { Code, Edit3, ExternalLink, Eye, EyeOff, KeyRound, Plus, Save, Server, X } from 'lucide-react';
import { updateProject } from '../api/projects.api';
import type { AssignableEmployee, ProjectItem } from '../types';
import { J_BTN_PRIMARY, J_BTN_SUBTLE, J_INPUT } from '@/shared/ui/JiraModal';
import { TechMultiSelect, joinTech, parseTech } from './TechMultiSelect';

interface CredentialRow {
  admin_label: string;
  admin_id: string;
  admin_password: string;
  show: boolean;
}

interface ProjectTechDeploymentViewProps {
  project: ProjectItem;
  employees: AssignableEmployee[];
  /** Only the Admin and the project's Project Manager can edit; everyone on the project can view. */
  canEdit: boolean;
  onSaved: (updated: ProjectItem) => void;
}

const toDate = (v?: string | null) => (v ? v.split('T')[0] : '');
const showDate = (v?: string | null) => {
  if (!v) return 'Not specified';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const LabelValue: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-[0.04em] text-[#5E6C84]">{label}</span>
    <div className="break-words text-[14px] text-[#172B4D]">{children}</div>
  </div>
);

const LinkOrNone: React.FC<{ href?: string | null; text: string }> = ({ href, text }) =>
  href ? (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[#0052CC] hover:underline">
      {text} <ExternalLink className="h-3 w-3" />
    </a>
  ) : (
    <span className="text-[#97A0AF]">Not specified</span>
  );

export const ProjectTechDeploymentView: React.FC<ProjectTechDeploymentViewProps> = ({ project, employees, canEdit, onSaved }) => {
  const [sub, setSub] = useState<'tech' | 'deployment'>('tech');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<number[]>([]);

  const [frontend, setFrontend] = useState<string[]>([]);
  const [backend, setBackend] = useState<string[]>([]);
  const [cloud, setCloud] = useState<string[]>([]);
  const [database, setDatabase] = useState<string[]>([]);
  const [vercelAccount, setVercelAccount] = useState('');
  const [vercelLink, setVercelLink] = useState('');
  const [domainLink, setDomainLink] = useState('');
  const [storageAccount, setStorageAccount] = useState('');
  const [deploymentDate, setDeploymentDate] = useState('');
  const [goLiveDate, setGoLiveDate] = useState('');
  const [doneBy, setDoneBy] = useState<string>('');
  const [adminLoginLink, setAdminLoginLink] = useState('');
  const [credentials, setCredentials] = useState<CredentialRow[]>([]);

  // Fill the form from the saved project (again after a save or when the project changes)
  useEffect(() => {
    setFrontend(parseTech(project.tech_frontend));
    setBackend(parseTech(project.tech_backend));
    setCloud(parseTech(project.tech_cloud));
    setDatabase(parseTech(project.tech_database));
    const d = project.deployment;
    setVercelAccount(d?.vercel_account || '');
    setVercelLink(d?.vercel_link || '');
    setDomainLink(d?.domain_link || '');
    setStorageAccount(d?.storage_account || '');
    setDeploymentDate(toDate(d?.deployment_date));
    setGoLiveDate(toDate(d?.go_live_date));
    setDoneBy(d?.deployment_done_by ? String(d.deployment_done_by) : '');
    setAdminLoginLink(d?.admin_login_link || '');
    setCredentials(
      (project.credentials ?? []).map((c) => ({
        admin_label: c.admin_label || '',
        admin_id: c.admin_id,
        admin_password: c.admin_password_encrypted || '',
        show: false,
      })),
    );
  }, [project]);

  const cancel = () => {
    setEditing(false);
    setError(null);
    setFrontend(parseTech(project.tech_frontend));
    setBackend(parseTech(project.tech_backend));
    setCloud(parseTech(project.tech_cloud));
    setDatabase(parseTech(project.tech_database));
    // Deployment fields are refilled by the effect when the project reloads; reset them here too
    const d = project.deployment;
    setVercelAccount(d?.vercel_account || '');
    setVercelLink(d?.vercel_link || '');
    setDomainLink(d?.domain_link || '');
    setStorageAccount(d?.storage_account || '');
    setDeploymentDate(toDate(d?.deployment_date));
    setGoLiveDate(toDate(d?.go_live_date));
    setDoneBy(d?.deployment_done_by ? String(d.deployment_done_by) : '');
    setAdminLoginLink(d?.admin_login_link || '');
    setCredentials(
      (project.credentials ?? []).map((c) => ({
        admin_label: c.admin_label || '',
        admin_id: c.admin_id,
        admin_password: c.admin_password_encrypted || '',
        show: false,
      })),
    );
  };

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const updated = await updateProject(project.project_id, {
        // An empty text clears the list
        tech_frontend: joinTech(frontend),
        tech_backend: joinTech(backend),
        tech_cloud: joinTech(cloud),
        tech_database: joinTech(database),
        deployment: {
          vercel_account: vercelAccount.trim() || undefined,
          vercel_link: vercelLink.trim() || undefined,
          domain_link: domainLink.trim() || undefined,
          storage_account: storageAccount.trim() || undefined,
          deployment_date: deploymentDate || undefined,
          go_live_date: goLiveDate || undefined,
          deployment_done_by: doneBy ? Number(doneBy) : undefined,
          admin_login_link: adminLoginLink.trim() || undefined,
        },
        credentials: credentials
          .filter((c) => c.admin_id.trim() && c.admin_password.trim())
          .map((c) => ({
            admin_label: c.admin_label.trim() || 'Admin',
            admin_id: c.admin_id.trim(),
            admin_password: c.admin_password.trim(),
          })),
      });
      onSaved(updated);
      setEditing(false);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Could not save the details.');
    } finally {
      setSaving(false);
    }
  };

  const setCred = (i: number, patch: Partial<CredentialRow>) =>
    setCredentials((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const tab = (id: 'tech' | 'deployment', label: string, Icon: React.ElementType) => (
    <button
      type="button"
      onClick={() => setSub(id)}
      className={`inline-flex h-8 items-center gap-1.5 rounded-[3px] px-3 text-[13px] font-medium transition ${
        sub === id ? 'bg-[#DEEBFF] text-[#0052CC]' : 'text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  const techGroups: Array<[string, string | null | undefined]> = [
    ['Front-End', project.tech_frontend],
    ['Back-End', project.tech_backend],
    ['Cloud Platform', project.tech_cloud],
    ['Database', project.tech_database],
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[20px] font-medium text-[#172B4D]">Details</h3>
          <p className="text-[13px] text-[#5E6C84]">
            Tech Stack and Deployment Details. Everyone on the project can view; only the Admin and the Project Manager can edit.
          </p>
        </div>
        {canEdit &&
          (editing ? (
            <div className="flex gap-2">
              <button type="button" onClick={cancel} disabled={saving} className={J_BTN_SUBTLE}>
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving} className={J_BTN_PRIMARY}>
                <Save className="mr-1 inline h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className={J_BTN_PRIMARY}>
              <Edit3 className="mr-1 inline h-3.5 w-3.5" />
              Edit
            </button>
          ))}
      </div>

      {error && <div className="mb-3 rounded-[3px] bg-[#FFEBE6] px-3 py-2 text-[13px] text-[#BF2600]">{error}</div>}

      <div className="mb-4 flex gap-1 border-b border-[#DFE1E6] pb-2">
        {tab('tech', 'Tech Stack', Code)}
        {tab('deployment', 'Deployment Details', Server)}
      </div>

      {sub === 'tech' &&
        (editing ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TechMultiSelect lookupType="tech_frontend" label="Front-End" values={frontend} onChange={setFrontend} />
            <TechMultiSelect lookupType="tech_backend" label="Back-End" values={backend} onChange={setBackend} />
            <TechMultiSelect lookupType="tech_cloud" label="Cloud Platform" values={cloud} onChange={setCloud} />
            <TechMultiSelect lookupType="tech_database" label="Database" values={database} onChange={setDatabase} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {techGroups.map(([label, value]) => {
              const items = parseTech(value);
              return (
                <div key={label} className="rounded-[3px] border border-[#DFE1E6] bg-[#FAFBFC] p-4">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.04em] text-[#5E6C84]">{label}</span>
                  {items.length === 0 ? (
                    <span className="text-[13px] text-[#97A0AF]">Not specified</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((t) => (
                        <span key={t} className="rounded-[3px] bg-[#DEEBFF] px-2 py-0.5 text-[12px] font-semibold text-[#0747A6]">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

      {sub === 'deployment' &&
        (editing ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#5E6C84]">Vercel Account</label>
                <input type="text" value={vercelAccount} onChange={(e) => setVercelAccount(e.target.value)} className={J_INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#5E6C84]">Vercel Link</label>
                <input type="url" value={vercelLink} onChange={(e) => setVercelLink(e.target.value)} placeholder="https://" className={J_INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#5E6C84]">Domain Link</label>
                <input type="url" value={domainLink} onChange={(e) => setDomainLink(e.target.value)} placeholder="https://" className={J_INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#5E6C84]">Storage Account</label>
                <input type="text" value={storageAccount} onChange={(e) => setStorageAccount(e.target.value)} className={J_INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#5E6C84]">Deployment Date</label>
                <input type="date" value={deploymentDate} onChange={(e) => setDeploymentDate(e.target.value)} className={J_INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#5E6C84]">Go Live Date</label>
                <input type="date" value={goLiveDate} onChange={(e) => setGoLiveDate(e.target.value)} className={J_INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#5E6C84]">Deployment Done By</label>
                <select value={doneBy} onChange={(e) => setDoneBy(e.target.value)} className={J_INPUT}>
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.emp_id} value={emp.emp_id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#5E6C84]">Admin Login Link</label>
                <input type="url" value={adminLoginLink} onChange={(e) => setAdminLoginLink(e.target.value)} placeholder="https://" className={J_INPUT} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#172B4D]">Admin logins</span>
                <button
                  type="button"
                  onClick={() => setCredentials((rows) => [...rows, { admin_label: '', admin_id: '', admin_password: '', show: false }])}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-[#0052CC] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add login
                </button>
              </div>
              {credentials.length === 0 && <p className="text-[13px] text-[#97A0AF]">No logins yet. Use Add login.</p>}
              <div className="space-y-2">
                {credentials.map((c, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={c.admin_label}
                      onChange={(e) => setCred(i, { admin_label: e.target.value })}
                      className={J_INPUT}
                    />
                    <input
                      type="text"
                      placeholder="Admin ID / Username"
                      value={c.admin_id}
                      onChange={(e) => setCred(i, { admin_id: e.target.value })}
                      className={J_INPUT}
                    />
                    <div className="relative">
                      <input
                        type={c.show ? 'text' : 'password'}
                        placeholder="Admin Password"
                        autoComplete="new-password"
                        value={c.admin_password}
                        onChange={(e) => setCred(i, { admin_password: e.target.value })}
                        className={`${J_INPUT} pr-9`}
                      />
                      <button
                        type="button"
                        aria-label={c.show ? 'Hide password' : 'Show password'}
                        onClick={() => setCred(i, { show: !c.show })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5E6C84] hover:text-[#172B4D]"
                      >
                        {c.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove login"
                      onClick={() => setCredentials((rows) => rows.filter((_, idx) => idx !== i))}
                      className="flex h-9 w-9 items-center justify-center rounded-[3px] text-[#DE350B] hover:bg-[#FFEBE6]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-[#5E6C84]">A login needs both an ID and a password to be saved.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <LabelValue label="Vercel Account">{project.deployment?.vercel_account || <span className="text-[#97A0AF]">Not specified</span>}</LabelValue>
              <LabelValue label="Vercel Link">
                <LinkOrNone href={project.deployment?.vercel_link} text="Open Vercel" />
              </LabelValue>
              <LabelValue label="Domain Link">
                <LinkOrNone href={project.deployment?.domain_link} text="Open website" />
              </LabelValue>
              <LabelValue label="Storage Account">{project.deployment?.storage_account || <span className="text-[#97A0AF]">Not specified</span>}</LabelValue>
              <LabelValue label="Deployment Date">{showDate(project.deployment?.deployment_date)}</LabelValue>
              <LabelValue label="Go Live Date">{showDate(project.deployment?.go_live_date)}</LabelValue>
              <LabelValue label="Deployment Done By">{project.deployment?.deployment_done_by_name || <span className="text-[#97A0AF]">Not specified</span>}</LabelValue>
              <LabelValue label="Admin Login Link">
                <LinkOrNone href={project.deployment?.admin_login_link} text="Open admin login" />
              </LabelValue>
            </div>

            <div>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.04em] text-[#5E6C84]">Admin logins</span>
              {(project.credentials ?? []).length === 0 ? (
                <p className="text-[13px] text-[#97A0AF]">No logins added yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(project.credentials ?? []).map((c) => {
                    const on = shown.includes(c.credential_id);
                    return (
                      <div key={c.credential_id} className="rounded-[3px] border border-[#DFE1E6] bg-[#FAFBFC] p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#5E6C84]">{c.admin_label || 'Admin'}</span>
                          <KeyRound className="h-3.5 w-3.5 text-[#97A0AF]" />
                        </div>
                        <div className="truncate font-mono text-[13px] text-[#172B4D]">ID: {c.admin_id}</div>
                        <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[13px] text-[#172B4D]">
                          <span className="truncate">Password: {on ? c.admin_password_encrypted : '••••••••'}</span>
                          <button
                            type="button"
                            aria-label={on ? 'Hide password' : 'Show password'}
                            onClick={() => setShown((ids) => (on ? ids.filter((x) => x !== c.credential_id) : [...ids, c.credential_id]))}
                            className="shrink-0 text-[#5E6C84] hover:text-[#172B4D]"
                          >
                            {on ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
};
