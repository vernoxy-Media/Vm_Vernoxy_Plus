import React from 'react';
import { Building2 } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsNatureOfBusinessSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="nature_of_business"
    title="Nature of Business"
    description="How a company operates (e.g. Manufacturer, Trader, Exporter, Service Provider)."
    addLabel="Add Nature of Business"
    searchPlaceholder="Search nature of business..."
    icon={Building2}
  />
);
