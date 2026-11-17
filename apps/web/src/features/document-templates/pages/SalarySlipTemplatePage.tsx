import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { btn, filterCls } from '@/features/payroll/components/payroll-ui';
import { useSlipPreviewEmployeesQuery, useSlipPreviewRunsQuery } from '@/features/payroll/hooks/use-payroll';
import { EditorContext, TemplateEditor } from '../components/TemplateEditor';

/** Upload / replace / remove one of the layout's own images (letterhead, signature). */
const ImageControl: React.FC<{
  ctx: EditorContext;
  kind: 'letterhead' | 'signature';
  assetId: number | null;
  onChange: (id: number | null) => void;
  labels: { add: string; replace: string; remove: string };
  hint: string;
}> = ({ ctx, kind, assetId, onChange, labels, hint }) => {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          const id = await ctx.uploadImage(kind, file);
          if (id) onChange(id);
        }}
      />
      <button type="button" className={btn.secondary} onClick={() => input.current?.click()} disabled={ctx.uploading}>
        {ctx.uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {assetId ? labels.replace : labels.add}
      </button>
      {assetId && (
        <button type="button" className={btn.secondary} onClick={() => onChange(null)}>
          {labels.remove}
        </button>
      )}
      <span className="text-[11px] text-slate-400">{hint}</span>
    </div>
  );
};

/**
 * Settings → Salary Slip Template (Admin). Test slips use sample data or a real employee's payroll
 * of a month. Payroll makes real slips from the approved version only; amounts and days always come
 * from Payroll and cannot be typed in here.
 */
export const SalarySlipTemplatePage: React.FC = () => {
  const { data: runs = [], isLoading: loadingRuns } = useSlipPreviewRunsQuery();
  const [testMode, setTestMode] = useState<'sample' | 'real'>('sample');
  const [ym, setYm] = useState('');
  const [testEmp, setTestEmp] = useState<number | ''>('');

  useEffect(() => {
    if (!ym && runs[0]) setYm(`${runs[0].year}-${String(runs[0].month).padStart(2, '0')}`);
  }, [runs, ym]);

  const year = ym ? Number(ym.slice(0, 4)) : undefined;
  const month = ym ? Number(ym.slice(5, 7)) : undefined;
  const selectedRun = runs.find((r) => r.year === year && r.month === month);
  const { data: onRun, isLoading: loadingEmps } = useSlipPreviewEmployeesQuery(year, month, testMode === 'real' && Boolean(year && month));
  const employees = onRun?.employees ?? [];

  useEffect(() => {
    if (testEmp && employees.length && !employees.some((e) => e.emp_id === testEmp)) setTestEmp('');
  }, [employees, testEmp]);

  const subject = useMemo(() => {
    if (testMode !== 'real' || !testEmp || !year || !month) return null;
    return { year, month, emp_id: Number(testEmp) };
  }, [testMode, testEmp, year, month]);

  const emptyPreview =
    testMode !== 'real'
      ? null
      : loadingRuns
        ? 'Loading payroll months…'
        : runs.length === 0
          ? 'There is no payroll yet. Start a month in Payroll, then pick it here to preview a real slip.'
          : !selectedRun
            ? 'Pick a payroll month that has been started.'
            : loadingEmps
              ? 'Loading people on this payroll…'
              : !onRun?.exists
                ? `There is no payroll for this month yet. Start it in Payroll, or stay on sample data.`
                : employees.length === 0
                  ? 'This payroll has no employees yet.'
                  : !testEmp
                    ? 'Choose an employee on this payroll to preview their slip.'
                    : null;

  return (
    <TemplateEditor
      kind="payroll_salary_slip"
      heading="Salary Slip Template"
      intro="Choose what the slip shows and how it is labelled. Amounts and days always come from Payroll."
      documentsName="Salary Slips"
      subject={subject}
      emptyPreview={emptyPreview}
      printLabel="Print test slip"
      testToolbar={
        <>
          <select className={filterCls} value={testMode} onChange={(e) => setTestMode(e.target.value as 'sample' | 'real')} aria-label="Test data">
            <option value="sample">Sample data</option>
            <option value="real">A real employee's payroll</option>
          </select>
          {testMode === 'real' && (
            <>
              <select className={filterCls} value={ym} onChange={(e) => setYm(e.target.value)} aria-label="Payroll month" disabled={runs.length === 0}>
                {runs.length === 0 ? (
                  <option value="">No payroll months</option>
                ) : (
                  runs.map((r) => (
                    <option key={`${r.year}-${r.month}`} value={`${r.year}-${String(r.month).padStart(2, '0')}`}>
                      {r.label}
                      {r.status ? ` · ${r.status.replace(/_/g, ' ').toLowerCase()}` : ''}
                    </option>
                  ))
                )}
              </select>
              <select
                className={`${filterCls} min-w-[180px] flex-1`}
                value={testEmp}
                onChange={(e) => setTestEmp(e.target.value ? Number(e.target.value) : '')}
                aria-label="Employee"
                disabled={!employees.length}
              >
                <option value="">{employees.length ? 'Choose employee' : 'No one on this payroll'}</option>
                {employees.map((e) => (
                  <option key={e.emp_id} value={e.emp_id}>
                    {e.name}
                    {e.employee_code ? ` (${e.employee_code})` : ''}
                  </option>
                ))}
              </select>
            </>
          )}
        </>
      }
      renderTopExtras={(ctx) => (
        <ImageControl
          ctx={ctx}
          kind="letterhead"
          assetId={ctx.layout.letterhead_asset_id}
          onChange={(id) => ctx.setLayout({ ...ctx.layout, letterhead_asset_id: id })}
          labels={{ add: 'Add letterhead', replace: 'Replace letterhead', remove: 'Remove letterhead' }}
          hint="A4 PNG or JPG, up to 10 MB. The slip is placed inside its empty middle area."
        />
      )}
      renderSectionExtras={(sectionKey, ctx) =>
        sectionKey === 'signature' ? (
          <ImageControl
            ctx={ctx}
            kind="signature"
            assetId={ctx.layout.signature_asset_id}
            onChange={(id) => ctx.setLayout({ ...ctx.layout, signature_asset_id: id })}
            labels={{ add: 'Upload signature', replace: 'Replace signature', remove: 'Remove signature' }}
            hint="PNG with a transparent background works best (or JPG). Empty margins are trimmed."
          />
        ) : null
      }
    />
  );
};

export default SalarySlipTemplatePage;
