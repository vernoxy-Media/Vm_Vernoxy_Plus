import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

export const SettingsRequestTypesSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="request_type"
    title="Regularization Request Types"
    description="Configure the types of attendance regularization requests employees can submit (e.g. Missing Check-in, Missing Check-out, Incorrect Time, Full Day Missed, On Duty / Field Work)."
    addLabel="Add Request Type"
    searchPlaceholder="Search request types..."
    icon={ClipboardCheck}
  />
);
