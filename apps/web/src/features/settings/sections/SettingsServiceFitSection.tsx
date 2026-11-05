import React from 'react';
import { Briefcase } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsServiceFitSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="service_fit"
    title="Service Fits"
    description="Services you offer (e.g. Website Development, CRM / ERP Software, Mobile App). Chosen on every lead."
    addLabel="Add Service Fit"
    searchPlaceholder="Search service fits..."
    icon={Briefcase}
  />
);
