import React from 'react';
import { UserX } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsDeactivationReasonsSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="deactivation_reason"
    title="Deactivation Reasons"
    description="Manage termination and exit reasons (e.g. Resigned, Terminated, Contract Ended, Retired) used in the employee deactivation workflow."
    addLabel="Add Reason"
    searchPlaceholder="Search deactivation reasons..."
    icon={UserX}
  />
);
