import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { downloadSalesFile } from '../../utils/download';
import { Download, FileSpreadsheet, Loader2, AlertCircle, } from 'lucide-react';
import type { ExportBodyDto } from '../../types/sales.types';

export type ExportType = 'companies' | 'leads' | 'follow_ups';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ExportType;
  selectedIds?: number[];
  currentFilters?: Record<string, unknown>;
  totalMatchingRows?: number;
}

const AVAILABLE_COLUMNS: Record<ExportType, Array<{ key: string; label: string }>> = {
  companies: [
    { key: 'name', label: 'Company Name' }, { key: 'no_of_branches', label: 'No. of Branches' }, { key: 'no_of_plants', label: 'No. of Plants' },
    { key: 'full_address', label: 'Full Address' }, { key: 'city', label: 'City' }, { key: 'state', label: 'State' }, { key: 'country', label: 'Country' },
    { key: 'pin', label: 'PIN' }, { key: 'google_maps_url', label: 'Google Maps' }, { key: 'is_gidc', label: 'Is GIDC' }, { key: 'gidc_name', label: 'GIDC Name' },
    { key: 'gidc_area_phase', label: 'GIDC Area/Phase' }, { key: 'contact_name', label: 'Contact Person' }, { key: 'designation', label: 'Designation' },
    { key: 'mobile', label: 'Mobile' }, { key: 'email', label: 'Email' }, { key: 'nature_of_business', label: 'Nature of Business' }, { key: 'industry', label: 'Industry' },
    { key: 'products_services', label: 'Products / Services' }, { key: 'estimated_employees', label: 'Estimated Employees' }, { key: 'estimated_turnover', label: 'Estimated Turnover' },
    { key: 'year_established', label: 'Year Established' }, { key: 'existing_major_clients', label: 'Existing Major Clients' }, { key: 'website', label: 'Website' },
    { key: 'website_quality', label: 'Website Quality' }, { key: 'developed_by', label: 'Developed By' }, { key: 'linkedin_url', label: 'LinkedIn' },
    { key: 'instagram_url', label: 'Instagram' }, { key: 'facebook_url', label: 'Facebook' }, { key: 'youtube_url', label: 'YouTube' },
    { key: 'google_business_profile_url', label: 'Google Business Profile' }, { key: 'lead_source', label: 'Lead Source' }, { key: 'lead_by', label: 'Lead By' },
    { key: 'date_added', label: 'Date Added' }, { key: 'service_fit', label: 'Service Fit' }, { key: 'status', label: 'Status' },
    { key: 'company_code', label: 'Company ID' }, { key: 'lead_code', label: 'Lead ID' }, { key: 'client_code', label: 'Client ID' },
    { key: 'brochure', label: 'Brochure' }, { key: 'created_on', label: 'Created On' }, { key: 'created_by', label: 'Created By' },
  ],
  leads: [
    { key: 'lead_code', label: 'Lead ID' }, { key: 'company_code', label: 'Company ID' }, { key: 'company_name', label: 'Company Name' }, { key: 'city', label: 'City' },
    { key: 'contact_name', label: 'Contact Person' }, { key: 'mobile', label: 'Mobile' }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Status' },
    { key: 'lead_source', label: 'Lead Source' }, { key: 'lead_by', label: 'Lead By' }, { key: 'service_fit', label: 'Service Fit' }, { key: 'date_added', label: 'Date Added' },
    { key: 'next_follow_up', label: 'Next Follow-up' }, { key: 'conversations', label: 'Conversations' }, { key: 'won_on', label: 'Won On' }, { key: 'lost_reason', label: 'Lost Reason' },
  ],
  follow_ups: [
    { key: 'lead_code', label: 'Lead ID' }, { key: 'company_code', label: 'Company ID' }, { key: 'company_name', label: 'Company Name' }, { key: 'city', label: 'City' },
    { key: 'contact_name', label: 'Contact Person' }, { key: 'type', label: 'Type' }, { key: 'follow_up_on', label: 'Follow-up On' }, { key: 'status', label: 'Status' },
    { key: 'purpose', label: 'Purpose' }, { key: 'assigned_to', label: 'Assigned To' }, { key: 'rescheduled_count', label: 'Rescheduled' }, { key: 'done_on', label: 'Done On' },
    { key: 'outcome', label: 'Outcome' }, { key: 'what_happened', label: 'What Happened' },
  ],
};

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  type,
  selectedIds = [],
  currentFilters = {},
  totalMatchingRows,
}) => {
  const hasSelection = selectedIds.length > 0;
  const [scope, setScope] = useState<'all' | 'selected'>(hasSelection ? 'selected' : 'all');
  const [columnMode, setColumnMode] = useState<'all' | 'custom'>('all');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');

  // Options toggles
  const [includeContacts, setIncludeContacts] = useState(false);
  const [includeConversations, setIncludeConversations] = useState(false);
  const [includeNextFollowUp, setIncludeNextFollowUp] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allColumns = AVAILABLE_COLUMNS[type];

  const handleToggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(allColumns.map((c) => c.key));
  };

  const handleClearColumns = () => {
    setSelectedColumns([]);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);

    try {
      // Build query string from currentFilters
      const params = new URLSearchParams();
      if (scope === 'all') {
        Object.entries(currentFilters).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            if (Array.isArray(v)) {
              params.append(k, v.join(','));
            } else {
              params.append(k, String(v));
            }
          }
        });
      }

      // Endpoint path
      const pathSuffix = type === 'follow_ups' ? 'follow-ups' : type;
      const queryStr = params.toString();
      const exportUrl = `/api/v1/sales/exports/${pathSuffix}${queryStr ? `?${queryStr}` : ''}`;

      // Build body
      const body: ExportBodyDto = {
        format,
        ids: scope === 'selected' ? selectedIds : undefined,
        columns: columnMode,
        fields: columnMode === 'custom' ? selectedColumns : undefined,
        include_contacts: format === 'xlsx' ? includeContacts : false,
        include_conversations: format === 'xlsx' ? includeConversations : false,
        include_next_follow_up: type === 'companies' ? includeNextFollowUp : undefined,
      };

      await downloadSalesFile(exportUrl, {
        method: 'POST',
        body,
        fallbackFilename: `sales-${type}-export.${format}`,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <span className="text-2xs text-slate-400">
        Exports up to 10,000 rows
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isExporting}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || (columnMode === 'custom' && selectedColumns.length === 0)}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Generating File...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Export {format.toUpperCase()}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <span>Export {type === 'companies' ? 'Companies' : type === 'leads' ? 'Leads' : 'Follow-ups'}</span>
        </div>
      }
      subtitle="Configure output columns, format and scope"
      footer={footer}
      size="lg"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scope Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Rows to Export
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                scope === 'all'
                  ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-medium'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="export-scope"
                checked={scope === 'all'}
                onChange={() => setScope('all')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold block">All matching rows</span>
                <span className="text-2xs text-slate-500">
                  Uses current filters ({totalMatchingRows !== undefined ? `${totalMatchingRows} rows` : 'current list'})
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                scope === 'selected'
                  ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-medium'
                  : !hasSelection
                  ? 'border-slate-100 bg-slate-50/60 text-slate-400 cursor-not-allowed'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="export-scope"
                checked={scope === 'selected'}
                disabled={!hasSelection}
                onChange={() => setScope('selected')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold block">Selected rows only</span>
                <span className="text-2xs text-slate-500">
                  {hasSelection ? `${selectedIds.length} row(s) selected` : 'No rows currently selected'}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            File Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                format === 'xlsx'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                format === 'csv'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>CSV (.csv)</span>
            </button>
          </div>
        </div>

        {/* Columns Option */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Columns
          </label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={() => setColumnMode('all')}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border cursor-pointer ${
                columnMode === 'all'
                  ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All Fields
            </button>
            <button
              type="button"
              onClick={() => {
                setColumnMode('custom');
                if (selectedColumns.length === 0) handleSelectAllColumns();
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border cursor-pointer ${
                columnMode === 'custom'
                  ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Custom Selection
            </button>
          </div>

          {columnMode === 'custom' && (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-2xs font-semibold text-slate-600">Select columns to export:</span>
                <div className="flex gap-2 text-2xs">
                  <button type="button" onClick={handleSelectAllColumns} className="text-blue-600 hover:underline">Select all</button>
                  <button type="button" onClick={handleClearColumns} className="text-slate-500 hover:underline">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pt-1">
                {allColumns.map((col) => {
                  const isChecked = selectedColumns.includes(col.key);
                  return (
                    <label key={col.key} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleColumn(col.key)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Additional Include Toggles */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-700 block">Additional Data Options</span>
          <div className="space-y-1.5">
            {format === 'xlsx' && (
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeContacts}
                  onChange={(e) => setIncludeContacts(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Include all contacts (extra sheet)</span>
              </label>
            )}

            {type === 'companies' && (
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNextFollowUp}
                  onChange={(e) => setIncludeNextFollowUp(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Include next follow-up details</span>
              </label>
            )}

            {format === 'xlsx' && (
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeConversations}
                  onChange={(e) => setIncludeConversations(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Include communications & notes sheet (Excel only)</span>
              </label>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
