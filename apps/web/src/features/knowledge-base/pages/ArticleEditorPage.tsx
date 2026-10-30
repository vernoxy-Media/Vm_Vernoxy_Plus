import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  useKbArticleDetailQuery,
  useCreateKbArticleMutation,
  useUpdateKbDraftMutation,
  useSubmitKbArticleMutation,
  useDirectPublishMutation,
} from '../hooks/use-kb-articles';
import { useKbCategoriesQuery } from '../hooks/use-kb-settings';
import {
  useDepartmentOptionsQuery,
  useEmployeeOptionsQuery,
} from '@/features/organization/hooks/use-organization';
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
  Lock,
  Eye,
  Edit3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Link as LinkIcon,
  Table as TableIcon,
  Minus,
  CheckCircle2,
  Building2,
  Globe,
} from 'lucide-react';

export const ArticleEditorPage: React.FC = () => {
  const { identifier } = useParams<{ identifier?: string }>();
  const isEdit = Boolean(identifier);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: existingArticle } = useKbArticleDetailQuery(
    identifier || '',
  );

  // Form State
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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [attachments, setAttachments] = useState<
    Array<{ file_name: string; file_url: string; file_size_bytes: number; mime_type: string }>
  >([]);

  // Studio Mode: 'write' vs 'preview'
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  // Modals for Submit & Direct Publish
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [changeType, setChangeType] = useState<'MAJOR' | 'MINOR'>('MINOR');
  const [changeSummary, setChangeSummary] = useState('');

  const [directPublishModalOpen, setDirectPublishModalOpen] = useState(false);
  const [publishReason, setPublishReason] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Queries
  const { data: categories } = useKbCategoriesQuery(space);
  const { data: departmentOptions } = useDepartmentOptionsQuery();
  const { data: employeeOptions } = useEmployeeOptionsQuery();

  // Mutations
  const createMutation = useCreateKbArticleMutation();
  const updateDraftMutation = useUpdateKbDraftMutation(existingArticle?.article_id);
  const submitMutation = useSubmitKbArticleMutation(existingArticle?.article_id);
  const directPublishMutation = useDirectPublishMutation(existingArticle?.article_id);

  const isAdmin = Boolean(user?.access?.can_manage_organization);

  // Hydrate on edit
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
        if (activeVer.tags && Array.isArray(activeVer.tags)) {
          setTags(activeVer.tags);
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

  // When space changes, clear category if not valid for new space
  const handleSpaceChange = (newSpace: 'INTERNAL' | 'CLIENT') => {
    if (isEdit) return; // space fixed after first save
    setSpace(newSpace);
    setCategoryId('');
  };

  // Category auto-fill logic (BFD Marker 3)
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

  // Tag Management
  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Department Toggle
  const toggleDepartment = (depId: number) => {
    if (audienceDepartments.includes(depId)) {
      setAudienceDepartments(audienceDepartments.filter((id) => id !== depId));
    } else {
      setAudienceDepartments([...audienceDepartments, depId]);
    }
  };

  // Toolbar snippet inserter
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selectedText = currentText.substring(start, end) || defaultText;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = currentText.substring(0, start) + replacement + currentText.substring(end);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length,
      );
    }, 10);
  };

  // Validation Checks (BFD Part 5)
  const checks = {
    category: Boolean(categoryId),
    title: title.trim().length >= 5 && title.trim().length <= 120,
    summary: summary.trim().length >= 10 && summary.trim().length <= 500,
    effectiveDate: !ackRequired || Boolean(effectiveFrom),
    content:
      contentType === 'VIDEO'
        ? Boolean(videoUrl.trim() || content.trim())
        : Boolean(content.trim() || attachments.length > 0),
    owner: Boolean(ownerEmpId),
  };

  const allChecksPass =
    checks.category &&
    checks.title &&
    checks.summary &&
    checks.effectiveDate &&
    checks.content &&
    checks.owner;

  const validateForm = () => {
    if (!checks.category) {
      setFormError('Please select a category for this article.');
      return false;
    }
    if (!checks.title) {
      setFormError('Title must be between 5 and 120 characters.');
      return false;
    }
    if (!checks.summary) {
      setFormError('Summary must be between 10 and 500 characters.');
      return false;
    }
    if (!checks.owner) {
      setFormError('Please select an article owner.');
      return false;
    }
    if (ackRequired && !effectiveFrom) {
      setFormError('Effective from date is required when Policy Acknowledgement is enabled.');
      return false;
    }
    if (!checks.content) {
      setFormError(
        contentType === 'VIDEO'
          ? 'Please provide a video URL or written guide.'
          : 'Please write article content or attach a document.',
      );
      return false;
    }
    setFormError(null);
    return true;
  };

  const getPayload = () => {
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
        await updateDraftMutation.mutateAsync({
          articleId: existingArticle.article_id,
          data: getPayload(),
        });
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
      setFormError('Please provide a brief summary of changes.');
      return;
    }
    try {
      let targetArticleId = existingArticle?.article_id;
      if (!targetArticleId) {
        const created = await createMutation.mutateAsync(getPayload());
        targetArticleId = created.article_id;
      } else {
        await updateDraftMutation.mutateAsync({
          articleId: targetArticleId,
          data: getPayload(),
        });
      }

      await submitMutation.mutateAsync({
        articleId: targetArticleId,
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
        await updateDraftMutation.mutateAsync({
          articleId: targetArticleId,
          data: getPayload(),
        });
      }

      await directPublishMutation.mutateAsync({
        articleId: targetArticleId,
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
      { file_name: '', file_url: '', file_size_bytes: 1024 * 1024, mime_type: 'application/pdf' },
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

  const isSubmitting =
    createMutation.isPending ||
    updateDraftMutation.isPending ||
    submitMutation.isPending ||
    directPublishMutation.isPending;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Sticky Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/knowledge-base')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Back to Knowledge Base"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {isEdit ? `Edit Article` : 'Create New Article'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Lock className="w-3 h-3 text-slate-400" />
                {existingArticle?.article_code || 'KB-Auto'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? 'Editing draft version. Live version remains visible to readers until published.'
                : 'Articles are drafted, reviewed through governance, and then published to readers.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSaveDraft}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>{createMutation.isPending ? 'Saving...' : 'Save Draft'}</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (validateForm()) setDirectPublishModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Publish without review</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              if (validateForm()) setSubmitModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Submit for Approval</span>
          </button>
        </div>
      </div>

      {/* Global Form Error Banner */}
      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{formError}</span>
        </div>
      )}

      {/* 2-Column Responsive Studio Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Canvas & Content Studio (Col 8) */}
        <div className="xl:col-span-8 space-y-6">
          {/* Card A: Title & Executive Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Article Title <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">{title.trim().length} / 120 chars</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Employee Code of Conduct, Travel Policy & Encashment Rules"
                className="w-full text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-300 border-0 border-b-2 border-slate-200 focus:border-blue-600 focus:ring-0 pb-2 px-0 bg-transparent transition-colors"
                maxLength={120}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Executive Summary <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">{summary.trim().length} / 500 chars</span>
              </div>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="A concise, high-level overview displayed in article directories, reader search results, and notification previews..."
                className="w-full text-xs text-slate-700 p-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all leading-relaxed"
                maxLength={500}
              />
            </div>
          </div>

          {/* Card B: Article Editor Studio */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Studio Navigation & Formatting Bar */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
              {/* Left: Rich Markdown / HTML Formatting Controls */}
              {activeTab === 'write' ? (
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Inline styles */}
                  <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
                    <button
                      type="button"
                      onClick={() => insertFormatting('**', '**', 'bold text')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Bold (Ctrl+B)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('*', '*', 'italic text')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Italic (Ctrl+I)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<u>', '</u>', 'underlined text')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Underline"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('~~', '~~', 'strikethrough')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Strikethrough"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Headings */}
                  <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n# ', '\n', 'Heading 1')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Heading 1"
                    >
                      <Heading1 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n## ', '\n', 'Heading 2')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Heading 2"
                    >
                      <Heading2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n### ', '\n', 'Heading 3')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Heading 3"
                    >
                      <Heading3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Lists & Callouts */}
                  <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1 gap-0.5">
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n- ', '\n', 'List item')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Bullet List"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n1. ', '\n', 'Numbered item')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n- [ ] ', '\n', 'Checklist task')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Checklist"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Blocks & Inserts */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n> **Note:** ', '\n', 'Important policy notice')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Callout Box"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n```\n', '\n```\n', 'code snippet')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Code Block"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('[', '](https://example.com)', 'Link text')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Insert Link"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertFormatting(
                          '\n| Parameter | Description | Required |\n|---|---|---|\n| Item 1 | Value description | Yes |\n'
                        )
                      }
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Insert Table"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n---\n')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                      title="Divider Rule"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    PREVIEW AS READER (BFD Screen 4)
                  </span>
                  <span className="text-xs text-slate-400">Shows exactly how readers view this content</span>
                </div>
              )}

              {/* Right: Write vs Preview Toggle Pills */}
              <div className="flex items-center bg-slate-200/60 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                    activeTab === 'write'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Write</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                    activeTab === 'preview'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === 'write' ? (
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  rows={20}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your article documentation here... Markdown and HTML styling are fully supported. Use headings, lists, tables, and blockquotes to organize policies cleanly."
                  className="w-full text-xs sm:text-sm p-5 font-mono text-slate-800 bg-white focus:outline-hidden leading-relaxed resize-y border-0 min-h-[460px]"
                />
                <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Markdown & HTML supported</span>
                  <span>{content.length} characters</span>
                </div>
              </div>
            ) : (
              /* Reader Preview Tab */
              <div className="p-8 min-h-[460px] bg-white">
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Preview Banner */}
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center justify-between">
                    <span>This is a live preview simulation of how readers will see this article.</span>
                    <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 bg-amber-200/70 rounded">
                      Draft Preview
                    </span>
                  </div>

                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {title || 'Untitled Article'}
                    </h1>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed italic border-l-2 border-blue-500 pl-3">
                      {summary || 'No summary provided.'}
                    </p>
                  </div>

                  {content ? (
                    <div
                      className="prose prose-slate max-w-none text-sm text-slate-800 leading-relaxed space-y-4 whitespace-pre-wrap font-sans"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No written content yet. Switch to &ldquo;Write&rdquo; to draft your article.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card C: Video Guide Embed (Conditional on VIDEO type) */}
          {contentType === 'VIDEO' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Video className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Video Tutorial Stream (BFD Part 3)
                </h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Video Embed URL or MP4 Link
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/embed/... or direct MP4 video link"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Supports YouTube embeds, Vimeo, Loom, or corporate hosted MP4 URLs.
                </span>
              </div>

              {videoUrl && (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                  <iframe
                    src={videoUrl}
                    title="Video preview"
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}

          {/* Card D: Document Attachments (BFD Part 3) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Downloadable Attachments & Signed Policies
                </h3>
              </div>
              <button
                type="button"
                onClick={addAttachment}
                className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center gap-1 font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Attachment</span>
              </button>
            </div>

            {attachments.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center space-y-1">
                <p className="text-xs text-slate-500 font-medium">No files attached to this article</p>
                <p className="text-[11px] text-slate-400">
                  Readers can download attached policy PDFs, signed agreements, or spreadsheets. Up to 25 MB per file.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50/50"
                  >
                    <div className="w-full sm:w-1/3">
                      <input
                        type="text"
                        placeholder="File Display Name (e.g. Leave_Policy_2026.pdf)"
                        value={att.file_name}
                        onChange={(e) => updateAttachment(idx, 'file_name', e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="w-full sm:flex-1">
                      <input
                        type="url"
                        placeholder="File Download URL (e.g. https://...)"
                        value={att.file_url}
                        onChange={(e) => updateAttachment(idx, 'file_url', e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors self-end sm:self-auto"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata & Side Panel (Col 4, BFD Screen 4) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Panel Card 1: Placement & Space */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              1. Space & Placement
            </h3>

            {/* Space Segmented Switch */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Knowledge Space <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isEdit}
                  onClick={() => handleSpaceChange('INTERNAL')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    space === 'INTERNAL'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-bold">Internal</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    For employees & teams
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isEdit}
                  onClick={() => handleSpaceChange('CLIENT')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    space === 'CLIENT'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-bold">Client</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    For clients & partners
                  </span>
                </button>
              </div>
              {isEdit && (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Space is locked once saved (BFD Marker 2).
                </span>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
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

            {/* Owner */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Article Owner <span className="text-rose-500">*</span>
              </label>
              <select
                value={ownerEmpId}
                onChange={(e) => setOwnerEmpId(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Responsible Owner...</option>
                {employeeOptions?.map((emp) => (
                  <option key={emp.emp_id} value={emp.emp_id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Responsible for article accuracy and periodic review.
              </span>
            </div>

            {/* Content Type Pill Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Content Format
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
                          ? 'border-blue-600 bg-blue-50/70 text-blue-700 font-bold'
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
          </div>

          {/* Panel Card 2: Governance & Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              2. Governance & Review
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Effective From Date {ackRequired && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Date this policy takes formal effect across the company.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Review Cycle Schedule
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

          {/* Panel Card 3: Audience & Policy Acknowledgement */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              3. Audience & Compliance
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Reader Audience
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setAudienceScope('ALL')}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                    audienceScope === 'ALL'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Staff / Clients
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceScope('CUSTOM')}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                    audienceScope === 'CUSTOM'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Restricted Depts
                </button>
              </div>

              {audienceScope === 'CUSTOM' && (
                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2 mt-2">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Select Target Departments:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {departmentOptions?.map((dep) => (
                      <label
                        key={dep.dep_id}
                        className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-100/70"
                      >
                        <input
                          type="checkbox"
                          checked={audienceDepartments.includes(dep.dep_id)}
                          onChange={() => toggleDepartment(dep.dep_id)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span className="truncate">{dep.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Policy Acknowledgement Switch */}
            {space === 'INTERNAL' && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ackRequired}
                    onChange={(e) => setAckRequired(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Require Policy Acknowledgement
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block">
                      Readers must click &ldquo;I have read and understood&rdquo; for compliance tracking.
                    </span>
                  </div>
                </label>

                {ackRequired && (
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Acknowledgement Due Days
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[3, 7, 15, 30].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setAckDueDays(days)}
                          className={`py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                            ackDueDays === days
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel Card 4: Tags & Keywords */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              4. Search Tags & Keywords
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag (e.g. leave, travel)..."
                className="flex-1 text-xs p-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                Add
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Panel Card 5: Pre-Flight Publication Checks (BFD Part 5) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Pre-Flight Checks
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  allChecksPass ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {allChecksPass ? 'Ready to Publish' : 'Checks Pending'}
              </span>
            </div>

            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-4 h-4 ${checks.category ? 'text-emerald-500' : 'text-slate-300'}`}
                />
                <span className={checks.category ? 'text-slate-700' : 'text-slate-400'}>
                  Category assigned
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-4 h-4 ${checks.title ? 'text-emerald-500' : 'text-slate-300'}`}
                />
                <span className={checks.title ? 'text-slate-700' : 'text-slate-400'}>
                  Title valid (5 to 120 chars)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-4 h-4 ${checks.summary ? 'text-emerald-500' : 'text-slate-300'}`}
                />
                <span className={checks.summary ? 'text-slate-700' : 'text-slate-400'}>
                  Executive summary provided
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-4 h-4 ${checks.content ? 'text-emerald-500' : 'text-slate-300'}`}
                />
                <span className={checks.content ? 'text-slate-700' : 'text-slate-400'}>
                  Article content or media attached
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-4 h-4 ${checks.effectiveDate ? 'text-emerald-500' : 'text-slate-300'}`}
                />
                <span className={checks.effectiveDate ? 'text-slate-700' : 'text-slate-400'}>
                  Effective date set {ackRequired ? '(Required for Ack)' : ''}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Submit for Approval Modal (BFD Screen 4 & Section 7) */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="text-base font-bold text-slate-900">Submit Article for Review</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              This version will be sent to the administrator review queue. Readers continue seeing the
              currently published version until approved.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Change Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChangeType('MINOR')}
                  className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition-all ${
                    changeType === 'MINOR'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-bold">Minor Edit</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Fixes typos, clarifications (no re-ack needed)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setChangeType('MAJOR')}
                  className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition-all ${
                    changeType === 'MAJOR'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-bold">Major Revision</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Substantive policy update, resets acks
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Change Summary <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Summarize the modifications made in this version for the reviewer..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitMutation.isPending}
                onClick={handleSubmitForApproval}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit to Queue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Publish Modal (Admin Override, BFD Screen 4) */}
      {directPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="text-base font-bold text-slate-900">Direct Publish (Admin Override)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Publishes this version directly to all readers without waiting for an approval cycle.
              A self-approval record will be stored in audit logs.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Administrative Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={publishReason}
                onChange={(e) => setPublishReason(e.target.value)}
                placeholder="e.g. Author is Admin; direct executive authorization (defaults to 'Directly published by administrator')..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDirectPublishModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={directPublishMutation.isPending}
                onClick={handleDirectPublish}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
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
