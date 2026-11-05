import React, { useState } from 'react';
import { Info, Calendar, ChevronLeft, ChevronRight, Clock, Users, Activity } from 'lucide-react';
import {
  WeeklyHeatmapSummary,
  EmployeeWeeklyHeatmapRow,
  HeatmapDayCell,
} from './attendance-analytics.types';

interface WeeklyHoursHeatmapCalendarProps {
  summary: WeeklyHeatmapSummary;
}

export const WeeklyHoursHeatmapCalendar: React.FC<WeeklyHoursHeatmapCalendarProps> = ({
  summary,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const [hoveredCell, setHoveredCell] = useState<{
    row: EmployeeWeeklyHeatmapRow;
    cell: HeatmapDayCell;
  } | null>(null);

  const totalPages = Math.ceil(summary.rows.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = summary.rows.slice(startIndex, startIndex + pageSize);

  const getCellColorClass = (intensity: HeatmapDayCell['intensityRange']) => {
    switch (intensity) {
      case '>10h':
        return 'bg-blue-600 text-white font-bold';
      case '8-10h':
        return 'bg-blue-500 text-white font-semibold';
      case '6-8h':
        return 'bg-blue-300 text-blue-950 font-medium';
      case '4-6h':
        return 'bg-blue-200 text-blue-900';
      case '<4h':
        return 'bg-blue-100 text-blue-800';
      case 'off':
        return 'bg-slate-100 text-slate-400 font-medium';
      case 'empty':
      default:
        return 'bg-slate-50 text-slate-300';
    }
  };

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs col-span-1 lg:col-span-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                9. Weekly Total Working Hours
              </h3>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/50">
                {summary.weekLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Employee-wise daily net working hours heatmap (Mon – Sun)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="font-semibold text-slate-600 mr-1">Intensity:</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-100 border border-blue-200"></span> &lt;4h
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-200"></span> 4-6h
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-300"></span> 6-8h
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-500"></span> 8-10h
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-600"></span> &gt;10h
          </span>

          <button
            type="button"
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
            onClick={() => setShowInfo(!showInfo)}
            aria-label="KPI Information"
            className="p-1 ml-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>

          {showInfo && (
            <div className="absolute right-4 top-12 z-40 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
              <p className="font-semibold text-slate-100 mb-1">Weekly Total Working Hours</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Heatmap Calendar displaying employees as rows and Monday through Sunday as columns. Color intensity shows hours relative to target daily shift.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Top Summary 3 KPI Tiles matching Reference Screen */}
      <div className="my-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/80 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Employees</p>
            <p className="text-xl font-black text-slate-900">{summary.totalEmployees}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Working Hours</p>
            <p className="text-xl font-black text-slate-900">{summary.overallWorkingFormatted} h</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100/80 text-purple-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average per Employee</p>
            <p className="text-xl font-black text-slate-900">{summary.averageWorkingFormatted} h</p>
          </div>
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="my-2 overflow-x-auto relative">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/40">
              <th className="py-2.5 px-3">Employee</th>
              <th className="py-2.5 px-2">Department</th>
              <th className="py-2.5 px-2">Designation</th>
              <th className="py-2.5 px-2 text-center">Mon</th>
              <th className="py-2.5 px-2 text-center">Tue</th>
              <th className="py-2.5 px-2 text-center">Wed</th>
              <th className="py-2.5 px-2 text-center">Thu</th>
              <th className="py-2.5 px-2 text-center">Fri</th>
              <th className="py-2.5 px-2 text-center">Sat</th>
              <th className="py-2.5 px-2 text-center">Sun</th>
              <th className="py-2.5 px-3 text-right">Weekly Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-xs text-slate-400">
                  No attendance records found for this week
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => (
                <tr key={row.empId} className="hover:bg-slate-50/60 transition-colors">
                  {/* Employee Name */}
                  <td className="py-2 px-3">
                    <div className="font-bold text-slate-800 truncate max-w-[130px]">{row.employeeName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{row.empCode}</div>
                  </td>

                  {/* Department */}
                  <td className="py-2 px-2 text-slate-600 font-medium truncate max-w-[100px]">
                    {row.department}
                  </td>

                  {/* Designation */}
                  <td className="py-2 px-2 text-slate-500 truncate max-w-[110px]">
                    {row.designation}
                  </td>

                  {/* 7 Days Columns */}
                  {row.days.map((day) => (
                    <td key={day.date} className="py-1.5 px-1 text-center relative">
                      <div
                        onMouseEnter={() => setHoveredCell({ row, cell: day })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`h-7 min-w-[50px] mx-auto rounded-lg flex items-center justify-center text-[11px] transition-transform hover:scale-105 cursor-pointer shadow-2xs ${getCellColorClass(
                          day.intensityRange
                        )}`}
                      >
                        {day.formattedHours}
                      </div>

                      {/* Floating Tooltip - Smart Positioned */}
                      {hoveredCell?.row.empId === row.empId && hoveredCell?.cell.date === day.date && (
                        <div
                          className={`absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap ${
                            rowIdx <= 1 ? 'top-full mt-2' : 'bottom-full mb-2'
                          }`}
                        >
                          <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-3 py-2 text-white shadow-2xl border border-slate-700/60 text-left min-w-[180px]">
                            <p className="text-xs font-bold text-slate-100 border-b border-slate-800 pb-1 mb-1">
                              {row.employeeName} ({day.dayName}, {day.date})
                            </p>
                            <div className="space-y-0.5 text-[10px] text-slate-300">
                              <div>Check-in: <strong className="text-white">{day.checkInTime || '--'}</strong></div>
                              <div>Check-out: <strong className="text-white">{day.checkOutTime || '--'}</strong></div>
                              <div>Break: <strong className="text-white">{day.breakDurationMinutes} mins</strong></div>
                              <div className="pt-1 border-t border-slate-800/80 text-blue-300 font-bold">
                                Net Working Hours: {day.formattedHours}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  ))}

                  {/* Weekly Total */}
                  <td className="py-2 px-3 text-right font-extrabold text-xs text-blue-700">
                    {row.weeklyTotalFormatted}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>
          Showing {paginatedRows.length > 0 ? startIndex + 1 : 0}–
          {Math.min(startIndex + pageSize, summary.rows.length)} of {summary.rows.length} employees
        </span>

        {totalPages > 1 && (
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
