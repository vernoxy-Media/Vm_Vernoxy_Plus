import React from 'react';
import { Clock } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsShiftTypesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="shift_type"
    title="Shift Types"
    description="Manage shift categorization types (e.g. Fixed, Flexible, Rotational) used when creating and configuring operational shifts."
    addLabel="Add Shift Type"
    searchPlaceholder="Search shift types..."
    icon={Clock}
  />
);
