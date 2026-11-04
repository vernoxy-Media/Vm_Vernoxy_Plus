import React from 'react';
import { PhoneOff } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsCallNotReceivedReasonsSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="call_not_received_reason"
    title="Call Not Received Reasons"
    description="Why a sales call was not picked up (e.g. No answer, Busy, Switched off). Chosen when a call is logged as Not received."
    addLabel="Add Reason"
    searchPlaceholder="Search reasons..."
    icon={PhoneOff}
  />
);
