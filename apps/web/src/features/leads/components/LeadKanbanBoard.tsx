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
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
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
    colorDot: 'bg-blue-500',
  },
  {
    name: 'Contacted',
    title: 'Contacted',
    colorDot: 'bg-amber-500',
  },
  {
    name: 'Qualified',
    title: 'Qualified',
    colorDot: 'bg-purple-500',
  },
  {
    name: 'Converted',
    title: 'Converted',
    colorDot: 'bg-emerald-500',
  },
  {
    name: 'Lost',
    title: 'Lost',
    colorDot: 'bg-rose-500',
  },
  {
    name: 'On Hold',
    title: 'On Hold',
    colorDot: 'bg-slate-400',
  },
];

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
  duration: 220,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
};

interface KanbanColumnProps {
  stage: (typeof STAGES)[0];
  leads: Lead[];
  metric?: { count: number; totalValue: number };
  onSelect: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onAdd: () => void;
  activeLead: Lead | null;
  sourceStageTitle: string | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  leads,
  metric,
  onSelect,
  onEdit,
  onConvert,
  onAdd,
  activeLead,
  sourceStageTitle,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.name,
  });

  const isDraggingAny = activeLead !== null;
  const isSourceStage = activeLead?.lead_stage === stage.name;

  const formatCurrency = (val: number) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl bg-slate-100/70 p-3 min-w-[290px] max-w-[310px] shrink-0 transition-all duration-150 min-h-[500px] ${
        isDraggingAny ? 'bg-slate-100/90 ring-1 ring-slate-200/60' : ''
      }`}
    >
      {/* Column Header matching TaskColumn in screenshot 2 */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${stage.colorDot}`} />
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">{stage.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">
            {formatCurrency(metric?.totalValue || leads.reduce((acc, l) => acc + Number(l.estimated_turnover || 0), 0))}
          </span>
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-slate-600 shadow-2xs">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Column Cards Container */}
      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
        {/* Drop Target Indicator matching Image 2 */}
        {isDraggingAny && !isSourceStage && (
          isOver ? (
            /* Active hovered drop indicator card matching Image 2 */
            <div className="rounded-2xl border-2 border-blue-600 bg-white p-3 shadow-xs mb-3 transition-all duration-150 animate-in fade-in zoom-in-95">
              <div className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5 leading-none">
                <span>{sourceStageTitle}</span>
                <span className="text-slate-400 font-normal">→</span>
                <span>{stage.title}</span>
              </div>
              <div className="mt-2.5 h-8 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 flex items-center justify-center text-slate-400">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          ) : (
            /* Idle drop slot on adjacent valid columns matching Image 2 */
            <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/60 p-3 mb-3 transition-all duration-150">
              <div className="text-[13px] font-medium text-slate-400 flex items-center gap-1.5 leading-none">
                <span>{sourceStageTitle}</span>
                <span className="text-slate-300 font-normal">→</span>
                <span>{stage.title}</span>
              </div>
              <div className="mt-2.5 h-8 rounded-lg border border-dashed border-slate-200 bg-slate-50/30 flex items-center justify-center text-slate-300">
                <Plus className="w-3.5 h-3.5 stroke-[1.8]" />
              </div>
            </div>
          )
        )}

        {/* Existing Leads or Empty State */}
        {leads.length === 0 ? (
          !isDraggingAny ? (
            <div
              className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors text-xs font-medium cursor-pointer"
              onClick={onAdd}
            >
              No leads yet
            </div>
          ) : null
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.lead_id}
              lead={lead}
              onSelect={onSelect}
              onEdit={onEdit}
              onConvert={onConvert}
            />
          ))
        )}
      </div>

      {/* Add Lead Button at Column Bottom */}
      <div className="pt-2 border-t border-slate-200/50 mt-2">
        <button
          type="button"
          onClick={onAdd}
          className="w-full py-1.5 px-3 rounded-xl border border-dashed border-slate-200 hover:border-slate-300 hover:bg-white text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Lead
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

  const handleDragCancel = () => {
    setActiveLead(null);
  };

  const sourceStageConfig = React.useMemo(() => {
    if (!activeLead) return null;
    return STAGES.find((s) => s.name === activeLead.lead_stage);
  }, [activeLead]);

  const sourceStageTitle = sourceStageConfig ? sourceStageConfig.title : (activeLead?.lead_stage || 'New Leads');

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
      onDragCancel={handleDragCancel}
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
            activeLead={activeLead}
            sourceStageTitle={sourceStageTitle}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={dropAnimationConfig}>
        {activeLead ? (
          <div className="w-[285px] pointer-events-none">
            <LeadCard
              lead={activeLead}
              onSelect={() => {}}
              onEdit={() => {}}
              onConvert={() => {}}
              isOverlay={true}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
