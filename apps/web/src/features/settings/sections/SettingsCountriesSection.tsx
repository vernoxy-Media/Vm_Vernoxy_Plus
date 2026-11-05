import React from 'react';
import { Globe } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsCountriesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="country"
    title="Countries"
    description="Countries offered on the company form. India is the default."
    addLabel="Add Country"
    searchPlaceholder="Search countries..."
    icon={Globe}
  />
);
