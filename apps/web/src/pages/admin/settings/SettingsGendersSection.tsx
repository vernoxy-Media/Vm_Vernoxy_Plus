import React from 'react';
import { Users } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsGendersSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="gender"
    title="Genders"
    description="Manage gender identity options available for employee profiles and statutory compliance."
    addLabel="Add Gender"
    searchPlaceholder="Search genders..."
    icon={Users}
  />
);
