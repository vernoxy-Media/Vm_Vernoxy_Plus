import React from 'react';
import { Bug, Flag } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

/** The lists the "Report bug" form picks from (Projects > Bugs). */
export const SettingsBugPrioritiesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="bug_priority"
    title="Bug Priorities"
    description="Priority levels a bug can have (e.g. Critical, High, Medium, Low). The order here is the order in the Report bug form: put the most urgent first."
    addLabel="Add Bug Priority"
    searchPlaceholder="Search bug priorities..."
    icon={Flag}
    codeHelp="A short code such as critical or p1. It is saved with each bug, so do not change it later."
  />
);

export const SettingsBugTypesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="bug_type"
    title="Bug Types"
    description="Kinds of bug a tester can report (e.g. Front-end, Back-end, UI, Database). Keep an 'other' code if you want testers to type a free-text type."
    addLabel="Add Bug Type"
    searchPlaceholder="Search bug types..."
    icon={Bug}
    codeHelp="A short code such as frontend or api. The code 'other' lets the reporter type their own type."
  />
);
