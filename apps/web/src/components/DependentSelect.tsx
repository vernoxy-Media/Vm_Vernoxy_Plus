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
  options?: OptionItem[];
  parentValue?: string | number | null;
  parentId?: string | number | null;
  loadOptions?: (parentValue: any) => Promise<OptionItem[]> | OptionItem[];
  fetchOptions?: (parentValue: any) => Promise<OptionItem[]> | OptionItem[];
  isLoading?: boolean;
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
  options: propsOptions,
  parentValue,
  parentId,
  loadOptions,
  fetchOptions,
  isLoading: propsIsLoading,
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
  const effectiveLoader = loadOptions || fetchOptions;
  const effectiveDisabledMsg = disabledPlaceholder || noParentMessage || 'Select parent first';
  const effectiveEmptyMsg = emptyPlaceholder || emptyParentMessage || 'No options available';

  const [internalOptions, setInternalOptions] = useState<OptionItem[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);

  const loaderRef = useRef(effectiveLoader);
  loaderRef.current = effectiveLoader;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const valueRef = useRef(value);
  valueRef.current = value;

  const inputId = id || name || 'dependent-select';

  const isDirectOptions = propsOptions !== undefined;
  const options = isDirectOptions ? propsOptions : internalOptions;
  const isLoading = propsIsLoading !== undefined ? propsIsLoading : internalLoading;

  useEffect(() => {
    // If options are supplied directly via props or no loader exists, do not fetch
    if (isDirectOptions || !loaderRef.current) {
      return;
    }

    if (!effectiveParent) {
      setInternalOptions([]);
      setInternalLoading(false);
      return;
    }

    let isCancelled = false;
    setInternalLoading(true);

    Promise.resolve(loaderRef.current(effectiveParent))
      .then((opts) => {
        if (isCancelled) return;
        setInternalOptions(opts || []);
        setInternalLoading(false);

        // If current value is not in new options, clear it
        if (valueRef.current) {
          const exists = (opts || []).some((o) => String(o.value) === String(valueRef.current));
          if (!exists) {
            onChangeRef.current('');
          }
        }
      })
      .catch(() => {
        if (isCancelled) return;
        setInternalOptions([]);
        setInternalLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [effectiveParent, isDirectOptions]);

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
