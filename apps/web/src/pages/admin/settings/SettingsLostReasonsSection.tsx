import React from 'react';
import { ThumbsDown } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsLostReasonsSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="lost_reason"
    title="Lost Reasons"
    description="Capture why deals or prospects were lost (e.g. Price Too High, Went with Competitor, No Budget). Used in CRM win/loss analysis."
    addLabel="Add Lost Reason"
    searchPlaceholder="Search lost reasons..."
    icon={ThumbsDown}
  />
);
