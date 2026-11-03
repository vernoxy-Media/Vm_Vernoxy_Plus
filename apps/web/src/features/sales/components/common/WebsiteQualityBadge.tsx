import React from 'react';
import { getWebsiteQualityBadgeStyle } from '../../utils/formatters';

export interface WebsiteQualityBadgeProps {
  quality?: string | null;
  className?: string;
}

export const WebsiteQualityBadge: React.FC<WebsiteQualityBadgeProps> = ({
  quality,
  className = '',
}) => {
  if (!quality) return null;
  const style = getWebsiteQualityBadgeStyle(quality);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border shadow-2xs ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {quality}
    </span>
  );
};
