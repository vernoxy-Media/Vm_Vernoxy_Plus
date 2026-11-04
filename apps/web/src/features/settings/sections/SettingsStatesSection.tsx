import React from 'react';
import { Map as MapIcon } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsStatesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="state"
    title="States"
    description="States offered on the company form."
    addLabel="Add State"
    searchPlaceholder="Search states..."
    icon={MapIcon}
  />
);
