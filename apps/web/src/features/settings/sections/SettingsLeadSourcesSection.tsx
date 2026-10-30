import React from 'react';
import { Antenna } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsLeadSourcesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="lead_source"
    title="Lead Sources"
    description="Track where your leads and prospects originated (e.g. Website, Referral, LinkedIn, Cold Call). Used in CRM analytics."
    addLabel="Add Lead Source"
    searchPlaceholder="Search lead sources..."
    icon={Antenna}
  />
);
