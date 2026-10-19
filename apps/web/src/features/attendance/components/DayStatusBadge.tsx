import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarOff,
  Sun,
  Coffee,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import type { DayAttendanceStatus } from '../types/attendance.types';

export interface DayStatusBadgeProps {
  status: DayAttendanceStatus;
  label?: string;
  size?: 'sm' | 'md';
}

export const DayStatusBadge: React.FC<DayStatusBadgeProps> = ({
  status,
  label,
  size = 'md',
}) => {
  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon = HelpCircle;
  let text = label || status;

  switch (status) {
    case 'present':
      badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      Icon = CheckCircle2;
      text = label || 'Present';
      break;
    case 'half_day':
      badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
      Icon = Clock;
      text = label || 'Half Day';
      break;
    case 'short_hours':
      badgeClass = 'bg-orange-50 text-orange-800 border-orange-200';
      Icon = Clock;
      text = label || 'Short Hours';
      break;
    case 'incomplete':
      badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
      Icon = AlertTriangle;
      text = label || 'Incomplete';
      break;
    case 'leave':
      badgeClass = 'bg-violet-50 text-violet-800 border-violet-200';
      Icon = CalendarOff;
      text = label || 'Leave';
      break;
    case 'holiday':
      badgeClass = 'bg-emerald-50 text-emerald-900 border-emerald-200';
      Icon = Sun;
      text = label || 'Holiday';
      break;
    case 'weekly_off':
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
      Icon = Coffee;
      text = label || 'Off';
      break;
    case 'absent':
      badgeClass = 'bg-red-50 text-red-800 border-red-200';
      Icon = XCircle;
      text = label || 'Absent';
      break;
  }

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs gap-1.5 font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-semibold select-none ${sizeClasses} ${badgeClass}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span className="truncate">{text}</span>
    </span>
  );
};
