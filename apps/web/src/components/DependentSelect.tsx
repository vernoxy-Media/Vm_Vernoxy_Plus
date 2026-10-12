import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface OptionItem {
  value: string | number;
  label: string;
}

export interface DependentSelectProps {
  label?: string;
  name?: string;
  id?: string;
  parentValue?: string | number | null;
  parentId?: string | number | null;
  loadOptions?: (parentValue: any) => Promise<OptionItem[]> | OptionItem[];
  fetchOptions?: (parentValue: any) => Promise<OptionItem[]> | OptionItem[];
  value: string | number | null | undefined;
  onChange: (value: any) => void;
  placeholder?: string;
  disabledPlaceholder?: string;
  noParentMessage?: string;
  emptyPlaceholder?: string;
  emptyParentMessage?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const DependentSelect: React.FC<DependentSelectProps> = ({
  label,
  name,
  id,
  parentValue,
  parentId,
  loadOptions,
  fetchOptions,
  value,
  onChange,
  placeholder = 'Select an option',
  disabledPlaceholder,
  noParentMessage,
  emptyPlaceholder = 'No options available',
  emptyParentMessage,
  error,
  required = false,
  disabled = false,
  className = '',
}) => {
  const effectiveParent = parentValue !== undefined ? parentValue : parentId;
  const effectiveLoader = loadOptions || fetchOptions || (() => []);
  const effectiveDisabledMsg = disabledPlaceholder || noParentMessage || 'Select parent first';
  const effectiveEmptyMsg = emptyPlaceholder || emptyParentMessage || 'No options available';

  const [options, setOptions] = useState<OptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const prevParentRef = useRef<string | number | null | undefined>(undefined);

  const inputId = id || name || 'dependent-select';

  useEffect(() => {
    if (prevParentRef.current === effectiveParent) {
      return;
    }
    const isFirstRun = prevParentRef.current === undefined;
    prevParentRef.current = effectiveParent;

    if (!effectiveParent) {
      setOptions([]);
      if (!isFirstRun && value) {
        onChange('');
      }
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    Promise.resolve(effectiveLoader(effectiveParent))
      .then((opts) => {
        if (isCancelled) return;
        setOptions(opts);
        setIsLoading(false);
        // Clear if current value is not in new options
        if (!isFirstRun && value) {
          const exists = opts.some((o) => String(o.value) === String(value));
          if (!exists) {
            onChange('');
          }
        }
      })
      .catch(() => {
        if (isCancelled) return;
        setOptions([]);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [effectiveParent, effectiveLoader, value, onChange]);

  const isDisabled = disabled || !effectiveParent || isLoading;

  let currentPlaceholder = placeholder;
  if (!effectiveParent) {
    currentPlaceholder = effectiveDisabledMsg;
  } else if (isLoading) {
    currentPlaceholder = 'Loading options...';
  } else if (options.length === 0) {
    currentPlaceholder = effectiveEmptyMsg;
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={inputId}
          name={name}
          disabled={isDisabled}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
            error
              ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-300'
          }`}
        >
          <option value="">{currentPlaceholder}</option>
          {options.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {isLoading && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};
