import React from 'react';
import { Map as MapIcon } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsStatesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="state"
    title="States"
    description="States offered on the company form. Link each state to its country: the company form then shows only the states of the chosen country. A state with no country is offered for every country."
    addLabel="Add State"
    searchPlaceholder="Search states..."
    icon={MapIcon}
    parent={{ lookupType: 'country', label: 'Country', emptyLabel: 'No country (offered for every country)' }}
  />
);
