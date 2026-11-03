import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  useKbArticleDetailQuery,
  useAcknowledgePolicyMutation,
  useSubmitFeedbackMutation,
  useArchiveKbArticleMutation,
  useRestoreKbArticleMutation,
  useKbVersionsQuery,
  useRecordViewMutation,
} from '../hooks/use-kb-articles';
import {
  ArrowLeft,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  Printer,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  Clock,
  History,
  Archive,
  RotateCcw,
  FileText,
  ShieldAlert,
  Eye,
  Tag,
  Globe,
  Building2,
  BookOpen,
} from 'lucide-react';

export const ArticleDetailPage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: article, isLoading, error, refetch } = useKbArticleDetailQuery(identifier || '');
  const { mutate: recordView } = useRecordViewMutation(article?.article_id || 0);

  const ackMutation = useAcknowledgePolicyMutation(article?.article_id || 0);
  const feedbackMutation = useSubmitFeedbackMutation(article?.article_id || 0);
  const archiveMutation = useArchiveKbArticleMutation(article?.article_id || 0);
  const restoreMutation = useRestoreKbArticleMutation(article?.article_id || 0);

  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  const { data: versions } = useKbVersionsQuery(article?.article_id || 0);

  useEffect(() => {
    if (article?.article_id) {
      recordView();
      if (article.user_feedback) {
        setFeedbackGiven(article.user_feedback.is_helpful);
      }
    }
  }, [article?.article_id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md text-center shadow-xs">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Article Unavailable</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            The article could not be loaded. It may not exist or you might not have permission to view it.
          </p>
          <button
            onClick={() => navigate('/knowledge-base')}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs"
          >
            Back to Knowledge Base
          </button>
        </div>
      </div>
    );
  }

  const activeVersion = article.current_display_version || article.live_version;
  const isAckPending =
    article.ack_required &&
    (!article.user_acknowledgement || article.user_acknowledgement.status !== 'ACKNOWLEDGED');

  const isAdmin = Boolean(user?.access?.can_manage_organization);
  const isOwner = user?.emp_id === article.owner.emp_id;
  const canManage = isAdmin || isOwner;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAcknowledge = async () => {
    await ackMutation.mutateAsync();
    refetch();
  };

  const handleFeedback = async (isHelpful: boolean) => {
    setFeedbackGiven(isHelpful);
    if (!isHelpful) {
      setShowFeedbackInput(true);
    } else {
      await feedbackMutation.mutateAsync({ is_helpful: true });
    }
  };

  const submitNegativeFeedback = async () => {
    await feedbackMutation.mutateAsync({
      is_helpful: false,
      comment: feedbackComment.trim() || undefined,
    });
    setShowFeedbackInput(false);
  };

  const handleArchive = async () => {
    if (!archiveReason.trim()) return;
    await archiveMutation.mutateAsync({ archive_reason: archiveReason.trim() });
    setArchiveModalOpen(false);
    refetch();
  };

  const handleRestore = async () => {
    await restoreMutation.mutateAsync();
    refetch();
  };

  const versionStatusColor =
    activeVersion?.status === 'PUBLISHED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : activeVersion?.status === 'IN_REVIEW'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/knowledge-base')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            title="Back to Knowledge Base"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium min-w-0 overflow-hidden">
            <Link to="/knowledge-base" className="hover:text-blue-600 transition-colors shrink-0">
              Knowledge Base
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 shrink-0">{article.category.name}</span>
            <span className="text-slate-300">/</span>
            <span className="font-mono text-slate-900 font-bold truncate">{article.article_code}</span>
          </nav>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-xs font-medium flex items-center gap-1.5 border border-slate-200"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-xs font-medium flex items-center gap-1.5 border border-slate-200"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-xs font-medium flex items-center gap-1.5 border border-slate-200"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
          </button>

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/knowledge-base/articles/${article.article_id}/edit`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Article</span>
              </button>

              {article.is_archived ? (
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={restoreMutation.isPending}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setArchiveModalOpen(true)}
                  className="p-2 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-xl text-xs font-medium transition-colors"
                  title="Archive Article"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Archive Banner */}
      {article.is_archived && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <Archive className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Archived Article</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              This article was archived on {new Date(article.archived_at || '').toLocaleDateString()}.
              {article.archive_reason && ` Reason: ${article.archive_reason}`}
            </p>
          </div>
        </div>
      )}

      {/* Policy Acknowledgement Banner */}
      {article.ack_required && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isAckPending
              ? 'bg-amber-50/80 border-amber-200'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {isAckPending ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isAckPending ? 'Policy Acknowledgement Required' : 'Policy Acknowledged'}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isAckPending
                    ? 'Please read this document carefully and confirm your understanding within the compliance deadline.'
                    : `You confirmed and acknowledged this policy version on ${
                        article.user_acknowledgement?.acknowledged_at
                          ? new Date(article.user_acknowledgement.acknowledged_at).toLocaleDateString()
                          : 'record'
                      }.`}
                </p>
              </div>
            </div>

            {isAckPending && (
              <button
                type="button"
                disabled={ackMutation.isPending}
                onClick={handleAcknowledge}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {ackMutation.isPending ? 'Confirming...' : 'I have read and understood'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main 2-Column Reading Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Article Reading Column (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          {/* Main Article Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Article Header Area */}
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-6 border-b border-slate-100 space-y-4">
              {/* Meta Pills Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700 border border-slate-200">
                  {article.article_code}
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                  {article.category.name}
                </span>
                {activeVersion && (
                  <span className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold border ${versionStatusColor}`}>
                    v{activeVersion.version_number} &middot; {activeVersion.status}
                  </span>
                )}
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 uppercase font-medium border border-slate-200 flex items-center gap-1">
                  {article.content_type === 'WRITTEN' && <FileText className="w-3 h-3" />}
                  {article.content_type === 'VIDEO' && <Eye className="w-3 h-3" />}
                  {article.content_type === 'DOCUMENT' && <FileText className="w-3 h-3" />}
                  {article.content_type}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {activeVersion?.title || 'Knowledge Base Article'}
              </h1>

              {/* Summary */}
              {activeVersion?.summary && (
                <p className="text-sm text-slate-600 leading-relaxed border-l-3 border-blue-500 pl-3 bg-blue-50/30 py-2 rounded-r-lg">
                  {activeVersion.summary}
                </p>
              )}

              {/* Compact metadata under title */}
              <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {article.owner.name}
                </span>
                {activeVersion?.effective_from && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Effective {new Date(activeVersion.effective_from).toLocaleDateString()}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {article.views_count} views
                </span>
                {activeVersion?.tags && activeVersion.tags.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {activeVersion.tags.slice(0, 3).join(', ')}
                    {activeVersion.tags.length > 3 && ` +${activeVersion.tags.length - 3}`}
                  </span>
                )}
              </div>
            </div>

            {/* Video Player */}
            {article.content_type === 'VIDEO' && activeVersion?.video_url && (
              <div className="mx-6 sm:mx-8 my-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
                <iframe
                  src={activeVersion.video_url}
                  title={activeVersion.title}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}

            {/* Article Body Content */}
            <div className="px-6 sm:px-8 py-6 sm:py-8">
              {activeVersion?.content ? (
                <div
                  className="prose prose-slate max-w-none text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans"
                  dangerouslySetInnerHTML={{ __html: activeVersion.content }}
                />
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm italic">No written content provided for this article.</p>
                </div>
              )}
            </div>

            {/* File Attachments */}
            {article.attachments && article.attachments.length > 0 && (
              <div className="mx-6 sm:mx-8 pb-6 sm:pb-8 pt-6 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Attachments ({article.attachments.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {article.attachments.map((att) => (
                    <a
                      key={att.attachment_id}
                      href={att.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">
                            {att.file_name}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {Math.round(Number(att.file_size_bytes) / 1024)} KB
                          </span>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reader Feedback */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Was this article helpful?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your feedback helps our team keep knowledge documentation accurate and up to date.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleFeedback(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    feedbackGiven === true
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    feedbackGiven === false
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>No</span>
                </button>
              </div>
            </div>

            {/* Negative Feedback Comment */}
            {showFeedbackInput && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  How can we improve this article? (Optional)
                </label>
                <textarea
                  rows={3}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Tell us what was missing, outdated, or unclear..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackInput(false)}
                    className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={submitNegativeFeedback}
                    className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (4 cols) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Article Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Article Details
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Owner</span>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-blue-600" />
                  </div>
                  <span>{article.owner.name}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Space</span>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  {article.space === 'INTERNAL' ? (
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  <span>{article.space === 'INTERNAL' ? 'Internal Knowledge' : 'Client Knowledge'}</span>
                </div>
              </div>

              {activeVersion?.effective_from && (
                <div>
                  <span className="text-slate-400 block mb-1">Effective Date</span>
                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(activeVersion.effective_from).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {article.next_review_date && (
                <div>
                  <span className="text-slate-400 block mb-1">Next Review</span>
                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{new Date(article.next_review_date).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              <div>
                <span className="text-slate-400 block mb-1">Audience Scope</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium border border-slate-200 capitalize text-xs">
                  {article.audience_scope === 'ALL' ? 'All Readers' : 'Restricted'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block mb-1">Engagement</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="block text-lg font-bold text-slate-900">{article.views_count}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Views</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="block text-lg font-bold text-slate-900">{article.downloads_count}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Downloads</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags Card */}
          {activeVersion?.tags && activeVersion.tags.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {activeVersion.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related Articles */}
          {article.related_articles && article.related_articles.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                Related Articles
              </h3>
              <div className="space-y-2">
                {article.related_articles.map((ra) => (
                  <Link
                    key={ra.article_id}
                    to={`/knowledge-base/articles/${ra.article_code}`}
                    className="block p-3 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-200"
                  >
                    <span className="font-mono text-[10px] text-slate-400 font-semibold block">
                      {ra.article_code}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors mt-0.5 line-clamp-1">
                      {ra.title}
                    </h4>
                    {ra.summary && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ra.summary}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Version History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Version History</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
              {versions?.map((ver) => (
                <div key={ver.version_id} className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">
                      Version {ver.version_number}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-lg font-semibold border ${
                        ver.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ver.status === 'IN_REVIEW'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {ver.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">{ver.title}</p>
                  {ver.change_summary && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      &ldquo;{ver.change_summary}&rdquo;
                    </p>
                  )}
                  <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between border-t border-slate-100">
                    <span>By: {ver.created_by || 'Author'}</span>
                    <span>{new Date(ver.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {(!versions || (versions as any[]).length === 0) && (
                <div className="text-center py-8 text-xs text-slate-400">
                  No version history available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archive Reason Modal */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                <Archive className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Archive Article</h3>
                <p className="text-xs text-slate-500">
                  Archived articles are hidden from reader search and lists.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for archiving <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g. Policy superseded by 2027 revision..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={archiveMutation.isPending || !archiveReason.trim()}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {archiveMutation.isPending ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
