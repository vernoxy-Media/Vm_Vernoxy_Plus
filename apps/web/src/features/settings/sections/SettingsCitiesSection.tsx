import React from 'react';
import { MapPin } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsCitiesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="city"
    title="Cities"
    description="Cities offered on the company form. Link each city to its state: the company form then shows only the cities of the chosen state. A city with no state is offered for every state."
    addLabel="Add City"
    searchPlaceholder="Search cities..."
    icon={MapPin}
    parent={{ lookupType: 'state', label: 'State', emptyLabel: 'No state (offered for every state)' }}
  />
);
