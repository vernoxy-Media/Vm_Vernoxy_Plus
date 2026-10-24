import React from 'react';
import { UserSquare } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsPersonDepartmentsSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="person_department"
    title="Person Departments"
    description="Define department labels for contact persons at client companies (e.g. Procurement, IT, Finance). Used in CRM contact profiles."
    addLabel="Add Person Department"
    searchPlaceholder="Search person departments..."
    icon={UserSquare}
  />
);
