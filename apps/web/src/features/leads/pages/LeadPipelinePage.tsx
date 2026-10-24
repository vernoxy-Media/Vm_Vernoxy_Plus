import React, { useState } from 'react';
import {
  TrendingUp,
  LayoutGrid,
  List,
  Search,
  Plus,
  Filter,
  Building2,
  CheckCircle2,
  RefreshCw,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  useLeadsQuery,
  useLeadMastersQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useUpdateLeadStageMutation,
  useConvertLeadMutation,
  useDeleteLeadMutation,
  Lead,
} from '../api/leads.api';
import { LeadKanbanBoard } from '../components/LeadKanbanBoard';
import { LeadTableView } from '../components/LeadTableView';
import { LeadFormModal } from '../components/LeadFormModal';
import { LeadDetailDrawer } from '../components/LeadDetailDrawer';
import { LeadFormData } from '../schemas/lead-form.schema';

export const LeadPipelinePage: React.FC = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedLeadBy, setSelectedLeadBy] = useState<number | undefined>(undefined);
  const [gidcFilter, setGidcFilter] = useState<'all' | 'gidc' | 'non_gidc'>('all');

  // Modal & Drawer State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedStageForAdd, setSelectedStageForAdd] = useState('New');
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);

  // API Queries
  const { data: masters } = useLeadMastersQuery();
  const {
    data,
    isLoading,
    refetch,
  } = useLeadsQuery({
    search: searchTerm,
    status: selectedStage,
    is_gidc: gidcFilter === 'gidc' ? true : gidcFilter === 'non_gidc' ? false : undefined,
    lead_source: selectedSource || undefined,
    lead_by_id: selectedLeadBy,
  });

  // Mutations
  const createMutation = useCreateLeadMutation();
  const updateMutation = useUpdateLeadMutation();
  const stageMutation = useUpdateLeadStageMutation();
  const convertMutation = useConvertLeadMutation();
  const deleteMutation = useDeleteLeadMutation();

  const leads = data?.leads || [];
  const metrics = data?.metrics;

  const handleCreateOrUpdate = async (formData: LeadFormData) => {
    if (editingLead) {
      await updateMutation.mutateAsync({
        id: editingLead.lead_id,
        data: formData as any,
      });
    } else {
      await createMutation.mutateAsync(formData as any);
    }
  };

  const handleStageChange = async (leadId: number, newStage: string) => {
    await stageMutation.mutateAsync({ id: leadId, status: newStage });
    if (selectedLeadForDetail && selectedLeadForDetail.lead_id === leadId) {
      setSelectedLeadForDetail({
        ...selectedLeadForDetail,
        lead_stage: newStage,
      });
    }
  };

  const handleConvert = async (lead: Lead) => {
    if (window.confirm(`Convert "${lead.company_name}" into an official Company and Client?`)) {
      const res = await convertMutation.mutateAsync(lead.lead_id);
      alert(`Success: ${res.message}! Created company: ${res.company_name}`);
      if (selectedLeadForDetail && selectedLeadForDetail.lead_id === lead.lead_id) {
        setSelectedLeadForDetail({
          ...selectedLeadForDetail,
          company_id: res.company_id,
          lead_stage: 'Converted',
        });
      }
    }
  };

  const handleDelete = async (leadId: number) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      await deleteMutation.mutateAsync(leadId);
      if (selectedLeadForDetail && selectedLeadForDetail.lead_id === leadId) {
        setSelectedLeadForDetail(null);
      }
    }
  };

  const formatCurrency = (val?: number) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const totalLeads = metrics?.totalLeadsCount || leads.length;
  const qualifiedCount = metrics?.stageMetrics?.['Qualified']?.count || 0;
  const convertedCount = metrics?.stageMetrics?.['Converted']?.count || 0;
  const conversionRate = totalLeads > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lead Pipeline</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              Sales CRM
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track cold calls, industrial prospects, GIDC estates, and deal conversions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh pipeline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingLead(null);
              setSelectedStageForAdd('New');
              setIsFormOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Lead
          </button>
        </div>
      </div>

      {/* Top Stat Cards (Matching Vernoxy Pulse Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Leads */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Leads
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalLeads}</span>
            <span className="text-xs text-slate-400">Prospects in pipeline</span>
          </div>
        </div>

        {/* Card 2: Estimated Pipeline Value */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Est. Pipeline Value
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {formatCurrency(metrics?.totalPipelineValue)}
            </span>
            <span className="text-xs text-slate-400">Total turnover</span>
          </div>
        </div>

        {/* Card 3: Qualified Prospects */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Qualified Leads
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{qualifiedCount}</span>
            <span className="text-xs text-slate-400">Ready for closing</span>
          </div>
        </div>

        {/* Card 4: Won / Converted Clients */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Converted Clients
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{convertedCount}</span>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
              {conversionRate}% Win Rate
            </span>
          </div>
        </div>
      </div>

      {/* Filter and View Control Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search company, contact person, phone, email, GIDC..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          {/* View toggle (Kanban vs Table) */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Pipeline
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </span>

          {/* Stage filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Stages</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Converted">Converted</option>
            <option value="Lost">Lost</option>
            <option value="On Hold">On Hold</option>
          </select>

          {/* GIDC filter */}
          <select
            value={gidcFilter}
            onChange={(e) => setGidcFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Locations</option>
            <option value="gidc">GIDC Estates Only</option>
            <option value="non_gidc">Non-GIDC</option>
          </select>

          {/* Lead Source filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Sources</option>
            {masters?.lead_sources.map((s) => (
              <option key={s.code} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Lead By (Sales User) filter */}
          <select
            value={selectedLeadBy || ''}
            onChange={(e) => setSelectedLeadBy(e.target.value ? Number(e.target.value) : undefined)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Sales Users</option>
            {masters?.sales_users.map((u) => (
              <option key={u.emp_id} value={u.emp_id}>
                {u.name}
              </option>
            ))}
          </select>

          {(searchTerm || selectedStage !== 'all' || selectedSource || selectedLeadBy || gidcFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedStage('all');
                setSelectedSource('');
                setSelectedLeadBy(undefined);
                setGidcFilter('all');
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline ml-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main View Display */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Loading sales pipeline...</span>
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        <LeadKanbanBoard
          leads={leads}
          stageMetrics={metrics?.stageMetrics}
          onStageChange={handleStageChange}
          onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
          onEditLead={(lead) => {
            setEditingLead(lead);
            setIsFormOpen(true);
          }}
          onConvertLead={handleConvert}
          onAddLeadToStage={(stageName) => {
            setEditingLead(null);
            setSelectedStageForAdd(stageName);
            setIsFormOpen(true);
          }}
        />
      ) : (
        <LeadTableView
          leads={leads}
          onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
          onEditLead={(lead) => {
            setEditingLead(lead);
            setIsFormOpen(true);
          }}
          onConvertLead={handleConvert}
          onDeleteLead={handleDelete}
          onStageChange={handleStageChange}
        />
      )}

      {/* Modals & Drawers */}
      <LeadFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLead(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingLead}
        defaultStage={selectedStageForAdd}
        masters={masters}
        currentUserId={user?.emp_id || 1}
      />

      <LeadDetailDrawer
        lead={selectedLeadForDetail}
        isOpen={Boolean(selectedLeadForDetail)}
        onClose={() => setSelectedLeadForDetail(null)}
        onEdit={(lead) => {
          setSelectedLeadForDetail(null);
          setEditingLead(lead);
          setIsFormOpen(true);
        }}
        onConvert={handleConvert}
        onDelete={handleDelete}
        onStageChange={handleStageChange}
      />
    </div>
  );
};
