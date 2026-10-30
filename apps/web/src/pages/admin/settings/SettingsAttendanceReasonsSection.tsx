import React from 'react';
import { HelpCircle } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsAttendanceReasonsSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="attendance_reason"
    title="Regularization Reasons"
    description="Configure the valid reasons employees can select when raising an attendance regularization request (e.g. Forgot to Punch, Device or Network Issue, Client Visit, Work From Home)."
    addLabel="Add Reason"
    searchPlaceholder="Search regularization reasons..."
    icon={HelpCircle}
  />
);
