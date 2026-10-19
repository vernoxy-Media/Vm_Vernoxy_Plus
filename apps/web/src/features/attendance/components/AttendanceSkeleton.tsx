import React from 'react';

export const AttendanceSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading attendance dashboard">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-slate-200 rounded-xl" />
          <div className="h-4 w-60 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-11 w-52 bg-slate-200 rounded-2xl" />
      </div>

      {/* Row 1: Three Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Timesheet Skeleton */}
        <div className="h-96 rounded-2xl bg-white border border-slate-200 p-6 flex flex-col items-center justify-between">
          <div className="w-full flex justify-between">
            <div className="h-5 w-24 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
          </div>
          <div className="w-44 h-44 rounded-full border-8 border-slate-100 bg-slate-50" />
          <div className="w-full grid grid-cols-2 gap-3">
            <div className="h-11 bg-slate-200 rounded-xl" />
            <div className="h-11 bg-slate-200 rounded-xl" />
          </div>
        </div>

        {/* Today Activity Skeleton */}
        <div className="h-96 rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="space-y-4 pt-4">
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl" />
          </div>
        </div>

        {/* Statistics Skeleton */}
        <div className="h-96 rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div className="h-5 w-28 bg-slate-200 rounded" />
          <div className="space-y-3 pt-2">
            <div className="h-12 bg-slate-100 rounded-xl" />
            <div className="h-12 bg-slate-100 rounded-xl" />
            <div className="h-12 bg-slate-100 rounded-xl" />
            <div className="h-12 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Row 2: Attendance List & Month Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div className="h-6 w-36 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-96 rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div className="h-6 w-32 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </div>

      {/* Row 3: Calendar Skeleton */}
      <div className="h-96 rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
        <div className="h-6 w-44 bg-slate-200 rounded" />
        <div className="h-72 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
};
