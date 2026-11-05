import React from 'react';
import { MapPin } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsGidcNamesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="gidc_name"
    title="GIDC Names"
    description="GIDC estates where your prospects are located (e.g. Ankleshwar, Vatva, Sachin, Dahej)."
    addLabel="Add GIDC"
    searchPlaceholder="Search gidc names..."
    icon={MapPin}
  />
);
