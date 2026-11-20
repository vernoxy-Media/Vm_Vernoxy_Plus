import React from 'react';
import { Palette } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsLeaveColoursSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="leave_calendar_color"
    title="Leave Calendar Colours"
    description="The colours a Leave Type can use in the calendar. Rename or switch them off here."
    addLabel="Add Colour"
    searchPlaceholder="Search colours..."
    icon={Palette}
    codeHelp="The colour itself comes from the code: use one of blue, emerald, amber, purple, rose, indigo, teal or slate. Any other code shows as grey."
  />
);
