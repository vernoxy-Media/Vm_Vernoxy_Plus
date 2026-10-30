import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  useKbKpisQuery,
  useKbArticlesQuery,
} from '../../hooks/use-kb-articles';
import { useKbCategoriesQuery } from '../../hooks/use-kb-settings';
import { KnowledgeBaseApprovalsModal } from './KnowledgeBaseApprovalsModal';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  FileEdit,
  AlertTriangle,
  Pin,
  ChevronRight,
  User,
  Eye,
  Sparkles,
  Layers,
  ChevronLeft,
} from 'lucide-react';

export const KnowledgeBasePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeSpace, setActiveSpace] = useState<'INTERNAL' | 'CLIENT'>('INTERNAL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mineOnly, setMineOnly] = useState(false);
  const [ackOnly, setAckOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [approvalsModalOpen, setApprovalsModalOpen] = useState(false);

  const isAdmin = Boolean(user?.access?.can_manage_organization);

  const { data: kpis } = useKbKpisQuery();
  const { data: categories } = useKbCategoriesQuery(activeSpace);
  const { data: articlesData, isLoading } = useKbArticlesQuery({
    space: activeSpace,
    category_id: selectedCategoryId,
    status: selectedStatus || undefined,
    search: searchQuery || undefined,
    mine: mineOnly,
    ack_only: ackOnly,
    page,
    limit: 10,
  });

  const handleSpaceChange = (newSpace: 'INTERNAL' | 'CLIENT') => {
    setActiveSpace(newSpace);
    setSelectedCategoryId(undefined);
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-blue-600" />
            <span>Knowledge Base</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official company documentation, HR & IT policies, guides, and client knowledge resources.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setApprovalsModalOpen(true)}
              className="relative px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Approvals</span>
              {Boolean(kpis?.pending_approvals) && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {kpis?.pending_approvals}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/knowledge-base/new')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Article</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards (BFD Reference Screen 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {kpis?.published_articles ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Live for readers</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">In Review</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {kpis?.pending_approvals ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Awaiting approval</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Open Drafts</span>
            <FileEdit className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {kpis?.open_drafts ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">In preparation</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Review Due</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {kpis?.review_due ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Cycle elapsed</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Ack</span>
            <AlertTriangle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {kpis?.overdue_acknowledgements ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Compliance actions</span>
        </div>
      </div>

      {/* Main Container: Spaces + Search & Filter + List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Space Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 px-6 pt-3 gap-6 bg-slate-50/50">
          <button
            type="button"
            onClick={() => handleSpaceChange('INTERNAL')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition-all relative ${
              activeSpace === 'INTERNAL'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Internal Knowledge
            {activeSpace === 'INTERNAL' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSpaceChange('CLIENT')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition-all relative ${
              activeSpace === 'CLIENT'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Client Knowledge
            {activeSpace === 'CLIENT' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, KB code, tag or summary..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Category filter */}
            <select
              value={selectedCategoryId ?? ''}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value ? Number(e.target.value) : undefined);
                setPage(1);
              }}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories?.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="REVIEW_DUE">Review Due</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            {/* My articles toggle */}
            <button
              type="button"
              onClick={() => {
                setMineOnly(!mineOnly);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                mineOnly
                  ? 'border-blue-600 bg-blue-50/60 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              My Articles
            </button>

            {/* Ack required toggle */}
            <button
              type="button"
              onClick={() => {
                setAckOnly(!ackOnly);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                ackOnly
                  ? 'border-purple-600 bg-purple-50/60 text-purple-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Ack Required
            </button>
          </div>
        </div>

        {/* Articles Table / List */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-slate-400 font-medium text-xs">
              Loading articles...
            </div>
          ) : !articlesData || articlesData.data.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No articles found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No knowledge base articles match your selected filters. Create a new article or adjust your search.
              </p>
              <button
                type="button"
                onClick={() => navigate('/knowledge-base/new')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Create Article
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Article</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Views</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {articlesData.data.map((art) => (
                  <tr
                    key={art.article_id}
                    onClick={() => navigate(`/knowledge-base/articles/${art.article_code}`)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    {/* Article Info */}
                    <td className="py-4 px-6 max-w-md">
                      <div className="flex items-start gap-2.5">
                        {art.is_pinned && (
                          <Pin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5 fill-blue-600" />
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {art.article_code}
                            </span>
                            {art.ack_required && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                Ack Required
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                            {art.title}
                          </h4>
                          {art.summary && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">{art.summary}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-700 px-2.5 py-1 rounded-lg bg-slate-100">
                        {art.category.name}
                      </span>
                    </td>

                    {/* Owner */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{art.owner.name}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          art.display_status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : art.display_status.includes('IN_REVIEW')
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : art.display_status === 'ARCHIVED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {art.display_status}
                      </span>
                    </td>

                    {/* Engagement */}
                    <td className="py-4 px-4 text-right text-slate-500 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 text-slate-600">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>{art.views_count}</span>
                      </div>
                    </td>

                    {/* Action Arrow */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                        Read
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {articlesData && articlesData.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page {articlesData.pagination.page} of {articlesData.pagination.totalPages}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= articlesData.pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approvals Modal */}
      <KnowledgeBaseApprovalsModal
        isOpen={approvalsModalOpen}
        onClose={() => setApprovalsModalOpen(false)}
      />
    </div>
  );
};
