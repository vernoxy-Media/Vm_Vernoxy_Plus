import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface RepeaterSectionProps<T = any> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onAdd: () => void;
  addLabel?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyMessage?: string;
  maxRows?: number;
  maxItems?: number;
  currentCount?: number;
  items?: T[];
  onRemove?: (index: number) => void;
  renderItem?: (item: T, index: number) => React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function RepeaterSection<T = any>({
  title,
  description,
  icon,
  onAdd,
  addLabel = 'Add item',
  emptyStateTitle = 'No items added yet',
  emptyStateDescription,
  emptyMessage,
  maxRows,
  maxItems,
  currentCount,
  items,
  onRemove,
  renderItem,
  children,
  className = '',
}: RepeaterSectionProps<T>) {
  const count = currentCount ?? items?.length ?? 0;
  const max = maxRows ?? maxItems;
  const isMaxReached = max !== undefined && count >= max;
  const emptyTitle = emptyMessage || emptyStateTitle;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={isMaxReached}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
          {max !== undefined && (
            <span className="text-indigo-500 ml-1">({count}/{max})</span>
          )}
        </button>
      </div>

      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
          <p className="text-sm font-medium text-slate-600">{emptyTitle}</p>
          {emptyStateDescription && (
            <p className="text-xs text-slate-400 mt-1">{emptyStateDescription}</p>
          )}
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            {addLabel}
          </button>
        </div>
      ) : renderItem && items ? (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs"
            >
              <div className="flex-1 min-w-0">{renderItem(item, idx)}</div>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors mt-5 shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  );
}

export interface RepeaterRowCardProps {
  index: number;
  title?: string;
  onRemove: () => void;
  removeLabel?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const RepeaterRowCard: React.FC<RepeaterRowCardProps> = ({
  index,
  title,
  onRemove,
  removeLabel = 'Remove',
  badge,
  children,
  className = '',
}) => {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 relative ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {index + 1}
          </span>
          {title && <span className="text-xs font-semibold text-slate-800">{title}</span>}
          {badge}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
          title={removeLabel}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div>{children}</div>
    </div>
  );
};
