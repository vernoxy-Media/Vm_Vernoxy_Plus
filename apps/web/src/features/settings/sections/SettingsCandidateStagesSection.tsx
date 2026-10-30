import React from 'react';
import { Layers } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsCandidateStagesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="candidate_stage"
    title="Candidate Stages"
    description="Manage recruitment lifecycle pipeline stages (e.g., New, Screening, Interviewing, On Hold, Selected, Onboarding, Rejected, Joined, Did not join)."
    addLabel="Add Candidate Stage"
    searchPlaceholder="Search candidate stages..."
    icon={Layers}
  />
);
