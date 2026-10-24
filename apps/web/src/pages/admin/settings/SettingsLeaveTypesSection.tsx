import React from 'react';
import { CalendarOff } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsLeaveTypesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="leave_type"
    title="Leave Types"
    description="Configure employee leave classifications (e.g. Casual Leave, Sick Leave, Paid Leave, Unpaid Leave) integrated with attendance calculation."
    addLabel="Add Leave Type"
    searchPlaceholder="Search leave types..."
    icon={CalendarOff}
  />
);
