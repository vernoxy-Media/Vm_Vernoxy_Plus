import React from 'react';
import { Share2 } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsCandidateSourcesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="candidate_source"
    title="Candidate Sources"
    description="Configure channels from where candidates apply or get referred (e.g., Job Portal, LinkedIn, Employee Referral, Campus, Consultancy)."
    addLabel="Add Candidate Source"
    searchPlaceholder="Search candidate sources..."
    icon={Share2}
  />
);
