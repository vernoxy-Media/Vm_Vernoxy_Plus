import React, { useState } from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { CompanyFormData } from '../schemas/company-form.schema';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { usePersonsLookupQuery } from '../api/companies.api';
import { RepeaterSection } from './RepeaterSection';
import { CompanyContactRow } from './CompanyContactRow';
import { Users } from 'lucide-react';

export interface CompanyContactsSectionProps {
  form: UseFormReturn<CompanyFormData>;
}

export const CompanyContactsSection: React.FC<CompanyContactsSectionProps> = ({ form }) => {
  const { control, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contacts',
  });

  const contactsWatch = watch('contacts') || [];
  const { data: deptLookups } = useLookupsQuery('person_department');
  const [lookupIndex, setLookupIndex] = useState<number | null>(null);
  const [lookupQuery, setLookupQuery] = useState('');

  const { data: matchedPersons } = usePersonsLookupQuery({
    q: lookupQuery.length >= 2 ? lookupQuery : undefined,
  });

  const handleSetPrimary = (index: number) => {
    const updated = contactsWatch.map((c, idx) => ({
      ...c,
      is_primary: idx === index,
    }));
    setValue('contacts', updated);
  };

  const handleSelectPerson = (index: number, person: any) => {
    setValue(`contacts.${index}.person_id`, person.person_id);
    setValue(`contacts.${index}.name`, person.name);
    setValue(`contacts.${index}.email`, person.email || '');
    setValue(`contacts.${index}.mobile`, person.mobile || '');
    setValue(`contacts.${index}.linkedin_url`, person.linkedin_url || '');
    setLookupIndex(null);
    setLookupQuery('');
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <RepeaterSection
        title="4. Company Contacts"
        description="Link existing people across your CRM or create new contacts for this company."
        addLabel="Add Contact"
        icon={<Users className="w-4 h-4 text-blue-600" />}
        items={fields}
        onAdd={() =>
          append({
            name: '',
            email: '',
            mobile: '',
            designation: '',
            department_id: null,
            is_primary: fields.length === 0,
            reports_to_index: null,
          })
        }
        onRemove={remove}
        emptyMessage="No contacts associated with this company yet. Click 'Add Contact' to add key people."
        maxItems={50}
        renderItem={(_field: any, index: number) => (
          <CompanyContactRow
            key={fields[index]?.id || index}
            index={index}
            form={form}
            deptLookups={deptLookups}
            matchedPersons={matchedPersons}
            lookupIndex={lookupIndex}
            lookupQuery={lookupQuery}
            onFocusLookup={setLookupIndex}
            onChangeLookup={setLookupQuery}
            onSelectPerson={handleSelectPerson}
            onSetPrimary={handleSetPrimary}
          />
        )}
      />
    </div>
  );
};
