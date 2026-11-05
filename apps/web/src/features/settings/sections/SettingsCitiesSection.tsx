import React from 'react';
import { MapPin } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsCitiesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="city"
    title="Cities"
    description="Cities offered on the company form. A city typed on a company is kept too."
    addLabel="Add City"
    searchPlaceholder="Search cities..."
    icon={MapPin}
  />
);
