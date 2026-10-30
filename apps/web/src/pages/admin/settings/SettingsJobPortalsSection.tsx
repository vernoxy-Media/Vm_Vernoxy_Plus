import React from 'react';
import { Globe } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsJobPortalsSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="job_portal"
    title="Job Portals"
    description="Manage active hiring portals and job boards used for talent sourcing (e.g., Naukri.com, Indeed, Foundit, LinkedIn Jobs)."
    addLabel="Add Job Portal"
    searchPlaceholder="Search job portals..."
    icon={Globe}
  />
);
