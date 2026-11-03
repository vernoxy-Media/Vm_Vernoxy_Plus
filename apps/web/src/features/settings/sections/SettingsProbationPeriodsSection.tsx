import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsProbationPeriodsSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="probation_period"
    title="Probation Periods"
    description="Configure selectable probation period durations for new hires (e.g., None, 30 Days, 60 Days, 90 Days / 3 Months, 6 Months, 1 Year)."
    addLabel="Add Probation Period"
    searchPlaceholder="Search probation periods..."
    icon={ShieldCheck}
  />
);

