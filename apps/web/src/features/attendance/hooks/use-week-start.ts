import { useState, useEffect } from 'react';
import type { WeekStartDay } from '../types/attendance.types';

const STORAGE_KEY = 'vernoxy_hr_week_start';
let inMemoryWeekStart: WeekStartDay = 'monday';

export function getWeekStartSetting(): WeekStartDay {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val === 'sunday' || val === 'monday') {
        return val;
      }
    } else {
      return inMemoryWeekStart;
    }
  } catch {
    return inMemoryWeekStart;
  }
  return inMemoryWeekStart;
}

export function setWeekStartSetting(value: WeekStartDay): void {
  inMemoryWeekStart = value;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value);
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('vernoxy-week-start-changed'));
    }
  } catch {
    // ignore
  }
}

export function useWeekStart(): [WeekStartDay, (val: WeekStartDay) => void] {
  const [weekStart, setWeekStart] = useState<WeekStartDay>(getWeekStartSetting);

  useEffect(() => {
    const onStorage = () => {
      setWeekStart(getWeekStartSetting());
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('vernoxy-week-start-changed', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('vernoxy-week-start-changed', onStorage);
    };
  }, []);

  const update = (val: WeekStartDay) => {
    setWeekStart(val);
    setWeekStartSetting(val);
  };

  return [weekStart, update];
}
