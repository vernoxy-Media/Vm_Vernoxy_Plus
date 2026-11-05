import { IMPORT_FIELDS } from './import-fields';

export type ExportEntity = 'companies' | 'leads' | 'follow_ups';
export const EXPORT_MAX_ROWS = 10_000;

export interface ExportColumn {
  key: string;
  header: string;
}

/**
 * "All fields" for Companies: the 36 import columns first, in the same order and with the same names
 * (so an export can be fixed and imported again), then the extra columns.
 */
const COMPANY_EXTRAS: ExportColumn[] = [
  { key: 'company_code', header: 'Company ID' },
  { key: 'lead_code', header: 'Lead ID' },
  { key: 'client_code', header: 'Client ID' },
  { key: 'brochure', header: 'Brochure' },
  { key: 'created_on', header: 'Created On' },
  { key: 'created_by', header: 'Created By' },
];

export const EXPORT_COLUMNS: Record<ExportEntity, ExportColumn[]> = {
  companies: [...IMPORT_FIELDS.map((f) => ({ key: f.key, header: f.header })), ...COMPANY_EXTRAS],
  leads: [
    { key: 'lead_code', header: 'Lead ID' },
    { key: 'company_code', header: 'Company ID' },
    { key: 'company_name', header: 'Company Name' },
    { key: 'city', header: 'City' },
    { key: 'contact_name', header: 'Contact Person' },
    { key: 'mobile', header: 'Mobile' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status' },
    { key: 'lead_source', header: 'Lead Source' },
    { key: 'lead_by', header: 'Lead By' },
    { key: 'service_fit', header: 'Service Fit' },
    { key: 'date_added', header: 'Date Added' },
    { key: 'next_follow_up', header: 'Next Follow-up' },
    { key: 'conversations', header: 'Conversations' },
    { key: 'won_on', header: 'Won On' },
    { key: 'lost_reason', header: 'Lost Reason' },
  ],
  follow_ups: [
    { key: 'lead_code', header: 'Lead ID' },
    { key: 'company_code', header: 'Company ID' },
    { key: 'company_name', header: 'Company Name' },
    { key: 'city', header: 'City' },
    { key: 'contact_name', header: 'Contact Person' },
    { key: 'type', header: 'Type' },
    { key: 'follow_up_on', header: 'Follow-up On' },
    { key: 'status', header: 'Status' },
    { key: 'purpose', header: 'Purpose' },
    { key: 'assigned_to', header: 'Assigned To' },
    { key: 'rescheduled_count', header: 'Rescheduled' },
    { key: 'done_on', header: 'Done On' },
    { key: 'outcome', header: 'Outcome' },
    { key: 'what_happened', header: 'What Happened' },
  ],
};

export const CONTACT_COLUMNS: ExportColumn[] = [
  { key: 'company_code', header: 'Company ID' },
  { key: 'company_name', header: 'Company Name' },
  { key: 'name', header: 'Contact Person' },
  { key: 'designation', header: 'Designation' },
  { key: 'mobile', header: 'Mobile' },
  { key: 'email', header: 'Email' },
  { key: 'is_primary', header: 'Primary' },
];

export const CONVERSATION_COLUMNS: ExportColumn[] = [
  { key: 'lead_code', header: 'Lead ID' },
  { key: 'company_code', header: 'Company ID' },
  { key: 'company_name', header: 'Company Name' },
  { key: 'kind', header: 'Kind' },
  { key: 'type', header: 'Type' },
  { key: 'at', header: 'Date' },
  { key: 'text', header: 'What Was Discussed / Note' },
  { key: 'outcome', header: 'Outcome' },
  { key: 'by', header: 'By' },
];
