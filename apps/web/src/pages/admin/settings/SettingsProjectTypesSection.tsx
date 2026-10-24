import React from 'react';
import { Shapes } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsProjectTypesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="project_type"
    title="Project Types"
    description="Define how projects are structured or billed (e.g. Fixed Price, Retainer, Internal). Used in project creation and reporting."
    addLabel="Add Project Type"
    searchPlaceholder="Search project types..."
    icon={Shapes}
  />
);
