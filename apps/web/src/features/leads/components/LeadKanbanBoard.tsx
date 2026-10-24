import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  defaultDropAnimationSideEffects,
  DropAnimation,
  CollisionDetection,
  pointerWithin,
  closestCorners,
  Over,
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

const VALID_STAGES = STAGES.map((s) => s.name);

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
  isOverTarget: boolean;
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
  isOverTarget,
}) => {
  const { setNodeRef, isOver: nodeIsOver } = useDroppable({
    id: stage.name,
    data: {
      type: 'Column',
      stage: stage.name,
    },
  });

  const isOver = isOverTarget || nodeIsOver;
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
  const [localLeads, setLocalLeads] = React.useState<Lead[]>(leads);
  const [activeLead, setActiveLead] = React.useState<Lead | null>(null);
  const [overStage, setOverStage] = React.useState<string | null>(null);

  // Synchronize local board whenever server leads update
  React.useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Responsive 5px gesture allows immediate, smooth drag start
      },
    })
  );

  /**
   * Robust resolver that identifies the target column stage whether the user drops
   * on the column, the column header, the drop indicator box, or another lead card.
   */
  const getStageFromDroppable = (over: Over | null): string | null => {
    if (!over) return null;
    const overIdStr = String(over.id);

    // 1. Direct column ID match (e.g. 'Contacted')
    if (VALID_STAGES.includes(overIdStr)) {
      return overIdStr;
    }

    // 2. Droppable data stage payload
    const dataStage = over.data.current?.stage;
    if (dataStage && VALID_STAGES.includes(dataStage)) {
      return dataStage;
    }

    // 3. Dropped onto another lead card with attached lead data
    const leadData = over.data.current?.lead as Lead | undefined;
    if (leadData?.lead_stage && VALID_STAGES.includes(leadData.lead_stage)) {
      return leadData.lead_stage;
    }

    // 4. Fallback: Search by over lead ID among current local leads
    const overLeadId = parseInt(overIdStr, 10);
    if (!isNaN(overLeadId)) {
      const match = localLeads.find((l) => l.lead_id === overLeadId);
      if (match?.lead_stage && VALID_STAGES.includes(match.lead_stage)) {
        return match.lead_stage;
      }
    }

    return null;
  };

  /**
   * Collision detection prioritizing exact pointer position, falling back to closest corners.
   * Eliminates dead zones and dropped drag events.
   */
  const collisionDetectionStrategy: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return closestCorners(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const leadId = Number(event.active.id);
    const lead = localLeads.find((l) => l.lead_id === leadId) || (event.active.data.current?.lead as Lead);
    if (lead) {
      setActiveLead(lead);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    const targetStage = getStageFromDroppable(over);
    setOverStage(targetStage);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);
    setOverStage(null);

    if (!over) return;

    const leadId = Number(active.id);
    const targetStage = getStageFromDroppable(over);
    if (!targetStage) return;

    const lead = localLeads.find((l) => l.lead_id === leadId);
    if (!lead || lead.lead_stage === targetStage) return;

    // 1. Optimistically update localLeads immediately so the card NEVER snaps back
    setLocalLeads((prev) =>
      prev.map((l) => (l.lead_id === leadId ? { ...l, lead_stage: targetStage } : l))
    );

    // 2. Dispatch state update to parent & backend API
    onStageChange(leadId, targetStage);
  };

  const handleDragCancel = () => {
    setActiveLead(null);
    setOverStage(null);
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

    localLeads.forEach((lead) => {
      const stage = lead.lead_stage || 'New';
      if (grouped[stage]) {
        grouped[stage].push(lead);
      } else {
        grouped['New'].push(lead);
      }
    });

    return grouped;
  }, [localLeads]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
            isOverTarget={overStage === stage.name}
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
