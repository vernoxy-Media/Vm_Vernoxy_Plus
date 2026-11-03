import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6,
}) => {
  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/80 overflow-hidden divide-y divide-slate-100 animate-pulse">
      <div className="h-12 bg-slate-50 flex items-center px-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-slate-200/80 rounded"
            style={{ width: `${Math.max(12, 100 / columns)}%` }}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="h-16 flex items-center px-4 gap-4">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="h-4 bg-slate-100 rounded"
              style={{ width: `${Math.max(12, 100 / columns)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3"
        >
          <div className="h-4 w-24 bg-slate-100 rounded" />
          <div className="h-8 w-16 bg-slate-200/80 rounded" />
        </div>
      ))}
    </div>
  );
};

export const DetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 bg-white rounded-2xl border border-slate-200/80 p-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-4 w-32 bg-slate-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-slate-100 rounded-xl" />
          <div className="h-10 w-28 bg-slate-200 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-white rounded-2xl border border-slate-200/80 p-6" />
        <div className="h-96 bg-white rounded-2xl border border-slate-200/80 p-6" />
      </div>
    </div>
  );
};
