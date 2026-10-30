import React from 'react';
import { Tag } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsTaskTypesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="task_type"
    title="Task Types"
    description="Classify tasks by type (e.g. Bug Fix, Feature, Meeting). Used across task management and reports."
    addLabel="Add Task Type"
    searchPlaceholder="Search task types..."
    icon={Tag}
  />
);
