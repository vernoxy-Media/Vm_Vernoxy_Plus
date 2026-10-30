import React, { useState } from 'react';
import {
  useKbApprovalsQuery,
  useReviewKbArticleMutation,
} from '../hooks/use-kb-articles';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface KnowledgeBaseApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeBaseApprovalsModal: React.FC<KnowledgeBaseApprovalsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: approvals, isLoading, refetch } = useKbApprovalsQuery();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const reviewMutation = useReviewKbArticleMutation(selectedItem?.article_id || 0);

  if (!isOpen) return null;

  const handleApprove = async () => {
    if (!selectedItem) return;
    setActionError(null);
    try {
      await reviewMutation.mutateAsync({
        versionId: selectedItem.version_id,
        action: 'APPROVE',
        comment: 'Approved by administrator',
      });
      setSelectedItem(null);
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Approval failed');
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    if (!rejectComment.trim()) {
      setActionError('Please provide a comment explaining why this version is rejected.');
      return;
    }
    setActionError(null);
    try {
      await reviewMutation.mutateAsync({
        versionId: selectedItem.version_id,
        action: 'REJECT',
        comment: rejectComment.trim(),
      });
      setSelectedItem(null);
      setIsRejecting(false);
      setRejectComment('');
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Rejection failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Pending Approvals</h2>
              <p className="text-xs text-slate-500">
                Review submitted draft versions before they are published to readers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center text-slate-400">Loading pending approvals...</div>
          ) : !approvals || approvals.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">All caught up!</h3>
              <p className="text-sm text-slate-500 mt-1">
                There are no article versions waiting for review at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((item) => (
                <div
                  key={item.version_id}
                  className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-xs transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                        {item.article_code}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                        {item.category_name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          item.change_type === 'MAJOR'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        v{item.version_number} ({item.change_type || 'CHANGE'})
                      </span>
                      {item.ack_required && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
                          Ack Required
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{item.summary}</p>
                    {item.change_summary && (
                      <p className="text-xs text-slate-500 italic">
                        Note: &ldquo;{item.change_summary}&rdquo;
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {item.submitted_by?.name || 'Unknown Maker'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.submitted_at
                          ? new Date(item.submitted_at).toLocaleDateString()
                          : 'Recent'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setIsRejecting(false);
                        setRejectComment('');
                        setActionError(null);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review Sub-modal / Action Dialog */}
        {selectedItem && (
          <div className="border-t border-slate-200 bg-slate-50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Decision for {selectedItem.article_code}: &ldquo;{selectedItem.title}&rdquo; (v{selectedItem.version_number})
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            {isRejecting ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Reason for rejection (sent back to author):
                </label>
                <textarea
                  rows={3}
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Explain what needs to be changed or corrected..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRejecting(false)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-white text-slate-700"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={handleReject}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                  >
                    {reviewMutation.isPending ? 'Sending...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-600">
                  Approving will publish this version immediately to all eligible readers.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRejecting(true)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject & Return
                  </button>
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={handleApprove}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {reviewMutation.isPending ? 'Publishing...' : 'Approve & Publish'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
