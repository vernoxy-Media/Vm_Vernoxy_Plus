import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  useKbArticleDetailQuery,
  useCreateKbArticleMutation,
  useUpdateKbDraftMutation,
  useSubmitKbArticleMutation,
  useDirectPublishMutation,
} from '../../hooks/use-kb-articles';
import { useKbCategoriesQuery } from '../../hooks/use-kb-settings';
import {
  useDepartmentOptionsQuery,
  useEmployeeOptionsQuery,
} from '../../hooks/use-organization';
import {
  ArrowLeft,
  Save,
  Send,
  Sparkles,
  FileText,
  Video,
  Paperclip,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';

export const ArticleEditorPage: React.FC = () => {
  const { identifier } = useParams<{ identifier?: string }>();
  const isEdit = Boolean(identifier);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: existingArticle, isLoading: isLoadingArticle } = useKbArticleDetailQuery(
    identifier || '',
  );

  const [space, setSpace] = useState<'INTERNAL' | 'CLIENT'>('INTERNAL');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [contentType, setContentType] = useState<'WRITTEN' | 'DOCUMENT' | 'VIDEO'>('WRITTEN');
  const [ownerEmpId, setOwnerEmpId] = useState<number | ''>('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [reviewCycleMonths, setReviewCycleMonths] = useState<number | ''>(12);
  const [ackRequired, setAckRequired] = useState(false);
  const [ackDueDays, setAckDueDays] = useState(7);
  const [audienceScope, setAudienceScope] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [audienceDepartments, setAudienceDepartments] = useState<number[]>([]);
  const [tagsString, setTagsString] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [attachments, setAttachments] = useState<
    Array<{ file_name: string; file_url: string; file_size_bytes: number; mime_type: string }>
  >([]);

  // Modals for Submit & Direct Publish
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [changeType, setChangeType] = useState<'MAJOR' | 'MINOR'>('MINOR');
  const [changeSummary, setChangeSummary] = useState('');

  const [directPublishModalOpen, setDirectPublishModalOpen] = useState(false);
  const [publishReason, setPublishReason] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  const { data: categories } = useKbCategoriesQuery(space);
  const { data: departmentOptions } = useDepartmentOptionsQuery();
  const { data: employeeOptions } = useEmployeeOptionsQuery();

  const createMutation = useCreateKbArticleMutation();
  const updateDraftMutation = useUpdateKbDraftMutation(existingArticle?.article_id || 0);
  const submitMutation = useSubmitKbArticleMutation(existingArticle?.article_id || 0);
  const directPublishMutation = useDirectPublishMutation(existingArticle?.article_id || 0);

  const isAdmin = Boolean(user?.access?.can_manage_organization);

  useEffect(() => {
    if (existingArticle) {
      setSpace(existingArticle.space as any);
      setCategoryId(existingArticle.category.category_id);
      setOwnerEmpId(existingArticle.owner.emp_id);
      setContentType(existingArticle.content_type as any);
      setReviewCycleMonths(
        existingArticle.review_cycle_months !== undefined
          ? existingArticle.review_cycle_months
          : '',
      );
      setAckRequired(existingArticle.ack_required);
      setAckDueDays(existingArticle.ack_due_days || 7);
      setAudienceScope(existingArticle.audience_scope as any);
      setAudienceDepartments(existingArticle.audience_departments || []);

      const activeVer =
        existingArticle.current_display_version || existingArticle.live_version;
      if (activeVer) {
        setTitle(activeVer.title || '');
        setSummary(activeVer.summary || '');
        setContent(activeVer.content || '');
        setVideoUrl(activeVer.video_url || '');
        if (activeVer.effective_from) {
          setEffectiveFrom(activeVer.effective_from.split('T')[0]);
        }
        if (activeVer.tags) {
          setTagsString(activeVer.tags.join(', '));
        }
      }

      if (existingArticle.attachments) {
        setAttachments(
          existingArticle.attachments.map((a) => ({
            file_name: a.file_name,
            file_url: a.file_url,
            file_size_bytes: Number(a.file_size_bytes),
            mime_type: a.mime_type,
          })),
        );
      }
    } else if (user?.emp_id) {
      setOwnerEmpId(user.emp_id);
    }
  }, [existingArticle, user?.emp_id]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    setCategoryId(val);
    const cat = categories?.find((c) => c.category_id === val);
    if (cat) {
      if (cat.default_owner_id && !isEdit) setOwnerEmpId(cat.default_owner_id);
      if (cat.default_review_cycle_months !== undefined && !isEdit) {
        setReviewCycleMonths(cat.default_review_cycle_months || '');
      }
      if (cat.default_ack_required !== undefined && !isEdit) {
        setAckRequired(cat.default_ack_required);
      }
      if (cat.default_audience_scope && !isEdit) {
        setAudienceScope(cat.default_audience_scope as any);
      }
      if (cat.default_audience_departments?.length && !isEdit) {
        setAudienceDepartments(cat.default_audience_departments);
      }
    }
  };

  const validateForm = () => {
    if (!categoryId) {
      setFormError('Please select a category');
      return false;
    }
    if (title.trim().length < 5 || title.trim().length > 120) {
      setFormError('Title must be between 5 and 120 characters');
      return false;
    }
    if (summary.trim().length < 10) {
      setFormError('Summary must be at least 10 characters');
      return false;
    }
    if (ackRequired && !effectiveFrom) {
      setFormError('Effective date is required when policy acknowledgement is enabled');
      return false;
    }
    setFormError(null);
    return true;
  };

  const getPayload = () => {
    const tags = tagsString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    return {
      space,
      category_id: Number(categoryId),
      title: title.trim(),
      summary: summary.trim(),
      content_type: contentType,
      owner_emp_id: ownerEmpId ? Number(ownerEmpId) : undefined,
      effective_from: effectiveFrom || undefined,
      review_cycle_months: reviewCycleMonths !== '' ? Number(reviewCycleMonths) : undefined,
      ack_required: ackRequired,
      ack_due_days: Number(ackDueDays) || 7,
      audience_scope: audienceScope,
      audience_departments: audienceDepartments,
      tags,
      content,
      video_url: videoUrl.trim() || undefined,
      attachments,
    };
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    try {
      if (isEdit && existingArticle) {
        await updateDraftMutation.mutateAsync(getPayload());
        navigate(`/knowledge-base/articles/${existingArticle.article_id}`);
      } else {
        const res = await createMutation.mutateAsync(getPayload());
        navigate(`/knowledge-base/articles/${res.article_id}`);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save draft');
    }
  };

  const handleSubmitForApproval = async () => {
    if (!changeSummary.trim()) {
      setFormError('Please provide a summary of changes');
      return;
    }
    try {
      let targetArticleId = existingArticle?.article_id;
      if (!targetArticleId) {
        const created = await createMutation.mutateAsync(getPayload());
        targetArticleId = created.article_id;
      } else {
        await updateDraftMutation.mutateAsync(getPayload());
      }

      await submitMutation.mutateAsync({
        change_type: changeType,
        change_summary: changeSummary.trim(),
      });
      setSubmitModalOpen(false);
      navigate(`/knowledge-base/articles/${targetArticleId}`);
    } catch (err: any) {
      setFormError(err.message || 'Submission failed');
    }
  };

  const handleDirectPublish = async () => {
    try {
      let targetArticleId = existingArticle?.article_id;
      if (!targetArticleId) {
        const created = await createMutation.mutateAsync(getPayload());
        targetArticleId = created.article_id;
      } else {
        await updateDraftMutation.mutateAsync(getPayload());
      }

      await directPublishMutation.mutateAsync({
        change_type: changeType,
        change_summary: changeSummary.trim() || 'Initial published edition',
        reason: publishReason.trim() || 'Directly published by administrator',
      });
      setDirectPublishModalOpen(false);
      navigate(`/knowledge-base/articles/${targetArticleId}`);
    } catch (err: any) {
      setFormError(err.message || 'Direct publish failed');
    }
  };

  const addAttachment = () => {
    setAttachments([
      ...attachments,
      { file_name: '', file_url: '', file_size_bytes: 1024, mime_type: 'application/pdf' },
    ]);
  };

  const updateAttachment = (idx: number, field: string, value: any) => {
    const updated = [...attachments];
    updated[idx] = { ...updated[idx], [field]: value };
    setAttachments(updated);
  };

  const removeAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  if (isLoadingArticle) {
    return (
      <div className="min-h-screen bg-[#f4f6fa] p-8 flex items-center justify-center">
        <div className="text-slate-500 font-medium animate-pulse">Loading article editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fa] pb-16">
      {/* Top Navbar */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-20 px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                {isEdit ? `Edit Article (${existingArticle?.article_code})` : 'Create New Article'}
              </h1>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? 'Saving changes updates or drafts a new version.'
                  : 'Articles are saved as drafts and reviewed before publishing.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={createMutation.isPending || updateDraftMutation.isPending}
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>
                {createMutation.isPending || updateDraftMutation.isPending
                  ? 'Saving...'
                  : 'Save Draft'}
              </span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (validateForm()) setDirectPublishModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Publish without review</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (validateForm()) setSubmitModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Submit for Approval</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-6 space-y-6">
        {formError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Section 1: Article Classification & Metadata */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider text-xs">
            1. Placement & Ownership
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Space</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isEdit}
                  onClick={() => setSpace('INTERNAL')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                    space === 'INTERNAL'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Internal
                </button>
                <button
                  type="button"
                  disabled={isEdit}
                  onClick={() => setSpace('CLIENT')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                    space === 'CLIENT'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Client
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={handleCategoryChange}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Category...</option>
                {categories?.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Article Owner *
              </label>
              <select
                value={ownerEmpId}
                onChange={(e) => setOwnerEmpId(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Owner...</option>
                {employeeOptions?.map((emp) => (
                  <option key={emp.emp_id} value={emp.emp_id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Content Details */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider text-xs">
            2. Article Content
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Leave Policy and Encashment Guidelines"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">5 to 120 characters</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Summary *</label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="A brief overview shown in article lists and search results..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">10 to 500 characters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Content Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'WRITTEN', label: 'Written', icon: FileText },
                  { id: 'DOCUMENT', label: 'Document', icon: Paperclip },
                  { id: 'VIDEO', label: 'Video', icon: Video },
                ].map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setContentType(type.id as any)}
                      className={`p-2 text-xs font-medium rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        contentType === type.id
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Effective From
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Review Cycle
              </label>
              <select
                value={reviewCycleMonths}
                onChange={(e) =>
                  setReviewCycleMonths(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">No Scheduled Review</option>
                <option value={3}>Every 3 Months</option>
                <option value={6}>Every 6 Months</option>
                <option value={12}>Every 12 Months (1 Year)</option>
                <option value={24}>Every 24 Months (2 Years)</option>
              </select>
            </div>
          </div>

          {contentType === 'VIDEO' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Video URL</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/... or direct video embed link"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Article Body</label>
            <textarea
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write or paste your article content here (Markdown or HTML supported)..."
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tags</label>
            <input
              type="text"
              value={tagsString}
              onChange={(e) => setTagsString(e.target.value)}
              placeholder="e.g. leave, holiday, encashment, hr, policy (separated by commas)"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">Attachments</label>
              <button
                type="button"
                onClick={addAttachment}
                className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add File</span>
              </button>
            </div>

            {attachments.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                No attachments added. Click &ldquo;Add File&rdquo; to attach documents or manuals.
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-xl bg-slate-50/50"
                  >
                    <input
                      type="text"
                      placeholder="File Name (e.g. Leave_Policy_2026.pdf)"
                      value={att.file_name}
                      onChange={(e) => updateAttachment(idx, 'file_name', e.target.value)}
                      className="flex-1 text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    />
                    <input
                      type="url"
                      placeholder="File URL"
                      value={att.file_url}
                      onChange={(e) => updateAttachment(idx, 'file_url', e.target.value)}
                      className="flex-1 text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Audience & Policy Acknowledgement */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider text-xs">
            3. Audience & Acknowledgement
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">Audience Scope</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="audienceScope"
                    checked={audienceScope === 'ALL'}
                    onChange={() => setAudienceScope('ALL')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>All Employees / All Clients</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="audienceScope"
                    checked={audienceScope === 'CUSTOM'}
                    onChange={() => setAudienceScope('CUSTOM')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Restricted / Custom Audience</span>
                </label>
              </div>

              {audienceScope === 'CUSTOM' && (
                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Target Departments:
                  </span>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {departmentOptions?.map((dep) => (
                      <label
                        key={dep.dep_id}
                        className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={audienceDepartments.includes(dep.dep_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAudienceDepartments([...audienceDepartments, dep.dep_id]);
                            } else {
                              setAudienceDepartments(
                                audienceDepartments.filter((id) => id !== dep.dep_id),
                              );
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{dep.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 border border-slate-200 rounded-xl bg-slate-50/50">
                <input
                  type="checkbox"
                  id="ackRequired"
                  checked={ackRequired}
                  onChange={(e) => setAckRequired(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <div>
                  <label
                    htmlFor="ackRequired"
                    className="text-xs font-bold text-slate-900 cursor-pointer"
                  >
                    Require Policy Acknowledgement
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Readers must click &ldquo;I have read and understood&rdquo; for compliance tracking.
                  </p>
                </div>
              </div>

              {ackRequired && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Acknowledgement Due Days
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={ackDueDays}
                    onChange={(e) => setAckDueDays(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Days readers have before compliance is marked Overdue.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit for Approval Modal */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Submit for Approval</h3>
            <p className="text-xs text-slate-500">
              This version will be sent to the administrator for review before becoming live.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Change Classification
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChangeType('MINOR')}
                  className={`p-2.5 text-xs font-semibold rounded-xl border text-center transition-all ${
                    changeType === 'MINOR'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Minor Change
                  <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                    Typos, formatting, links
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setChangeType('MAJOR')}
                  className={`p-2.5 text-xs font-semibold rounded-xl border text-center transition-all ${
                    changeType === 'MAJOR'
                      ? 'border-amber-600 bg-amber-50/50 text-amber-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Major Change
                  <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                    Policy rules, obligations
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Change Summary *
              </label>
              <textarea
                rows={3}
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Explain what was altered in this revision..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitMutation.isPending || !changeSummary.trim()}
                onClick={handleSubmitForApproval}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Publish Modal (Admin only) */}
      {directPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Publish without review</h3>
            <p className="text-xs text-slate-500">
              When an administrator authors a policy, they can publish directly with a recorded reason, marking the version as &ldquo;Self-approved&rdquo;.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Administrative Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={publishReason}
                onChange={(e) => setPublishReason(e.target.value)}
                placeholder="e.g. Author is Admin; direct CEO authorization (defaults to 'Directly published by administrator')..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDirectPublishModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={directPublishMutation.isPending}
                onClick={handleDirectPublish}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
              >
                {directPublishMutation.isPending ? 'Publishing...' : 'Publish Immediately'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
