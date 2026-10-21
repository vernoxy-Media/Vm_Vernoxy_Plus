import React, { useState } from 'react';
import {
  X,
  Video,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  MapPin,
} from 'lucide-react';
import type { CalendarEvent } from '../types';
import { useAuth } from '../../../context/AuthContext';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (eventId: number) => Promise<void>;
  onRsvp: (eventId: number, status: 'accepted' | 'declined' | 'tentative') => Promise<void>;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onDelete,
  onRsvp,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  if (!isOpen || !event) return null;

  const currentEmpId = user?.emp_id;
  const isOrganizer = currentEmpId === event.organizer_id;
  const isAdmin = Boolean(user?.access?.can_manage_organization);
  const canDelete = isOrganizer || isAdmin;

  const currentAttendee = event.attendees?.find((a) => a.employee_id === currentEmpId);

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);

  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = `${startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })} – ${endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;

  const copyMeetLink = () => {
    if (event.meeting_link) {
      navigator.clipboard.writeText(event.meeting_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to remove this event from the calendar?')) {
      try {
        setIsDeleting(true);
        await onDelete(event.event_id);
        onClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleRsvpClick = async (status: 'accepted' | 'declined' | 'tentative') => {
    try {
      setRsvpLoading(true);
      await onRsvp(event.event_id, status);
    } finally {
      setRsvpLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div
          className={`px-6 py-5 flex items-start justify-between ${
            event.event_type === 'task_block'
              ? 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-b border-purple-100'
              : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-100'
          }`}
        >
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  event.event_type === 'task_block'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {event.event_type === 'task_block' ? 'Task Block' : 'Meeting'}
              </span>
              {event.task_code && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {event.task_code}
                </span>
              )}
              {event.task_stage && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                  {event.task_stage.replace('_', ' ')}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{event.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Date & Time */}
          <div className="flex items-start gap-3 text-slate-700">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-500 shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">{formattedDate}</p>
              <p className="text-xs text-slate-500">{formattedTime}</p>
            </div>
          </div>

          {/* Video Meeting Button */}
          {event.meeting_link && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-blue-900">Google Meet Video Call</p>
                  <p className="text-[11px] text-blue-600 truncate">{event.meeting_link}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={copyMeetLink}
                  title="Copy link"
                  className="p-2 rounded-xl bg-white text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={event.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span>Join</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-3 text-slate-700">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-500 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium text-slate-800">{event.location}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap">
              {event.description}
            </div>
          )}

          {/* Organizer */}
          <div className="text-xs text-slate-500">
            <span>Organized by </span>
            <span className="font-bold text-slate-800">{event.organizer_name}</span>
          </div>

          {/* Attendees & RSVP statuses */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Attendees ({event.attendees.length})
              </p>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {event.attendees.map((a) => (
                  <div key={a.attendee_id} className="flex items-center justify-between p-2.5 bg-white text-xs">
                    <div>
                      <p className="font-medium text-slate-800">{a.name}</p>
                      <p className="text-[11px] text-slate-400">{a.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {a.response_status === 'accepted' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Accepted
                        </span>
                      )}
                      {a.response_status === 'declined' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Declined
                        </span>
                      )}
                      {a.response_status === 'tentative' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <HelpCircle className="w-3 h-3" /> Maybe
                        </span>
                      )}
                      {a.response_status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Awaiting
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current User RSVP buttons (if invited) */}
          {currentAttendee && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs font-bold text-slate-700">Going?</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={rsvpLoading}
                  onClick={() => handleRsvpClick('accepted')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    currentAttendee.response_status === 'accepted'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Yes
                </button>
                <button
                  type="button"
                  disabled={rsvpLoading}
                  onClick={() => handleRsvpClick('tentative')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    currentAttendee.response_status === 'tentative'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Maybe
                </button>
                <button
                  type="button"
                  disabled={rsvpLoading}
                  onClick={() => handleRsvpClick('declined')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    currentAttendee.response_status === 'declined'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  No
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div>
            {canDelete && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Deleting...' : 'Delete Event'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
