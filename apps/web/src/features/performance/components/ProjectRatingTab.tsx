import React, { useEffect, useState } from 'react';
import { Save, Send } from 'lucide-react';
import { perfErrMessage, useMyProjectsQuery, useProjectMembersRatingQuery, useSaveProjectRatingsMutation } from '../hooks/use-performance';
import { StarRating } from './StarRating';
import { Banner, CycleStatusBadge, btn, inputCls } from './perf-ui';

/** BFD Screen 8: Project Rating (Project Manager). */
export const ProjectRatingTab: React.FC<{ cycleId?: number }> = ({ cycleId }) => {
  const { data: projects = [], isLoading: loadingProjects } = useMyProjectsQuery();
  const [projectId, setProjectId] = useState<number | undefined>();
  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].project_id);
  }, [projects, projectId]);
  const { data, isLoading } = useProjectMembersRatingQuery(projectId, cycleId);
  const save = useSaveProjectRatingsMutation();
  const [rows, setRows] = useState<Record<number, { rating: number; comment: string }>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const next: Record<number, { rating: number; comment: string }> = {};
    (data?.members || []).forEach((m) => (next[m.emp_id] = { rating: m.rating || 0, comment: m.comment || '' }));
    setRows(next);
    setError('');
    setNotice('');
  }, [data]);

  const members = data?.members || [];
  const allRated = members.length > 0 && members.every((m) => (rows[m.emp_id]?.rating || 0) >= 1);
  const canEdit = Boolean(data?.can_edit);

  const submit = async (isDraft: boolean) => {
    if (!projectId || !cycleId) return;
    setError('');
    setNotice('');
    try {
      await save.mutateAsync({
        project_id: projectId,
        cycle_id: cycleId,
        is_draft: isDraft,
        ratings: members.map((m) => ({ emp_id: m.emp_id, rating: rows[m.emp_id]?.rating || 0, comment: rows[m.emp_id]?.comment || '' })),
      });
      setNotice(isDraft ? 'Draft saved. Please finish by the 10th.' : 'Ratings submitted.');
    } catch (e) {
      setError(perfErrMessage(e));
    }
  };

  if (!loadingProjects && projects.length === 0) {
    return <div className="p-8 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">You are not the Project Manager of any project.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Project</label>
          <select value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))} className={`${inputCls} min-w-[220px]`}>
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.project_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Project Manager</div>
          <div className="text-xs font-bold text-slate-800">{data?.project?.project_manager_name || projects.find((p) => p.project_id === projectId)?.project_manager_name || '—'}</div>
        </div>
        {data?.cycle && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-slate-600">{data.cycle.cycle_name}</span>
            <CycleStatusBadge status={data.cycle.status} />
          </div>
        )}
      </div>

      {data?.message && <Banner tone={data.submitted ? 'ok' : 'warn'}>{data.message}</Banner>}
      {notice && <Banner tone="ok">{notice}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[720px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Team member</th>
              <th className="text-left px-3 py-3">Role in project</th>
              <th className="text-left px-3 py-3">Rating (1 to 5 stars)</th>
              <th className="text-left px-3 py-3">Comment (optional)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  This project has no members to rate.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.emp_id}>
                <td className="px-4 py-3 font-semibold text-slate-800">{m.name}</td>
                <td className="px-3 py-3 text-slate-600">{m.role_in_project}</td>
                <td className="px-3 py-3">
                  <StarRating
                    value={rows[m.emp_id]?.rating || 0}
                    readonly={!canEdit}
                    size={16}
                    onChange={canEdit ? (v) => setRows((p) => ({ ...p, [m.emp_id]: { ...(p[m.emp_id] || { comment: '' }), rating: v } })) : undefined}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    value={rows[m.emp_id]?.comment || ''}
                    disabled={!canEdit}
                    maxLength={1000}
                    onChange={(e) => setRows((p) => ({ ...p, [m.emp_id]: { ...(p[m.emp_id] || { rating: 0 }), comment: e.target.value } }))}
                    placeholder={canEdit ? 'Optional' : ''}
                    className={inputCls}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {canEdit && members.length > 0 && (
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-100">
            <button type="button" className={btn.secondary} disabled={save.isPending} onClick={() => submit(true)}>
              <Save className="w-3.5 h-3.5" /> Save Draft
            </button>
            <button
              type="button"
              className={btn.primary}
              disabled={save.isPending || !allRated}
              title={allRated ? '' : 'Please give a star rating for every member before you submit.'}
              onClick={() => submit(false)}
            >
              <Send className="w-3.5 h-3.5" /> Submit Rating
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
