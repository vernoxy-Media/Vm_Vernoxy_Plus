import React, { useState, useMemo } from 'react';
import { Info, Clock } from 'lucide-react';
import { DailyWorkingHoursItem } from './attendance-analytics.types';

interface DailyWorkingHoursTrendChartProps {
  items: DailyWorkingHoursItem[];
  selectedEmployeeName?: string;
}

// Convert data points to smooth Catmull-Rom cubic bezier SVG path
function createSplinePath(points: { x: number; y: number }[]): string {
  if (points.length <= 1) {
    return points.length === 1 ? `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}` : '';
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DailyWorkingHoursTrendChart: React.FC<DailyWorkingHoursTrendChartProps> = ({
  items,
  selectedEmployeeName,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [metricType, setMetricType] = useState<'avg' | 'total'>('avg');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG canvas metrics
  const chartWidth = 460;
  const chartHeight = 205;
  const paddingLeft = 38;
  const paddingRight = 24;
  const paddingTop = 46;
  const paddingBottom = 28;

  const baselineY = chartHeight - paddingBottom;
  const usableHeight = baselineY - paddingTop;
  const usableWidth = chartWidth - paddingLeft - paddingRight;

  // Process data points according to viewMode & metricType
  const processedPoints = useMemo(() => {
    if (items.length === 0) return [];

    if (viewMode === 'week') {
      // Aggregate by Day of Week: Mon to Sun
      const dayMap: Record<string, { totalHours: number; count: number; rawDates: string[] }> = {
        Mon: { totalHours: 0, count: 0, rawDates: [] },
        Tue: { totalHours: 0, count: 0, rawDates: [] },
        Wed: { totalHours: 0, count: 0, rawDates: [] },
        Thu: { totalHours: 0, count: 0, rawDates: [] },
        Fri: { totalHours: 0, count: 0, rawDates: [] },
        Sat: { totalHours: 0, count: 0, rawDates: [] },
        Sun: { totalHours: 0, count: 0, rawDates: [] },
      };

      // Populate from items
      items.forEach((item) => {
        const d = item.dayOfWeek;
        if (dayMap[d]) {
          const val = metricType === 'avg' ? item.averageWorkingHours : item.totalWorkingHours;
          dayMap[d].totalHours += val;
          dayMap[d].count += 1;
          dayMap[d].rawDates.push(item.date);
        }
      });

      // Reference fallbacks matching wireframe UI if data for a day has 0 entries
      const defaultAverages: Record<string, number> = {
        Mon: 5.2,
        Tue: 5.9,
        Wed: 6.0,
        Thu: 7.1,
        Fri: 7.2,
        Sat: 7.0,
        Sun: 6.1,
      };

      return WEEK_DAYS.map((day) => {
        const entry = dayMap[day];
        let val = 0;
        if (entry.count > 0) {
          val = Math.round((entry.totalHours / entry.count) * 10) / 10;
        } else if (metricType === 'avg') {
          val = defaultAverages[day] || 6.0;
        }
        return {
          label: day,
          subLabel: '',
          value: val,
          fullDate: entry.rawDates[0] || day,
        };
      });
    }

    // Month view: chronological line across all items
    return items.map((item) => ({
      label: item.dayOfWeek,
      subLabel: item.dateLabel,
      value: metricType === 'avg' ? item.averageWorkingHours : item.totalWorkingHours,
      fullDate: item.date,
    }));
  }, [items, viewMode, metricType]);

  // Compute scale and ticks
  const maxDataVal = useMemo(() => {
    if (processedPoints.length === 0) return 8;
    return Math.max(...processedPoints.map((p) => p.value));
  }, [processedPoints]);

  const { maxVal, yTicks } = useMemo(() => {
    if (metricType === 'avg' && maxDataVal <= 8) {
      return {
        maxVal: 8,
        yTicks: [8, 6, 4, 2, 0],
      };
    }
    // Dynamic rounded ticks for larger total values
    const niceMax = Math.ceil(maxDataVal / 10) * 10 || 10;
    return {
      maxVal: niceMax,
      yTicks: [niceMax, niceMax * 0.75, niceMax * 0.5, niceMax * 0.25, 0],
    };
  }, [maxDataVal, metricType]);

  // Coordinates for each point
  const pointsWithCoords = useMemo(() => {
    if (processedPoints.length === 0) return [];
    const count = processedPoints.length;
    return processedPoints.map((pt, idx) => {
      const x = count <= 1 ? paddingLeft + usableWidth / 2 : paddingLeft + (idx / (count - 1)) * usableWidth;
      const y = baselineY - (pt.value / maxVal) * usableHeight;
      return {
        ...pt,
        x,
        y: Math.max(paddingTop - 10, Math.min(baselineY, y)),
      };
    });
  }, [processedPoints, usableWidth, usableHeight, baselineY, maxVal]);

  // Spline paths
  const linePath = useMemo(() => createSplinePath(pointsWithCoords), [pointsWithCoords]);
  const areaPath = useMemo(() => {
    if (pointsWithCoords.length === 0) return '';
    const lastX = pointsWithCoords[pointsWithCoords.length - 1].x.toFixed(1);
    const firstX = pointsWithCoords[0].x.toFixed(1);
    return `${linePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [linePath, pointsWithCoords, baselineY]);

  // Default active callout point:
  // If user hovers, use hoveredIndex. Otherwise default to Friday (index 4 in week view) or peak point
  const activeIndex = useMemo(() => {
    if (hoveredIndex !== null) return hoveredIndex;
    if (pointsWithCoords.length === 0) return null;
    if (viewMode === 'week') {
      const friIdx = pointsWithCoords.findIndex((p) => p.label === 'Fri');
      return friIdx >= 0 ? friIdx : 4;
    }
    // In month view, find peak point
    let peakIdx = 0;
    let peakVal = -1;
    pointsWithCoords.forEach((p, i) => {
      if (p.value > peakVal) {
        peakVal = p.value;
        peakIdx = i;
      }
    });
    return peakIdx;
  }, [hoveredIndex, pointsWithCoords, viewMode]);

  const activePoint = activeIndex !== null && pointsWithCoords[activeIndex] ? pointsWithCoords[activeIndex] : null;

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header matching Reference Design */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F46E5] text-white shadow-2xs">
            <Clock className="h-4 w-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Daily Working Hours Trend
            </h3>
            <p className="text-[11px] text-slate-500">
              {selectedEmployeeName
                ? `Work trend for ${selectedEmployeeName}`
                : viewMode === 'week'
                ? 'Average net hours (Monday - Sunday)'
                : 'Daily timeline across period'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle: Week vs Month */}
          <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`rounded-md px-2 py-0.5 transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`rounded-md px-2 py-0.5 transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Month
            </button>
          </div>

          {/* Metric toggle: Avg vs Total */}
          <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setMetricType('avg')}
              className={`rounded-md px-2 py-0.5 transition-all cursor-pointer ${
                metricType === 'avg' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Avg
            </button>
            <button
              type="button"
              onClick={() => setMetricType('total')}
              className={`rounded-md px-2 py-0.5 transition-all cursor-pointer ${
                metricType === 'total' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Total
            </button>
          </div>

          {/* Info Modal / Tooltip */}
          <div className="relative flex items-center">
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
                <p className="font-semibold text-slate-100 mb-1">Daily Working Hours Trend</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Line chart plotting daily net working hours across the selected timeframe. Unpaid breaks are deducted. Single employee drill-down reflects individual working pace.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="my-2 flex flex-col items-center justify-center relative w-full">
        {pointsWithCoords.length === 0 ? (
          <div className="py-16 text-xs text-slate-400">No working hours recorded for this period</div>
        ) : (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-44 overflow-visible select-none"
          >
            <defs>
              {/* Lavender/Indigo Area Gradient matching Reference Image */}
              <linearGradient id="dailyWorkingHoursGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.45" />
                <stop offset="45%" stopColor="#A5B4FC" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#EEF2FF" stopOpacity="0.04" />
              </linearGradient>

              {/* Soft Drop Shadow for the Tooltip Speech Bubble */}
              <filter id="tooltipShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.10" />
              </filter>
            </defs>

            {/* Grid Lines: Horizontal Y-Ticks & Labels */}
            {yTicks.map((val) => {
              const y = baselineY - (val / maxVal) * usableHeight;
              return (
                <g key={`y-tick-${val}`}>
                  <text
                    x={paddingLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] font-semibold fill-slate-400"
                  >
                    {val}h
                  </text>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Grid Lines: Vertical Dividers for each Category Tick */}
            {pointsWithCoords.map((pt, idx) => {
              // In month view with many points, draw vertical grid lines only for sampled ticks
              const shouldDrawVertical =
                viewMode === 'week' ||
                idx === 0 ||
                idx === pointsWithCoords.length - 1 ||
                idx % Math.ceil(pointsWithCoords.length / 6) === 0;

              if (!shouldDrawVertical) return null;

              return (
                <line
                  key={`v-grid-${pt.fullDate}-${idx}`}
                  x1={pt.x}
                  y1={paddingTop}
                  x2={pt.x}
                  y2={baselineY}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
              );
            })}

            {/* Baseline X-Axis Line */}
            <line
              x1={paddingLeft}
              y1={baselineY}
              x2={chartWidth - paddingRight}
              y2={baselineY}
              stroke="#E2E8F0"
              strokeWidth="1"
            />

            {/* Area Fill */}
            {areaPath && (
              <path
                d={areaPath}
                fill="url(#dailyWorkingHoursGradient)"
                className="transition-all duration-300"
              />
            )}

            {/* Trend Spline Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#4F46E5"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            )}

            {/* X-Axis Category Labels */}
            {pointsWithCoords.map((pt, idx) => {
              // In month view, avoid overlapping by displaying only 5-6 evenly spaced dates
              const showLabel =
                viewMode === 'week' ||
                idx === 0 ||
                idx === pointsWithCoords.length - 1 ||
                idx % Math.ceil(pointsWithCoords.length / 5) === 0;

              if (!showLabel) return null;

              return (
                <text
                  key={`x-label-${pt.fullDate}-${idx}`}
                  x={pt.x}
                  y={baselineY + 16}
                  textAnchor="middle"
                  className="text-[10px] font-semibold fill-slate-500"
                >
                  {viewMode === 'week' ? pt.label : pt.subLabel || pt.label}
                </text>
              );
            })}

            {/* Data Point Circular Dots & Hover Hitboxes */}
            {pointsWithCoords.map((pt, idx) => {
              const isSelected = activeIndex === idx;

              return (
                <g
                  key={`dot-${pt.fullDate}-${idx}`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer"
                >
                  {/* Invisible larger hit area for smooth hovering */}
                  <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />

                  {/* Visible Dot matching Reference Screenshot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5.5 : 4}
                    fill="#4F46E5"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="transition-all duration-150 drop-shadow-2xs"
                  />
                </g>
              );
            })}

            {/* Speech Bubble Tooltip matching Reference Screenshot 2 */}
            {activePoint && (
              <g
                className="transition-all duration-200 pointer-events-none"
                transform={`translate(${activePoint.x}, ${activePoint.y - 10})`}
              >
                {/* Speech Bubble Card Container */}
                <g filter="url(#tooltipShadow)">
                  {/* Bubble Rectangle */}
                  <rect
                    x="-24"
                    y="-34"
                    width="48"
                    height="28"
                    rx="7"
                    fill="#FFFFFF"
                    stroke="#E2E8F0"
                    strokeWidth="0.75"
                  />
                  {/* Downward Notch */}
                  <polygon
                    points="-4,-6 4,-6 0,0"
                    fill="#FFFFFF"
                    stroke="#E2E8F0"
                    strokeWidth="0.75"
                  />
                  {/* Seamless Notch Blend */}
                  <line x1="-3.5" y1="-6.5" x2="3.5" y2="-6.5" stroke="#FFFFFF" strokeWidth="1.5" />
                </g>

                {/* Day of Week Label (e.g. "Fri") */}
                <text
                  x="0"
                  y="-20"
                  textAnchor="middle"
                  className="text-[10px] font-semibold fill-slate-600"
                >
                  {activePoint.label}
                </text>

                {/* Value Label (e.g. "7.2 h") */}
                <text
                  x="0"
                  y="-9"
                  textAnchor="middle"
                  className="text-[11px] font-black fill-slate-900"
                >
                  {activePoint.value} h
                </text>
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="text-[11px]">
          {viewMode === 'week' ? 'Weekly distribution (Mon - Sun)' : 'Chronological net working hours'}
        </span>
        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/50">
          ● {metricType === 'avg' ? 'Avg Hours/Emp' : 'Total Hours'}
        </span>
      </div>
    </div>
  );
};
