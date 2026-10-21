import React, { useState, useEffect } from 'react';
import {
  X,
  Video,
  Clock,
  Calendar,
  Users,
  MapPin,
  AlignLeft,
} from 'lucide-react';
import type {
  CalendarEventType,
  CreateCalendarEventPayload,
  UnscheduledTask,
} from '../types';
import { fetchAssignableEmployees, AssignableEmployee } from '../api/calendar.api';
import { getLocalToday } from '../date-utils';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCalendarEventPayload) => Promise<void>;
  defaultDate?: string; // YYYY-MM-DD
  defaultStartTime?: string; // HH:mm
  unscheduledTasks: UnscheduledTask[];
  preselectedTaskId?: number | null;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultDate,
  defaultStartTime,
  unscheduledTasks,
  preselectedTaskId,
}) => {
  const [eventType, setEventType] = useState<CalendarEventType>(
    preselectedTaskId ? 'task_block' : 'meeting'
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate || getLocalToday());
  const [startTime, setStartTime] = useState(defaultStartTime || '09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');
  const [taskId, setTaskId] = useState<number | null>(preselectedTaskId || null);
  const [selectedAttendees, setSelectedAttendees] = useState<number[]>([]);
  const [employees, setEmployees] = useState<AssignableEmployee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultDate) setDate(defaultDate);
      if (defaultStartTime) {
        setStartTime(defaultStartTime);
        const [h, m] = defaultStartTime.split(':').map(Number);
        const endH = (h + 1).toString().padStart(2, '0');
        setEndTime(`${endH}:${(m || 0).toString().padStart(2, '0')}`);
      }
      if (preselectedTaskId) {
        setEventType('task_block');
        setTaskId(preselectedTaskId);
        const task = unscheduledTasks.find((t) => t.task_id === preselectedTaskId);
        if (task) {
          setTitle(`[${task.task_code}] ${task.title}`);
        }
      } else {
        setEventType('meeting');
      }
      fetchAssignableEmployees().then(setEmployees);
    }
  }, [isOpen, defaultDate, defaultStartTime, preselectedTaskId, unscheduledTasks]);

  // Handle task selection change
  const handleTaskSelect = (tIdStr: string) => {
    if (!tIdStr) {
      setTaskId(null);
      return;
    }
    const tId = Number(tIdStr);
    setTaskId(tId);
    const task = unscheduledTasks.find((t) => t.task_id === tId);
    if (task) {
      setTitle(`[${task.task_code}] ${task.title}`);
    }
  };

  const generateGoogleMeetLink = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const randPart = (len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setMeetingLink(`https://meet.google.com/${randPart(3)}-${randPart(4)}-${randPart(3)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      setError('End time must be after start time');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        event_type: eventType,
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startDateTime,
        end_time: endDateTime,
        meeting_link: meetingLink.trim() || undefined,
        location: location.trim() || undefined,
        task_id: eventType === 'task_block' ? taskId : undefined,
        attendee_ids: selectedAttendees.length > 0 ? selectedAttendees : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create calendar event');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {eventType === 'task_block' ? 'Schedule Task Block' : 'Schedule Meeting'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          {/* Type Selector Tabs */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setEventType('meeting');
                setTaskId(null);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                eventType === 'meeting'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Meeting
            </button>
            <button
              type="button"
              onClick={() => setEventType('task_block')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                eventType === 'task_block'
                  ? 'bg-white text-purple-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Task Time-Block
            </button>
          </div>

          {/* If Task Time-Block: Select Unscheduled Task */}
          {eventType === 'task_block' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Active Task
              </label>
              <select
                value={taskId || ''}
                onChange={(e) => handleTaskSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
              >
                <option value="">-- Choose task to schedule --</option>
                {unscheduledTasks.map((t) => (
                  <option key={t.task_id} value={t.task_id}>
                    [{t.task_code}] {t.title} ({t.priority})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Product Sync or Backend Refactor"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                End Time
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Google Meet / Video Link */}
          {eventType === 'meeting' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-blue-500" />
                  Video Meeting Link
                </label>
                <button
                  type="button"
                  onClick={generateGoogleMeetLink}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  + Generate Google Meet link
                </button>
              </div>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Location / Room
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Conference Room A or Remote"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Attendees Picker */}
          {eventType === 'meeting' && employees.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Invite Attendees
              </label>
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                {employees.map((emp) => {
                  const isChecked = selectedAttendees.includes(emp.emp_id);
                  return (
                    <label
                      key={emp.emp_id}
                      className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedAttendees((prev) =>
                            isChecked
                              ? prev.filter((id) => id !== emp.emp_id)
                              : [...prev, emp.emp_id]
                          );
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium text-slate-900">{emp.name}</span>
                      <span className="text-[11px] text-slate-400 truncate">({emp.email})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
              Description & Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agenda items, preparation notes, or context..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Schedule Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
