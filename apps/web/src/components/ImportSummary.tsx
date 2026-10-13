import React from 'react';
import { Layers, CheckCircle2, CopySlash, AlertTriangle, XCircle } from 'lucide-react';

export interface SummaryMetricProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

export interface ImportSummaryProps {
  mode?: 'preview' | 'result';
  total: number;
  created: number;
  skipped: number;
  warnings: number;
  errors: number;
  className?: string;
}

export const ImportSummary: React.FC<ImportSummaryProps> = ({
  mode = 'preview',
  total,
  created,
  skipped,
  warnings,
  errors,
  className = '',
}) => {
  const isPreview = mode === 'preview';

  const cards = [
    {
      label: 'Total Rows',
      value: total,
      icon: <Layers className="w-5 h-5 text-gray-600" />,
      colorClass: 'text-gray-900',
      bgClass: 'bg-gray-50 border-gray-200',
    },
    {
      label: isPreview ? 'Will Create' : 'Created',
      value: created,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      colorClass: 'text-emerald-700',
      bgClass: 'bg-emerald-50/60 border-emerald-200',
    },
    {
      label: isPreview ? 'Will Skip (Duplicates)' : 'Skipped',
      value: skipped,
      icon: <CopySlash className="w-5 h-5 text-amber-600" />,
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50/60 border-amber-200',
    },
    {
      label: 'Warnings',
      value: warnings,
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
      colorClass: 'text-orange-700',
      bgClass: 'bg-orange-50/60 border-orange-200',
    },
    {
      label: isPreview ? 'Validation Errors' : 'Failed',
      value: errors,
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
      colorClass: 'text-rose-700',
      bgClass: 'bg-rose-50/60 border-rose-200',
    },
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 ${className}`}>
      {cards.map((c, idx) => (
        <div
          key={idx}
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-shadow duration-200 hover:shadow-sm ${c.bgClass}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600 truncate">{c.label}</span>
            <div className="shrink-0">{c.icon}</div>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${c.colorClass}`}>
            {c.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
};
