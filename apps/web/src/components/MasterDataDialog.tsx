import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

export interface MasterDataFormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: string | number; label: string }[];
  readOnlyOnEdit?: boolean;
  helpText?: string;
}

export interface MasterDataDialogProps {
  isOpen: boolean;
  title: string;
  icon?: React.ReactNode;
  fields: MasterDataFormField[];
  initialValues?: Record<string, unknown>;
  isEdit?: boolean;
  isPending?: boolean;
  errorMessage?: string | null;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
}

export const MasterDataDialog: React.FC<MasterDataDialogProps> = ({
  isOpen,
  title,
  icon,
  fields,
  initialValues = {},
  isEdit = false,
  isPending = false,
  errorMessage,
  submitLabel,
  onClose,
  onSubmit,
}) => {
  const [formValues, setFormValues] = useState<Record<string, unknown>>(initialValues);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setFormValues(initialValues);
    setLocalError(null);
  }, [initialValues, isOpen]);

  if (!isOpen) return null;

  const handleChange = (name: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !formValues[f.name]) {
        setLocalError(`${f.label} is required`);
        return;
      }
    }
    setLocalError(null);
    await onSubmit(formValues);
  };

  const displayError = errorMessage || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon && <div className="p-2 rounded-xl bg-blue-50 text-blue-600">{icon}</div>}
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {displayError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {fields.map((field) => {
            const isReadOnly = isEdit && field.readOnlyOnEdit;
            const value = formValues[field.name];

            if (field.type === 'checkbox') {
              return (
                <div
                  key={field.name}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">{field.label}</span>
                    {field.helpText && <span className="text-xs text-slate-500">{field.helpText}</span>}
                  </div>
                  <input
                    type="checkbox"
                    id={`field-${field.name}`}
                    checked={Boolean(value)}
                    disabled={isReadOnly}
                    onChange={(e) => handleChange(field.name, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                  />
                </div>
              );
            }

            return (
              <div key={field.name}>
                <label htmlFor={`field-${field.name}`} className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {field.label} {field.required && '*'}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={`field-${field.name}`}
                    value={(value as string) || ''}
                    disabled={isReadOnly}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={`field-${field.name}`}
                    value={(value as string | number) ?? ''}
                    disabled={isReadOnly}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="">{field.placeholder || `Select ${field.label}`}</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    id={`field-${field.name}`}
                    value={(value as string) || ''}
                    disabled={isReadOnly}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  />
                )}
                {field.helpText && <p className="text-xs text-slate-500 mt-1">{field.helpText}</p>}
              </div>
            );
          })}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitLabel || (isEdit ? 'Save Changes' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
