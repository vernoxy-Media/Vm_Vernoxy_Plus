import React from 'react';
import { Users } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsLeaveAppliesToSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="leave_applies_to"
    title="Leave Applies To"
    description="The names shown in the Applies to dropdown of a Leave Type. The three groups drive who can take a leave type, so they can be renamed or switched off but not added or deleted."
    addLabel="Add Applies To"
    searchPlaceholder="Search applies to..."
    icon={Users}
    fixedList
  />
);
