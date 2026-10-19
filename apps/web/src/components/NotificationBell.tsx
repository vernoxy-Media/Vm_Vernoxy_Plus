import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Inbox } from 'lucide-react';
import {
  useNotificationsControllerGetNotifications,
  useNotificationsControllerGetUnreadCount,
  useNotificationsControllerMarkRead,
  useNotificationsControllerMarkAllRead,
  type NotificationResponseDto,
  type UnreadCountResponseDto,
} from '@vernoxy-pulse/api-client';

function timeAgo(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: countData, refetch: refetchCount } = useNotificationsControllerGetUnreadCount({
    query: { refetchInterval: 15_000 },
  });
  const unreadCount =
    (countData?.data as UnreadCountResponseDto | undefined)?.unread_count ??
    (countData as unknown as UnreadCountResponseDto | undefined)?.unread_count ??
    0;

  const { data: notificationsData, refetch: refetchList } = useNotificationsControllerGetNotifications(
    { limit: 10 },
    { query: { enabled: isOpen } },
  );
  const notifications: NotificationResponseDto[] =
    (notificationsData?.data as NotificationResponseDto[] | undefined) ??
    (Array.isArray(notificationsData) ? (notificationsData as unknown as NotificationResponseDto[]) : []);

  const markReadMutation = useNotificationsControllerMarkRead();
  const markAllMutation = useNotificationsControllerMarkAllRead();

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleMarkOne = async (id: number) => {
    await markReadMutation.mutateAsync({ id });
    refetchCount();
    refetchList();
  };

  const handleMarkAll = async () => {
    await markAllMutation.mutateAsync();
    refetchCount();
    refetchList();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200/80 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notification_id}
                  className={`p-3.5 transition-colors ${n.read_at ? 'bg-white opacity-70' : 'bg-blue-50/20'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-xs text-slate-900">{n.title}</div>
                      {n.body && <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</p>}
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {!n.read_at && (
                      <button
                        type="button"
                        onClick={() => handleMarkOne(n.notification_id)}
                        title="Mark as read"
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
