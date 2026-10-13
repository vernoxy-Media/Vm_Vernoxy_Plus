import React from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { CompanyFormData } from '../schemas/company-form.schema';
import { RepeaterSection } from '../../../components/RepeaterSection';
import { Radio } from 'lucide-react';

export interface CompanyChannelsSectionProps {
  form: UseFormReturn<CompanyFormData>;
}

export const CompanyChannelsSection: React.FC<CompanyChannelsSectionProps> = ({ form }) => {
  const { register, control, watch, setValue, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'channels',
  });

  const channelsWatch = watch('channels') || [];

  const handleSetPrimary = (index: number) => {
    const updated = channelsWatch.map((ch, idx) => ({
      ...ch,
      is_primary: idx === index,
    }));
    setValue('channels', updated);
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <RepeaterSection
        title="3. Communication Channels"
        description="Add phone numbers, email addresses, websites, or social links for this company."
        addLabel="Add Channel"
        icon={<Radio className="w-4 h-4 text-blue-600" />}
        items={fields}
        onAdd={() =>
          append({
            channel_type: 'website',
            value: '',
            label: '',
            is_primary: fields.length === 0,
          })
        }
        onRemove={remove}
        emptyMessage="No communication channels added yet. Click 'Add Channel' to start."
        maxItems={20}
        renderItem={(_field: any, index: number) => {
          const itemErrors = errors.channels?.[index];
          const isPrimary = channelsWatch[index]?.is_primary;

          return (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              <div className="sm:col-span-3">
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Channel Type *
                </label>
                <select
                  {...register(`channels.${index}.channel_type` as const)}
                  className="w-full appearance-none px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white font-medium"
                >
                  <option value="website">Website</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>

              <div className="sm:col-span-5">
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Value / URL *
                </label>
                <input
                  type="text"
                  {...register(`channels.${index}.value` as const)}
                  placeholder="e.g. acme.com, info@acme.com"
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {itemErrors?.value && (
                  <p className="text-xs text-rose-500 mt-0.5">{itemErrors.value.message}</p>
                )}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Label (Optional)
                </label>
                <input
                  type="text"
                  {...register(`channels.${index}.label` as const)}
                  placeholder="e.g. HQ Support, Billing"
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-1 pt-6 flex items-center justify-center">
                <label className="inline-flex items-center gap-1 cursor-pointer" title="Make Primary">
                  <input
                    type="radio"
                    name="primary-channel-radio"
                    checked={Boolean(isPrimary)}
                    onChange={() => handleSetPrimary(index)}
                    className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-600 sm:hidden">Primary</span>
                </label>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};
