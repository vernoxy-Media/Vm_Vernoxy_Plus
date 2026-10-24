import React, { useState } from 'react';
import { useDayDetail } from '../../attendance/hooks/use-attendance';
import { AddRegularizationModal } from '../../attendance/components/AddRegularizationModal';
import { AttendanceDetailModal } from '../../attendance/components/AttendanceDetailModal';
import {
  X,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  CalendarHeart,
  Trash2,
  Bell,
  FileText,
  Briefcase,
  Video,
  ExternalLink,
  Users,
  Lock,
} from 'lucide-react';
import type { CalendarMonthTaskItem, CalendarHolidayItem, CalendarEvent } from '../types';

interface DateDetailSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  holiday?: CalendarHolidayItem | null;
  tasks: CalendarMonthTaskItem[];
  events: CalendarEvent[]; // For meetings, notes and reminders on this date
  currentUserId?: number;
  isAdmin: boolean;
  onSelectTask: (taskId: number) => void;
  onAddTask: () => void; // Admin Add Task
  onAddQuickTask: () => void; // Employee Quick Task
  onScheduleMeeting?: () => void;
  onAddHoliday?: () => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  onCreateNote: (note: string, title?: string) => Promise<void>;
  onDeleteNote: (eventId: number) => Promise<void>;
  onCreateReminder: (title: string, time: string, description?: string) => Promise<void>;
  onDeleteReminder: (eventId: number) => Promise<void>;
}

