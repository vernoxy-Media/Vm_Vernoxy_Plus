import React from 'react';
import { Coffee } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsBreakTypesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="break_type"
    title="Break Types"
    description="Define the types of breaks employees can log (e.g. Lunch, Tea, Prayer). Used in attendance and HR reports."
    addLabel="Add Break Type"
    searchPlaceholder="Search break types..."
    icon={Coffee}
  />
);
