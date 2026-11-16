import React from 'react';
import { useFieldArray, type Control, type FieldErrors, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { HeartHandshake, Plus, Trash2 } from 'lucide-react';
import { CountryPhoneInput } from '@/shared/ui';

export const MAX_EMERGENCY_CONTACTS = 5;

interface FormShape {
  emergency_contacts: Array<{ name: string; relation?: string; number: string }>;
}

interface Props {
  // The form owns more fields than these; only the contacts list is used here
  control: Control<never>;
  register: (name: any) => Record<string, unknown>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<FormShape>;
  disabled?: boolean;
}

const inputCls =
  'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:opacity-60';

/** Several emergency contacts: a name, the relation and a phone number for each, up to five. */
export const EmergencyContactsField: React.FC<Props> = ({ control, register, watch, setValue, errors, disabled }) => {
  const { fields, append, remove } = useFieldArray({ control: control as never, name: 'emergency_contacts' as never });
  const listError = (errors.emergency_contacts as { message?: string } | undefined)?.message;

  return (
    <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 space-y-4">
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-rose-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Emergency Contacts</h3>
          <span className="text-[11px] text-slate-400 font-medium">
            {fields.length}/{MAX_EMERGENCY_CONTACTS}
          </span>
        </div>
        <button
          type="button"
          id="add-emergency-contact-button"
          disabled={disabled || fields.length >= MAX_EMERGENCY_CONTACTS}
          onClick={() => append({ name: '', relation: '', number: '' })}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-white text-xs font-semibold text-blue-600 hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add contact
        </button>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-slate-400">No emergency contact yet. Use “Add contact” to add one or more.</p>
      )}

      {fields.map((field, index) => {
        const rowErrors = (errors.emergency_contacts as Array<Record<string, { message?: string }> | undefined> | undefined)?.[index];
        return (
          <div key={field.id} className="rounded-xl border border-slate-200 bg-white/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact {index + 1}</span>
              <button
                type="button"
                aria-label={`Remove contact ${index + 1}`}
                disabled={disabled}
                onClick={() => remove(index)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Name</label>
                <input
                  type="text"
                  disabled={disabled}
                  {...register(`emergency_contacts.${index}.name`)}
                  placeholder="Who to call in an emergency"
                  className={inputCls}
                />
                {rowErrors?.name?.message && <p className="text-[11px] text-red-500 font-medium">{rowErrors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Relationship</label>
                <input
                  type="text"
                  disabled={disabled}
                  {...register(`emergency_contacts.${index}.relation`)}
                  placeholder="e.g. Father, Spouse"
                  className={inputCls}
                />
                {rowErrors?.relation?.message && <p className="text-[11px] text-red-500 font-medium">{rowErrors.relation.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Phone number</label>
              <CountryPhoneInput
                value={(watch(`emergency_contacts.${index}.number`) as string) || ''}
                onChange={(val) =>
                  setValue(`emergency_contacts.${index}.number`, val, { shouldValidate: false, shouldDirty: true })
                }
                placeholder="9876543210"
                error={rowErrors?.number?.message}
              />
            </div>
          </div>
        );
      })}

      {listError && <p className="text-[11px] text-red-500 font-medium">{listError}</p>}
    </div>
  );
};
