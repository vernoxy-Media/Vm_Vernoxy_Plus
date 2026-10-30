import React from 'react';
import { Heart } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsBloodGroupsSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="blood_group"
    title="Blood Groups"
    description="Manage blood group categories (e.g. A+, B+, O+, AB-) for emergency health and medical records."
    addLabel="Add Blood Group"
    searchPlaceholder="Search blood groups..."
    icon={Heart}
  />
);
