import React from 'react';
import { Avatar } from '@/shared/ui/Avatar';

export interface AssigneeSummary {
  employee_id: number;
  name: string;
  email?: string;
  avatar_url?: string | null;
}

export interface AvatarStackProps {
  assignees: AssigneeSummary[];
  max?: number;
  size?: number;
  className?: string;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  assignees = [],
  max = 3,
  size = 28,
  className = '',
}) => {
  if (!assignees || assignees.length === 0) return null;

  const visible = assignees.slice(0, max);
  const remaining = assignees.length - max;

  return (
    <div className={`flex items-center -space-x-2 overflow-hidden ${className}`}>
      {visible.map((assignee, idx) => {
        const key = assignee.employee_id ?? (assignee as any).emp_id ?? idx;
        return (
          <div
            key={key}
            className="relative inline-block transition-transform hover:z-10 hover:scale-110"
            title={assignee.name}
          >
            <Avatar
              name={assignee.name}
              src={assignee.avatar_url ?? (assignee as any).profile_picture}
              size={size}
              className="ring-2 ring-white rounded-full bg-slate-100"
            />
          </div>
        );
      })}
      {remaining > 0 && (
        <div
          className="relative z-0 flex items-center justify-center rounded-full bg-slate-200 text-slate-700 font-semibold text-xs ring-2 ring-white select-none shrink-0"
          style={{ width: size, height: size }}
          title={`${remaining} more assignees`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};
