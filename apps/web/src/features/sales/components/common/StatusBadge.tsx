import React from 'react';
import { getLeadStatusBadgeStyle } from '../../utils/formatters';
import type { LeadStatusType } from '../../types/sales.types';

export interface StatusBadgeProps {
  status: LeadStatusType | string | null | undefined;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  if (!status) return null;
  const style = getLeadStatusBadgeStyle(status);

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-2xs ${style.bg} ${style.text} ${style.border} ${sizeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span>{status}</span>
    </span>
  );
};
