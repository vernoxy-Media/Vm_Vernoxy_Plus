import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Users2, ArrowUpRight } from 'lucide-react';
import {
  computePersonWiseWorkHours,
  PersonWorkHoursItem,
} from './project-dashboard.utils';
import { EnrichedProjectItem } from './project-dashboard.types';

interface PersonWiseWorkHoursChartProps {
  projects: EnrichedProjectItem[];
  defaultProjectId?: string;
}

export const PersonWiseWorkHoursChart: React.FC<PersonWiseWorkHoursChartProps> = ({
  projects,
  defaultProjectId = 'All',
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId);
  const [hoveredPerson, setHoveredPerson] = useState<PersonWorkHoursItem | null>(null);

  const persons = computePersonWiseWorkHours(projects, selectedProjectId);
  const displayed = persons.slice(0, 6);

  const maxVal = Math.max(
    ...displayed.flatMap((p) => [p.estimatedHours, p.actualHours]),
    100
  );

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              6. Person-wise Work Hours
            </h3>
            <p className="text-[11px] text-slate-500">Individual workload & effort variance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Project Control Selector */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 max-w-[110px] truncate focus:outline-none"
          >
            <option value="All">All Projects</option>
            {projects.map((p) => (
              <option key={p.project_id} value={String(p.project_id)}>
                {p.project_name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            aria-label="KPI Information"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>

          {showTooltip && (
            <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
              <p className="font-semibold text-slate-100 mb-1">Person-wise Work Hours</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Dumbbell chart showing estimated hours (hollow dot) vs actual hours (filled dot) for each team member. Red indicates over-effort and green indicates on or below budget.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dumbbell Chart Visual */}
      <div className="my-3 space-y-3 overflow-visible">
        {displayed.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-slate-400">
            No person work hours found
          </div>
        ) : (
          displayed.map((p, idx) => {
            const estPos = (p.estimatedHours / maxVal) * 80;
            const actPos = (p.actualHours / maxVal) * 80;
            const minPos = Math.min(estPos, actPos);
            const maxPos = Math.max(estPos, actPos);
            const isHovered = hoveredPerson?.employeeId === p.employeeId;

            return (
              <div
                key={p.employeeId}
                className="space-y-1 relative group cursor-pointer p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50/80 transition-colors"
                onMouseEnter={() => setHoveredPerson(p)}
                onMouseLeave={() => setHoveredPerson(null)}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 truncate max-w-[130px]">
                    {p.employeeName}
                  </span>
                  <span
                    className={`font-bold text-[11px] ${
                      p.isOverEstimate ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {p.diffLabel}
                  </span>
                </div>

                {/* Dumbbell Line & Dots */}
                <div className="relative h-4 w-full bg-slate-50 rounded-full flex items-center px-1">
                  {/* Connecting Line */}
                  <div
                    className="absolute h-1 rounded-full transition-all duration-300"
                    style={{
                      left: `${minPos}%`,
                      width: `${Math.max(maxPos - minPos, 2)}%`,
                      backgroundColor: p.color,
                    }}
                  ></div>

                  {/* Hollow Dot: Estimated */}
                  <div
                    className="absolute w-3.5 h-3.5 rounded-full border-2 border-blue-600 bg-white -translate-x-1/2 shadow-xs transition-all duration-300"
                    style={{ left: `${estPos}%` }}
                    title={`Estimated: ${p.estimatedHours}h`}
                  ></div>

                  {/* Filled Dot: Actual */}
                  <div
                    className="absolute w-3.5 h-3.5 rounded-full -translate-x-1/2 shadow-xs transition-all duration-300"
                    style={{
                      left: `${actPos}%`,
                      backgroundColor: p.color,
                    }}
                    title={`Actual: ${p.actualHours}h`}
                  ></div>
                </div>

                {/* Tooltip - Smart Positioned */}
                {isHovered && (
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-150 ${
                      idx <= 1 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                    }`}
                  >
                    <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-3 py-2 text-white shadow-2xl border border-slate-700/60 text-left min-w-[200px]">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5 mb-1.5">
                        <span className="text-xs font-bold text-slate-100 truncate max-w-[130px]">
                          {p.employeeName}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            p.isOverEstimate
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {p.diffLabel}
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Estimated Effort:</span>
                          <strong className="text-white font-semibold">{p.estimatedHours}h</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Actual Worked:</span>
                          <strong className="text-white font-semibold">{p.actualHours}h</strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-slate-400">
                          <span>Effort Variance:</span>
                          <strong
                            className={`font-bold ${
                              p.isOverEstimate ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {p.differenceHours > 0 ? `+${p.differenceHours}h overrun` : `${p.differenceHours}h within`}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer / All View */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full border border-blue-600 bg-white"></span> Estimated
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Over (+h)
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Within (-h)
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
        >
          <span>All View</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
