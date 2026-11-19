import React from 'react';
import { Briefcase } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsServiceFitSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="service_fit"
    title="Service Fits"
    description="The services you offer (e.g. Website Development, CRM / ERP Software, Mobile App). This one list is used everywhere: it is the Service Fit of a lead and the Category of a project, so there is nothing else to keep in step. Keep a code 'other' if you want projects to take a free-text category."
    addLabel="Add Service Fit"
    searchPlaceholder="Search service fits..."
    icon={Briefcase}
  />
);
