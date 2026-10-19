import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export interface MonthNavigatorProps {
  currentMonth: string; // "YYYY-MM"
  onChangeMonth: (month: string) => void;
}

export const MonthNavigator: React.FC<MonthNavigatorProps> = ({
  currentMonth,
  onChangeMonth,
}) => {
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr || '2026', 10);
  const month = parseInt(monthStr || '10', 10); // 1-indexed

  const dateObj = new Date(year, month - 1, 1);
  const monthName = dateObj.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevious = () => {
    const prevDate = new Date(year, month - 2, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, '0');
    onChangeMonth(`${newY}-${newM}`);
  };

  const handleNext = () => {
    const nextDate = new Date(year, month, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, '0');
    onChangeMonth(`${newY}-${newM}`);
  };

  const handleMonthInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onChangeMonth(e.target.value);
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-white border border-slate-200/90 rounded-2xl p-1 shadow-2xs">
      <button
        type="button"
        id="month-nav-prev"
        onClick={handlePrevious}
        aria-label="Previous month"
        className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      {/* Month Display & Hidden Picker */}
      <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer group">
        <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="select-none min-w-[120px] sm:min-w-[140px] text-center font-bold tracking-tight">
          {monthName}
        </span>
        <input
          type="month"
          value={currentMonth}
          onChange={handleMonthInput}
          aria-label="Select month"
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>

      <button
        type="button"
        id="month-nav-next"
        onClick={handleNext}
        aria-label="Next month"
        className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>
    </div>
  );
};
