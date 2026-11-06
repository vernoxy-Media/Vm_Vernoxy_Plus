import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Bug, CalendarDays, CheckCircle2, KeyRound, Loader2, LogOut, Mail, ShieldCheck, User } from 'lucide-react';
import { ClientApiError, clientApi, clientToken, type ClientProject, type ClientProjectDetail, type ClientUser } from './client-api';

const INPUT =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20';
const BUTTON =
  'inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-[15px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-slate-100 text-slate-700' },
  planning: { label: 'Planning', cls: 'bg-indigo-50 text-indigo-700' },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-800' },
  in_progress: { label: 'In progress', cls: 'bg-blue-50 text-blue-700' },
  review: { label: 'In review', cls: 'bg-purple-50 text-purple-700' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700' },
  on_hold: { label: 'On hold', cls: 'bg-orange-50 text-orange-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700' },
};
const status = (s: string) => STATUS_LABEL[s] ?? { label: s.replace(/_/g, ' '), cls: 'bg-slate-100 text-slate-700' };
const niceDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const Shell: React.FC<{ children: React.ReactNode; user?: ClientUser | null; onLogout?: () => void }> = ({ children, user, onLogout }) => (
  <div className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">V</span>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold text-slate-900">Vernoxy Pulse</p>
            <p className="text-xs text-slate-500">Client portal{user ? ` · ${user.client_name}` : ''}</p>
          </div>
        </div>
        {user && onLogout && (
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-sm text-slate-600 sm:flex">
              <User className="h-4 w-4" /> {user.name}
            </span>
            <button type="button" onClick={onLogout} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
    <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
  </div>
);

const Card: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
    {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
    <div className="mt-6">{children}</div>
  </div>
);

const Problem: React.FC<{ text: string | null }> = ({ text }) =>
  text ? (
    <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {text}
    </p>
  ) : null;

/** Sign in, and the forgot-password steps (email, then the emailed code and a new password). */
const LoginScreen: React.FC<{ onSignedIn: () => void }> = ({ onSignedIn }) => {
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'login') {
    return (
      <Card title="Sign in" subtitle="See how your project is going. Use the email and password your contact gave you.">
        <Problem text={error} />
        {info && <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const r = await clientApi.login(email, password);
              clientToken.set(r.access_token);
              onSignedIn();
            });
          }}
        >
          <div>
            <label htmlFor="c-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input id="c-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label htmlFor="c-pass" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input id="c-pass" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
          </div>
          <button type="submit" disabled={busy} className={BUTTON}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
          </button>
          <button type="button" onClick={() => { setMode('forgot'); setError(null); setInfo(null); }} className="w-full cursor-pointer text-center text-sm font-medium text-blue-700 hover:underline">
            Forgot password?
          </button>
        </form>
      </Card>
    );
  }

  if (mode === 'forgot') {
    return (
      <Card title="Forgot password" subtitle="Enter your email. We send a 6-digit code to it.">
        <Problem text={error} />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await clientApi.forgot(email);
              setMode('reset');
            });
          }}
        >
          <input type="email" required placeholder="you@company.com" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
          <button type="submit" disabled={busy} className={BUTTON}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send code
          </button>
          <button type="button" onClick={() => setMode('login')} className="w-full cursor-pointer text-center text-sm font-medium text-slate-600 hover:underline">Back to sign in</button>
        </form>
      </Card>
    );
  }

  return (
    <Card title="Choose a new password" subtitle={`We sent a code to ${email}. It works for 15 minutes.`}>
      <Problem text={error} />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await clientApi.reset(email, code.trim(), password);
            setPassword('');
            setCode('');
            setInfo('Your password is changed. Sign in with the new password.');
            setMode('login');
          });
        }}
      >
        <input inputMode="numeric" maxLength={6} required placeholder="6-digit code" aria-label="Code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className={`${INPUT} tracking-[0.4em]`} />
        <input type="password" required autoComplete="new-password" placeholder="New password (8+ characters, letters and a number)" aria-label="New password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
        <button type="submit" disabled={busy || code.length !== 6} className={BUTTON}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Change password
        </button>
        <button type="button" onClick={() => setMode('login')} className="w-full cursor-pointer text-center text-sm font-medium text-slate-600 hover:underline">Back to sign in</button>
      </form>
    </Card>
  );
};

/** The first sign in uses a temporary password: it has to be changed before anything else. */
const ChangePassword: React.FC<{ forced: boolean; onDone: () => void }> = ({ forced, onDone }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card title={forced ? 'Set your own password' : 'Change password'} subtitle={forced ? 'You signed in with a temporary password. Choose one only you know.' : undefined}>
      <Problem text={error} />
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (next !== again) return setError('The two new passwords are not the same.');
          setBusy(true);
          setError(null);
          try {
            await clientApi.changePassword(current, next);
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not change the password.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <input type="password" required autoComplete="current-password" placeholder={forced ? 'Temporary password' : 'Current password'} aria-label="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} className={INPUT} />
        <input type="password" required autoComplete="new-password" placeholder="New password (8+ characters, letters and a number)" aria-label="New password" value={next} onChange={(e) => setNext(e.target.value)} className={INPUT} />
        <input type="password" required autoComplete="new-password" placeholder="New password again" aria-label="New password again" value={again} onChange={(e) => setAgain(e.target.value)} className={INPUT} />
        <button type="submit" disabled={busy} className={BUTTON}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Save password
        </button>
        {!forced && <Link to="/client" className="block text-center text-sm font-medium text-slate-600 hover:underline">Cancel</Link>}
      </form>
    </Card>
  );
};

const Bar: React.FC<{ percent: number; done?: boolean }> = ({ percent, done }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
    <div className={`h-full rounded-full ${done || percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${percent}%` }} />
  </div>
);

