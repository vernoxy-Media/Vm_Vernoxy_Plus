import React, { useState } from 'react';
import { Info, Clock, AlertTriangle } from 'lucide-react';
import { EmployeeLateMarkRankItem } from './attendance-analytics.types';

interface EmployeesMostLateMarksTableProps {
  items: EmployeeLateMarkRankItem[];
}

export const EmployeesMostLateMarksTable: React.FC<EmployeesMostLateMarksTableProps> = ({
  items,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              3. Employees with Most Late Marks
            </h3>
            <p className="text-[11px] text-slate-500">Ranked punctuality review (Top 5 + ties)</p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
            onClick={() => setShowInfo(!showInfo)}
            aria-label="KPI Information"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>

          {showInfo && (
            <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
              <p className="font-semibold text-slate-100 mb-1">Employees with Most Late Marks</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Ranks employees by total late mark count in descending order. Top 5 positions are displayed by default, including all employees tied at 5th rank.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="my-3 overflow-x-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-slate-400">
            No late marks recorded for the selected period
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-2 w-10 text-center">Rank</th>
                <th className="pb-2">Employee</th>
                <th className="pb-2">Department</th>
                <th className="pb-2 text-center">Late Marks</th>
                <th className="pb-2 text-right">Last Late Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {items.map((emp) => (
                  <tr
                    key={`${emp.empId}-${emp.rank}`}
                    className="group hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Rank Badge */}
                    <td className="py-2.5 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                          emp.rank === 1
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : emp.rank === 2
                            ? 'bg-slate-200 text-slate-700 border border-slate-300'
                            : emp.rank === 3
                            ? 'bg-orange-100 text-orange-800 border border-orange-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {emp.rank}
                      </span>
                    </td>

                    {/* Employee Info */}
                    <td className="py-2.5">
                      <div className="font-semibold text-slate-800 truncate max-w-[140px] group-hover:text-purple-600 transition-colors">
                        {emp.employeeName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {emp.empCode}
                      </div>
                    </td>

                    {/* Department / Designation */}
                    <td className="py-2.5">
                      <div className="text-slate-700 font-medium truncate max-w-[110px]">
                        {emp.department}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                        {emp.designation}
                      </div>
                    </td>

                    {/* Late Marks Count */}
                    <td className="py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60">
                        <AlertTriangle className="w-3 h-3 text-purple-500" />
                        <span>{emp.totalLateMarks}</span>
                      </span>
                    </td>

                    {/* Last Late Mark Date */}
                    <td className="py-2.5 text-right font-medium text-slate-500 text-[11px]">
                      {emp.lastLateMarkDate}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="text-[11px]">
          Showing top {items.length} punctuality exceptions
        </span>
        <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/50">
          Ranked View
        </span>
      </div>
    </div>
  );
};
