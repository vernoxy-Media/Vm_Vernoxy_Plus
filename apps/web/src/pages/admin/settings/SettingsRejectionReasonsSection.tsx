import React from 'react';
import { XCircle } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsRejectionReasonsSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="rejection_reason"
    title="Rejection Reasons"
    description="Manage standardized feedback reasons for candidate disqualification or withdrawal (e.g., Skills not matching, Salary mismatch, Candidate withdrew, No-show, Position closed)."
    addLabel="Add Rejection Reason"
    searchPlaceholder="Search rejection reasons..."
    icon={XCircle}
  />
);