function formatMinutes(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export const DateDetailSidebar: React.FC<DateDetailSidebarProps> = ({
  isOpen,
  onClose,
  selectedDate,
  holiday,
  tasks,
  events,
  currentUserId,
  isAdmin,
  onSelectTask,
  onAddTask,
  onAddQuickTask,
  onScheduleMeeting,
  onAddHoliday,
  onSelectEvent,
  onCreateNote,
  onDeleteNote,
  onCreateReminder,
  onDeleteReminder,
}) => {
  const [activeTab, setActiveTab] = useState<'meetings' | 'tasks' | 'notes' | 'reminders'>('tasks');

  // Note form state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Reminder form state
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderDesc, setReminderDesc] = useState('');
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);
  const [isRegularizationOpen, setIsRegularizationOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const selectedDateYMD = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const todayYMD = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const isPastOrToday = selectedDateYMD <= todayYMD;

  const { data: attendanceDetail } = useDayDetail(isOpen && isPastOrToday ? selectedDateYMD : null);

  if (!isOpen) return null;

  const dateStr = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Filter tasks for this date
  const dayTasks = tasks.filter((t) => t.submission_date === selectedDateYMD);

  // Filter meetings for this date
  const dayMeetings = events.filter(
    (e) => e.event_type === 'meeting' && e.start_time.slice(0, 10) === selectedDateYMD
  );

  // Group tasks project-wise
  const tasksByProject: Record<string, CalendarMonthTaskItem[]> = {};
  dayTasks.forEach((t) => {
    const proj = t.project_name || 'Personal';
    if (!tasksByProject[proj]) tasksByProject[proj] = [];
    tasksByProject[proj].push(t);
  });

  // Filter notes: private to current user on this specific date per BFD CAL-14
  const notes = events.filter(
    (e) =>
      (e.event_type === 'appointment' || (e.event_type === 'task_block' && !e.task_id)) &&
      e.start_time.slice(0, 10) === selectedDateYMD &&
      (!currentUserId || e.organizer_id === currentUserId)
  );

  // Filter reminders: private to current user on this specific date
  const reminders = events.filter(
    (e) =>
      e.event_type === 'reminder' &&
      e.start_time.slice(0, 10) === selectedDateYMD &&
      (!currentUserId || e.organizer_id === currentUserId)
  );

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;
    setIsSubmittingNote(true);
    try {
      await onCreateNote(noteContent.trim(), noteTitle.trim() || undefined);
      setNoteTitle('');
      setNoteContent('');
      setIsAddingNote(false);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleSaveReminder = async () => {
    if (!reminderTitle.trim()) return;
    setIsSubmittingReminder(true);
    try {
      await onCreateReminder(reminderTitle.trim(), reminderTime, reminderDesc.trim());
      setReminderTitle('');
      setReminderDesc('');
      setIsAddingReminder(false);
    } finally {
      setIsSubmittingReminder(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">{dateStr}</h2>
          </div>
          {holiday && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                <CalendarHeart className="w-3 h-3 text-purple-600" />
                {holiday.name} ({holiday.type})
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Action buttons bar */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-white flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {isAdmin && onAddHoliday ? (
            <button
              onClick={onAddHoliday}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <CalendarHeart className="w-3 h-3 text-purple-600" />
              + Holiday
            </button>
          ) : onScheduleMeeting ? (
            <button
              onClick={onScheduleMeeting}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <Video className="w-3 h-3" />
              + Meeting
            </button>
          ) : null}
          <button
            onClick={() => {
              setActiveTab('notes');
              setIsAddingNote(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <FileText className="w-3 h-3" />
            + Note
          </button>
          <button
            onClick={() => {
              setActiveTab('reminders');
              setIsAddingReminder(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Bell className="w-3 h-3" />
            + Reminder
          </button>
        </div>

        {isAdmin ? (
          <button
            onClick={onAddTask}
            className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
        ) : (
          <button
            onClick={onAddQuickTask}
            className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Quick Task
          </button>
        )}
      </div>

      {/* Daily Attendance Summary Card */}
      {isPastOrToday && (
        <div className="mx-4 my-2.5 p-2.5 rounded-xl bg-teal-50/70 border border-teal-200/80 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 text-white shadow-xs ${
                attendanceDetail?.status === 'present'
                  ? 'bg-emerald-600'
                  : attendanceDetail?.status === 'half_day'
                  ? 'bg-amber-500'
                  : attendanceDetail?.status === 'absent' || attendanceDetail?.status === 'short_hours'
                  ? 'bg-red-500'
                  : attendanceDetail?.status === 'incomplete'
                  ? 'bg-orange-500'
                  : 'bg-teal-600'
              }`}
            >
              {attendanceDetail?.status === 'present'
                ? 'P'
                : attendanceDetail?.status === 'half_day'
                ? 'HD'
                : attendanceDetail?.status === 'absent' || attendanceDetail?.status === 'short_hours'
                ? 'A'
                : attendanceDetail?.status === 'incomplete'
                ? 'MP'
                : 'P'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-800 capitalize">
                  {attendanceDetail?.status_label || (holiday ? 'Holiday' : 'Attendance Day')}
                </span>
                {attendanceDetail?.punched_in_at && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {new Date(attendanceDetail.punched_in_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' - '}
                    {attendanceDetail.punched_out_at
                      ? new Date(attendanceDetail.punched_out_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Active'}
                  </span>
                )}
              </div>
              {attendanceDetail?.production_seconds != null && attendanceDetail.production_seconds > 0 ? (
                <p className="text-[10px] text-slate-500">
                  Working Hours: {Math.floor(attendanceDetail.production_seconds / 3600)}h{' '}
                  {Math.floor((attendanceDetail.production_seconds % 3600) / 60)}m
                </p>
              ) : (
                <p className="text-[10px] text-slate-400">Regular attendance shift</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsDetailModalOpen(true)}
              className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
              title="View Complete Attendance Detail"
            >
              Details
            </button>
            <button
              onClick={() => setIsRegularizationOpen(true)}
              className="text-[11px] font-bold text-teal-800 bg-teal-100 hover:bg-teal-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
              title="Request Attendance Regularization"
            >
              Regularize
            </button>
          </div>
        </div>
      )}

      {isDetailModalOpen && (
        <AttendanceDetailModal
          isOpen={isDetailModalOpen}
          date={selectedDateYMD}
          onClose={() => setIsDetailModalOpen(false)}
          onRegularize={() => {
            setIsDetailModalOpen(false);
            setIsRegularizationOpen(true);
          }}
        />
      )}

      {isRegularizationOpen && (
        <AddRegularizationModal
          isOpen={isRegularizationOpen}
          initialDate={selectedDateYMD}
          initialCheckIn={
            attendanceDetail?.punched_in_at
              ? new Date(attendanceDetail.punched_in_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              : undefined
          }
          initialCheckOut={
            attendanceDetail?.punched_out_at
              ? new Date(attendanceDetail.punched_out_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              : undefined
          }
          onClose={() => setIsRegularizationOpen(false)}
          onSuccess={() => setIsRegularizationOpen(false)}
        />
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('meetings')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'meetings'
              ? 'border-blue-600 text-blue-700 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Meetings ({dayMeetings.length})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'tasks'
              ? 'border-blue-600 text-blue-700 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Tasks ({dayTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'notes'
              ? 'border-blue-600 text-blue-700 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Notes ({notes.length})
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'reminders'
              ? 'border-blue-600 text-blue-700 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Reminders ({reminders.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* MEETINGS TAB */}
        {activeTab === 'meetings' && (
          <div className="space-y-3">
            {dayMeetings.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Video className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium">No meetings scheduled for this date</p>
                {onScheduleMeeting && (
                  <button
                    onClick={onScheduleMeeting}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    + Schedule a meeting
                  </button>
                )}
              </div>
            ) : (
              dayMeetings.map((m) => {
                const startTime = new Date(m.start_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const endTime = new Date(m.end_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isPast = new Date(m.end_time) < new Date();

                return (
                  <div
                    key={m.event_id}
                    onClick={() => onSelectEvent?.(m)}
                    className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{m.title}</h4>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{startTime} – {endTime}</span>
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isPast ? 'bg-slate-200/80 text-slate-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isPast ? 'Attended' : 'Scheduled'}
                      </span>
                    </div>

                    {m.description && (
                      <p className="text-[11px] text-slate-600 line-clamp-2 bg-white/70 p-2 rounded-lg border border-blue-100">
                        {m.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {m.meeting_link ? (
                        <a
                          href={m.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Join Meeting
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      ) : <div />}

                      {m.attendees && m.attendees.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.attendees.length} attendee{m.attendees.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {Object.keys(tasksByProject).length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium">No tasks submitted or approved on this date</p>
                <p className="text-xs text-slate-400 mt-1">
                  Only tasks in Submitted (Orange) or Approved (Green) stage appear here.
                </p>
              </div>
            ) : (
              Object.entries(tasksByProject).map(([projectName, pTasks]) => (
                <div key={projectName} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>{projectName}</span>
                    <span className="text-[11px] font-semibold text-slate-400">({pTasks.length})</span>
                  </div>

                  <div className="space-y-2">
                    {pTasks.map((task) => {
                      const isSubmitted = task.stage === 'requested';
                      return (
                        <div
                          key={task.task_id}
                          onClick={() => onSelectTask(task.task_id)}
                          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {task.task_code}
                              </span>
                              <h4 className="text-xs font-bold text-slate-800 line-clamp-2">
                                {task.title}
                              </h4>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isSubmitted
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {isSubmitted ? 'Submitted' : 'Approved'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                            {task.task_type_name && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                                {task.task_type_name}
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold capitalize ${
                                task.priority === 'urgent'
                                  ? 'bg-rose-100 text-rose-700'
                                  : task.priority === 'high'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {task.priority}
                            </span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-2.5 h-2.5" />
                              Allocated: {formatMinutes(task.allocated_minutes)}
                            </span>
                          </div>

                          {/* Admin view: show submitter / assignee */}
                          {isAdmin && task.assignees.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                              <span className="text-[10px] text-slate-400">Assigned / Worked:</span>
                              <div className="flex items-center gap-1">
                                {task.assignees.map((a) => (
                                  <span
                                    key={a.emp_id}
                                    className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]"
                                  >
                                    {a.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            {isAddingNote && (
              <div className="p-3 bg-slate-50 border border-amber-200 rounded-xl space-y-2">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Note Title (optional, max 100)..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-medium"
                />
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Write a private note for this date (up to 500 characters)..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{noteContent.length}/500 chars</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsAddingNote(false)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!noteContent.trim() || isSubmittingNote}
                      onClick={handleSaveNote}
                      className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmittingNote ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {notes.length === 0 && !isAddingNote ? (
              <div className="py-12 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium">No notes for this date</p>
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                >
                  + Add first note
                </button>
              </div>
            ) : (
              notes.map((n) => (
                <div
                  key={n.event_id}
                  className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-1.5 relative group"
                >
                  {n.title && n.title !== 'Note' && (
                    <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                  )}
                  <p className="text-xs text-slate-800 whitespace-pre-wrap">{n.description || n.title}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1 font-medium text-amber-700">
                      <Lock className="w-2.5 h-2.5" />
                      Only visible to you · {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => onDeleteNote(n.event_id)}
                      title="Delete Note"
                      className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition-opacity p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* REMINDERS TAB */}
        {activeTab === 'reminders' && (
          <div className="space-y-3">
            {isAddingReminder && (
              <div className="p-3 bg-slate-50 border border-blue-200 rounded-xl space-y-2">
                <input
                  type="text"
                  placeholder="Reminder Title..."
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 shrink-0">Time:</label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Optional description / details..."
                  value={reminderDesc}
                  onChange={(e) => setReminderDesc(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsAddingReminder(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!reminderTitle.trim() || isSubmittingReminder}
                    onClick={handleSaveReminder}
                    className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmittingReminder ? 'Saving...' : 'Save Reminder'}
                  </button>
                </div>
              </div>
            )}

            {reminders.length === 0 && !isAddingReminder ? (
              <div className="py-12 text-center text-slate-400">
                <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium">No reminders for this date</p>
                <button
                  onClick={() => setIsAddingReminder(true)}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                >
                  + Add first reminder
                </button>
              </div>
            ) : (
              reminders.map((r) => {
                const timeStr = new Date(r.start_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div
                    key={r.event_id}
                    className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 relative group hover:border-slate-300 shadow-2xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-800">{r.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        {timeStr}
                      </span>
                    </div>
                    {r.description && (
                      <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-wrap">{r.description}</p>
                    )}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onDeleteReminder(r.event_id)}
                        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition-opacity text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
