import React from 'react';
import { CalendarClock } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsNoticePeriodsSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="notice_period"
    title="Notice Periods"
    description="Configure selectable availability and notice period durations for candidates (e.g., Immediate, 15 days, 30 days, 60 days, 90 days, Serving notice)."
    addLabel="Add Notice Period"
    searchPlaceholder="Search notice periods..."
    icon={CalendarClock}
  />
);
