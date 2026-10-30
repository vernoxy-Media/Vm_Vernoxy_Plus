import React from 'react';
import { Briefcase } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsEmploymentTypesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="employment_type"
    title="Employment Types"
    description="Manage employment engagement models (e.g. Full Time, Part Time, Intern, Contract). Used in employee profile and payroll configurations."
    addLabel="Add Employment Type"
    searchPlaceholder="Search employment types..."
    icon={Briefcase}
  />
);
