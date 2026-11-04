import React from 'react';
import { UserSquare } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsContactDesignationSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="designation"
    title="Contact Designations"
    description="Job titles of the people you deal with at companies (e.g. Owner, Managing Director, IT Head)."
    addLabel="Add Designation"
    searchPlaceholder="Search contact designations..."
    icon={UserSquare}
  />
);
