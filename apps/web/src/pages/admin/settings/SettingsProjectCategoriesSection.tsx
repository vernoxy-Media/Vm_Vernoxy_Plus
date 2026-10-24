import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsProjectCategoriesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="project_category"
    title="Project Categories"
    description="Categorize projects by domain or business area (e.g. Web Development, Marketing, Research). Used in project filters and reports."
    addLabel="Add Project Category"
    searchPlaceholder="Search project categories..."
    icon={LayoutGrid}
  />
);
