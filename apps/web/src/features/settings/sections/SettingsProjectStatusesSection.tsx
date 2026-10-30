import React from 'react';
import { Activity } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsProjectStatusesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="project_status"
    title="Project Statuses"
    description="Define the lifecycle stages of a project (e.g. Planning, Active, On Hold, Completed). Used in project boards and dashboards."
    addLabel="Add Project Status"
    searchPlaceholder="Search project statuses..."
    icon={Activity}
  />
);
