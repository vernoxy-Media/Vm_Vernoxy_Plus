import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Building2, Phone, Mail, MapPin } from 'lucide-react';
import type { DuplicateMatchItem } from '../../types/sales.types';

export interface DuplicateWarningCardProps {
  matches: DuplicateMatchItem[];
  onConfirmAnyway?: () => void;
  isSubmitting?: boolean;
}

export const DuplicateWarningCard: React.FC<DuplicateWarningCardProps> = ({
  matches,
  onConfirmAnyway,
  isSubmitting = false,
}) => {
  if (!matches || matches.length === 0) return null;

  const getReasonBadge = (reason: DuplicateMatchItem['reason']) => {
    switch (reason) {
      case 'SAME_NAME_CITY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <Building2 className="w-3 h-3 text-amber-600" />
            Same Name & City
          </span>
        );
      case 'SAME_MOBILE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <Phone className="w-3 h-3 text-blue-600" />
            Same Mobile Number
          </span>
        );
      case 'SAME_EMAIL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
            <Mail className="w-3 h-3 text-purple-600" />
            Same Email Address
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            Duplicate Match
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 shadow-2xs animate-in fade-in duration-200">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-amber-900">
              Potential Duplicate {matches.length === 1 ? 'Company' : 'Companies'} Detected
            </h4>
            <p className="text-xs text-amber-800 mt-0.5">
              We found {matches.length} existing {matches.length === 1 ? 'record' : 'records'} matching these details.
              Please verify before proceeding to prevent duplicate CRM entries.
            </p>
          </div>

          <div className="divide-y divide-amber-200/60 rounded-lg border border-amber-200/80 bg-white/80 overflow-hidden">
            {matches.map((item) => (
              <div key={item.company_id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{item.name}</span>
                    {item.company_code && (
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {item.company_code}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    {item.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item.city}
                      </span>
                    )}
                    {getReasonBadge(item.reason)}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 pt-1 sm:pt-0">
                  <Link
                    to={`/sales/companies/${item.company_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors"
                  >
                    <span>View Record</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {onConfirmAnyway && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-amber-800 italic">
                If this is a legitimate separate organization, you may confirm and save anyway.
              </span>
              <button
                type="button"
                onClick={onConfirmAnyway}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Confirm & Save Anyway'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
