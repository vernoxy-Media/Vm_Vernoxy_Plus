import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { Plus, HelpCircle, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { Lead } from '../api/leads.api';
import { LeadCard } from './LeadCard';

interface LeadKanbanBoardProps {
  leads: Lead[];
  stageMetrics?: Record<string, { count: number; totalValue: number }>;
  onStageChange: (leadId: number, newStage: string) => void;
  onSelectLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onConvertLead: (lead: Lead) => void;
  onAddLeadToStage: (stageName: string) => void;
}

const STAGES = [
  {
    name: 'New',
    title: 'New Leads',
    color: 'border-t-blue-500 bg-blue-50/30 text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    icon: Sparkles,
  },
  {
    name: 'Contacted',
    title: 'Contacted',
    color: 'border-t-amber-500 bg-amber-50/30 text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    icon: Clock,
  },
  {
    name: 'Qualified',
    title: 'Qualified',
    color: 'border-t-purple-500 bg-purple-50/30 text-purple-700',
    badge: 'bg-purple-100 text-purple-700',
    icon: CheckCircle2,
  },
  {
    name: 'Converted',
    title: 'Converted / Won',
    color: 'border-t-emerald-500 bg-emerald-50/30 text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
  },
  {
    name: 'Lost',
    title: 'Lost',
    color: 'border-t-rose-500 bg-rose-50/30 text-rose-700',
    badge: 'bg-rose-100 text-rose-700',
    icon: AlertCircle,
  },
  {
    name: 'On Hold',
    title: 'On Hold',
    color: 'border-t-slate-400 bg-slate-50 text-slate-700',
    badge: 'bg-slate-200 text-slate-700',
    icon: HelpCircle,
  },
];

interface KanbanColumnProps {
  stage: (typeof STAGES)[0];
  leads: Lead[];
  metric?: { count: number; totalValue: number };
  onSelect: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onAdd: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  leads,
  metric,
  onSelect,
  onEdit,
  onConvert,
  onAdd,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.name,
  });

  const formatCurrency = (val: number) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const Icon = stage.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl bg-slate-100/70 border border-slate-200/80 min-w-[300px] max-w-[320px] shrink-0 transition-colors ${
        isOver ? 'bg-blue-50/60 ring-2 ring-blue-400' : ''
      }`}
    >
      {/* Column Header */}
      <div className={`p-3.5 border-t-4 rounded-t-2xl border-b border-slate-200/80 bg-white ${stage.color}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <h3 className="font-bold text-slate-800 text-sm">{stage.title}</h3>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${stage.badge}`}>
            {leads.length}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>Est. Value:</span>
          <span className="font-semibold text-slate-700">
            {formatCurrency(metric?.totalValue || leads.reduce((acc, l) => acc + Number(l.estimated_turnover || 0), 0))}
          </span>
        </div>
      </div>

      {/* Column Lead Cards Container */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-290px)] min-h-[300px]">
        {leads.map((lead) => (
          <LeadCard
            key={lead.lead_id}
            lead={lead}
            onSelect={onSelect}
            onEdit={onEdit}
            onConvert={onConvert}
          />
        ))}

        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
            <p className="text-xs">No leads in this stage</p>
            <button
              type="button"
              onClick={onAdd}
              className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Lead
            </button>
          </div>
        )}
      </div>

      {/* Add Lead Button at Column Bottom */}
      <div className="p-2 border-t border-slate-200/60">
        <button
          type="button"
          onClick={onAdd}
          className="w-full py-2 px-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Lead to {stage.name}
        </button>
      </div>
    </div>
  );
};

export const LeadKanbanBoard: React.FC<LeadKanbanBoardProps> = ({
  leads,
  stageMetrics,
  onStageChange,
  onSelectLead,
  onEditLead,
  onConvertLead,
  onAddLeadToStage,
}) => {
  const [activeLead, setActiveLead] = React.useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = event.active.data.current?.lead as Lead;
    if (lead) {
      setActiveLead(lead);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = Number(active.id);
    const targetStage = String(over.id);

    const lead = leads.find((l) => l.lead_id === leadId);
    if (!lead) return;

    if (lead.lead_stage !== targetStage) {
      onStageChange(leadId, targetStage);
    }
  };

  // Group leads by stage
  const leadsByStage = React.useMemo(() => {
    const grouped: Record<string, Lead[]> = {
      New: [],
      Contacted: [],
      Qualified: [],
      Converted: [],
      Lost: [],
      'On Hold': [],
    };

    leads.forEach((lead) => {
      const stage = lead.lead_stage || 'New';
      if (grouped[stage]) {
        grouped[stage].push(lead);
      } else {
        grouped['New'].push(lead);
      }
    });

    return grouped;
  }, [leads]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start scrollbar-thin">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage.name}
            stage={stage}
            leads={leadsByStage[stage.name] || []}
            metric={stageMetrics?.[stage.name]}
            onSelect={onSelectLead}
            onEdit={onEditLead}
            onConvert={onConvertLead}
            onAdd={() => onAddLeadToStage(stage.name)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="w-[280px]">
            <LeadCard
              lead={activeLead}
              onSelect={() => {}}
              onEdit={() => {}}
              onConvert={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
