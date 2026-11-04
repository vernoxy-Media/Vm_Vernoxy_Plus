import React from 'react';
import { Compass } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsGidcAreasSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="gidc_phase"
    title="GIDC Areas / Phases"
    description="Areas or phases inside a GIDC estate (e.g. Phase I, Phase II). An area with no GIDC is offered for every GIDC."
    addLabel="Add Area / Phase"
    searchPlaceholder="Search gidc areas / phases..."
    icon={Compass}
    parent={{ lookupType: 'gidc_name', label: 'GIDC', emptyLabel: 'All GIDCs (common area)' }}
  />
);
