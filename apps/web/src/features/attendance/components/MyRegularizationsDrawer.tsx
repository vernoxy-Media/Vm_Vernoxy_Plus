import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { History, X, Loader2 } from 'lucide-react';
import { fetchRegularizations } from '../api/attendance.api';
import type { AttendanceRegularization } from '../types/attendance.types';
import { RegularizationDetailModal } from './RegularizationDetailModal';

export interface MyRegularizationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessCorrection?: (msg: string) => void;
}

type FilterTab = 'Pending' | 'Approved' | 'Rejected' | 'All History';

export const MyRegularizationsDrawer: React.FC<MyRegularizationsDrawerProps> = ({
  isOpen,
  onClose,
  onSuccessCorrection,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('Pending');
  const [requests, setRequests] = useState<AttendanceRegularization[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRegularization | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRegularizations({
        scope: 'me',
      });
      setRequests(data || []);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter requests based on tab
  const filteredRequests = requests.filter((req) => {
    const st = (req.status || '').toLowerCase();
    if (activeTab === 'Pending') return st === 'pending';
    if (activeTab === 'Approved') return st === 'approved';
    if (activeTab === 'Rejected') return st === 'rejected';
    return true; // 'All History'
  });

  const handleOpenDetail = (req: AttendanceRegularization) => {
    setSelectedRequest(req);
    setIsDetailModalOpen(true);
  };

  const handleDetailSuccess = () => {
    setIsDetailModalOpen(false);
    setSelectedRequest(null);
    loadRequests();
    onSuccessCorrection?.('Regularization updated successfully');
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 z-50"
          onClick={onClose}
        />

        {/* Slide-over side panel matching Image 2 */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 z-50 pointer-events-none">
          <div className="w-screen max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 pointer-events-auto">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-slate-700" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  My Regularizations
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs / Pills matching Image 2 */}
            <div className="px-6 pt-4 pb-3 flex items-center gap-1.5 border-b border-slate-100 overflow-x-auto scrollbar-none">
              {(['Pending', 'Approved', 'Rejected', 'All History'] as FilterTab[]).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-slate-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Requests List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5 bg-slate-50/50">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                  <span className="text-xs font-medium">Loading regularizations...</span>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
                  <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No requests found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    There are no {activeTab.toLowerCase()} regularization requests.
                  </p>
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div
                    key={req.correctionId || req.requestId}
                    className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-slate-300 transition flex items-center justify-between gap-3.5"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 tracking-tight">
                        Date: {req.workDate}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        Reason: {req.reason} {req.remarks ? `• ${req.remarks}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenDetail(req)}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 shadow-2xs transition shrink-0 cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Regularization Detail Modal when clicking View Details */}
      {isDetailModalOpen && selectedRequest && (
        <RegularizationDetailModal
          isOpen={isDetailModalOpen}
          regularization={selectedRequest}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedRequest(null);
          }}
          onSuccess={handleDetailSuccess}
        />
      )}
    </>,
    document.body,
  );
};