const ProjectsList: React.FC = () => {
  const [projects, setProjects] = useState<ClientProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    clientApi.projects().then(setProjects).catch((e) => setError(e instanceof Error ? e.message : 'Could not load your projects.'));
  }, []);

  if (error) return <Problem text={error} />;
  if (!projects) return <div className="flex h-40 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Your projects</h1>
      <p className="mt-1 text-sm text-slate-600">{projects.length === 0 ? 'No project is linked to your account yet.' : `${projects.length} project${projects.length === 1 ? '' : 's'}`}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {projects.map((p) => {
          const st = status(p.project_status);
          return (
            <li key={p.project_id}>
              <Link to={`/client/projects/${p.project_id}`} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">{p.project_no}</p>
                    <h2 className="truncate text-lg font-semibold text-slate-900">{p.project_name}</h2>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-600">Progress</span><b className="text-slate-900">{p.progress_percent}%</b></div>
                  <Bar percent={p.progress_percent} done={p.project_status === 'delivered'} />
                  <p className="mt-1.5 text-xs text-slate-500">{p.tasks_done} of {p.tasks_total} tasks done</p>
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-sm text-slate-600"><CalendarDays className="h-4 w-4" /> {niceDate(p.start_date)} → {niceDate(p.deadline)}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const ProjectView: React.FC = () => {
  const { id } = useParams();
  const [p, setP] = useState<ClientProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    clientApi.project(Number(id)).then(setP).catch((e) => setError(e instanceof Error ? e.message : 'Could not load this project.'));
  }, [id]);

  const back = <Link to="/client" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"><ArrowLeft className="h-4 w-4" /> All projects</Link>;
  if (error) return <div>{back}<Problem text={error} /></div>;
  if (!p) return <div className="flex h-40 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const st = status(p.project_status);
  const stages = [
    ['To do', p.tasks_by_stage.to_do, 'bg-slate-400'],
    ['In progress', p.tasks_by_stage.in_progress, 'bg-blue-500'],
    ['On hold', p.tasks_by_stage.on_hold, 'bg-orange-400'],
    ['In review', p.tasks_by_stage.in_review, 'bg-purple-500'],
    ['Done', p.tasks_by_stage.done, 'bg-emerald-500'],
  ] as const;

  return (
    <div className="space-y-6">
      {back}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">{p.project_no}</p>
            <h1 className="text-2xl font-semibold text-slate-900">{p.project_name}</h1>
          </div>
          <span className={`rounded-md px-2.5 py-1 text-sm font-semibold ${st.cls}`}>{st.label}</span>
        </div>
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-600">Overall progress</span><b className="text-slate-900">{p.progress_percent}%</b></div>
          <Bar percent={p.progress_percent} done={p.project_status === 'delivered'} />
        </div>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-slate-500">Start</dt><dd className="font-medium text-slate-900">{niceDate(p.start_date)}</dd></div>
          <div><dt className="text-slate-500">{p.actual_end_date ? 'Delivered on' : 'Due'}</dt><dd className="font-medium text-slate-900">{niceDate(p.actual_end_date ?? p.deadline)}</dd></div>
          <div><dt className="text-slate-500">Project manager</dt><dd className="font-medium text-slate-900">{p.manager_name ?? '—'}</dd></div>
        </dl>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><CheckCircle2 className="h-4 w-4 text-slate-500" /> Work</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {stages.map(([label, n, dot]) => (
              <li key={label} className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} /> {label}</span><b className="text-slate-900">{n}</b></li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Bug className="h-4 w-4 text-slate-500" /> Issues</h2>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{p.open_bugs}</p>
          <p className="text-sm text-slate-600">open {p.open_bugs === 1 ? 'issue' : 'issues'} being fixed</p>
        </div>
      </div>

      {p.sprints.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Phases</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {p.sprints.map((s) => (
              <li key={s.sprint_id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{s.name} <span className="ml-1 text-xs font-normal text-slate-500">{s.status === 'active' ? 'In progress' : s.status === 'completed' ? 'Completed' : 'Planned'}</span></p>
                  <p className="text-xs text-slate-500">{niceDate(s.start_date)} → {niceDate(s.end_date)}</p>
                </div>
                <div className="mt-2 flex items-center gap-3"><div className="flex-1"><Bar percent={s.progress_percent} /></div><span className="w-10 text-right text-sm font-medium text-slate-700">{s.progress_percent}%</span></div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> You see only your own projects. Nothing here can be changed.</p>
    </div>
  );
};

/** /client: the whole client portal, apart from the employees' app. */
export const ClientPortalApp: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(Boolean(clientToken.get()));

  const load = useCallback(async () => {
    if (!clientToken.get()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await clientApi.me());
    } catch (e) {
      if (e instanceof ClientApiError && (e.status === 401 || e.status === 403)) clientToken.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const signOut = () => {
    clientToken.clear();
    setUser(null);
    navigate('/client');
  };

  if (loading) return <Shell><div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div></Shell>;
  if (!user) return <Shell><LoginScreen onSignedIn={() => { setLoading(true); load(); }} /></Shell>;
  if (user.must_change_password) return <Shell user={user} onLogout={signOut}><ChangePassword forced onDone={load} /></Shell>;

  return (
    <Shell user={user} onLogout={signOut}>
      <Routes>
        <Route index element={<ProjectsList />} />
        <Route path="projects/:id" element={<ProjectView />} />
        <Route path="password" element={<ChangePassword forced={false} onDone={() => navigate('/client')} />} />
        <Route path="*" element={<Navigate to="/client" replace />} />
      </Routes>
      <p className="mt-10 text-center text-xs text-slate-500"><Link to="/client/password" className="hover:underline">Change password</Link></p>
    </Shell>
  );
};
