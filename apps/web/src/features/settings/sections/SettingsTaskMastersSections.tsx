import React from 'react';
import { Flag, GitBranch, Layers } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

/*
 * These three lists are fixed by the task workflow and the database (a task stores the code), so the Admin can
 * rename a value, change its order or switch it off, but cannot add, delete or re-code one.
 */

export const SettingsTaskPrioritiesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="task_priority"
    title="Task Priorities"
    description="The priority levels a task can have. Rename a level or change the order shown in dropdowns and filters."
    addLabel="Add Task Priority"
    searchPlaceholder="Search task priorities..."
    icon={Flag}
    fixedList
  />
);

export const SettingsTaskSourcesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="task_source"
    title="Task Sources"
    description="Where a task comes from (personal, project, or created by an employee). Rename a source or change its order."
    addLabel="Add Task Source"
    searchPlaceholder="Search task sources..."
    icon={GitBranch}
    fixedList
  />
);

export const SettingsTaskStagesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="task_stage"
    title="Task Stages"
    description="The stages of the task workflow, as shown on the task board and in filters. Rename a stage or change its order; the workflow itself stays the same."
    addLabel="Add Task Stage"
    searchPlaceholder="Search task stages..."
    icon={Layers}
    fixedList
  />
);
