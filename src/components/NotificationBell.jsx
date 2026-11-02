import React, { useState, useEffect, useRef } from 'react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../utils/notifications';
import { Icon } from './ui';

export const NotificationBell = ({ currentUser, onSelectEvent, events = [] }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef(null);

  const loadNotifications = () => {
    if (!currentUser?.email) {
      setNotifications([]);
      return;
    }
    const notifs = getNotifications(currentUser.email);
    setNotifications(notifs);
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('assemble_notifications_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('assemble_notifications_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [currentUser?.email]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointer = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notif) => {
    markNotificationAsRead(notif.id);
    setIsOpen(false);
    if (onSelectEvent) {
      const targetEvent = events.find((e) => e.id === notif.eventId);
      if (targetEvent) {
        onSelectEvent(targetEvent);
      }
    }
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    markAllNotificationsAsRead(currentUser?.email);
  };

  if (!currentUser) return null;

  return (
    <div ref={bellRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-full border border-fg/12 bg-fg/[0.06] text-fg/85 hover:bg-fg/10 hover:text-fg flex items-center justify-center transition-colors cursor-pointer"
        title="View event updates & notifications"
      >
        <Icon name="notifications" className="!text-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl p-3 z-50 animate-scaleUp text-left glass-strong text-fg shadow-xl border border-fg/10"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-fg/10">
            <span className="font-geist text-xs font-bold uppercase tracking-wider text-fg/70">
              Event Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-[color:var(--accent-ink)] hover:underline font-medium cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto no-scrollbar space-y-2">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-fg/50 space-y-2">
                <Icon name="notifications_off" className="!text-[28px] opacity-40 mx-auto" />
                <p className="text-xs">No updates yet</p>
                <p className="text-[11px] text-fg/40 max-w-[220px] mx-auto">
                  When organizers finalize venues, speakers, or schedules for your events, updates appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 rounded-xl transition-all cursor-pointer border ${
                    n.read
                      ? 'bg-fg/[0.02] border-transparent hover:bg-fg/[0.05]'
                      : 'bg-[color:var(--accent-ink)]/10 border-[color:var(--accent-ink)]/20 hover:bg-[color:var(--accent-ink)]/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-geist text-xs font-bold text-fg flex items-center gap-1.5 line-clamp-1">
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                      {n.eventTitle}
                    </span>
                    <span className="text-[10px] text-fg/40 shrink-0 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <p className="text-xs text-fg/80 mt-1 leading-snug">{n.summary}</p>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {n.details?.venue && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-fg/[0.06] text-fg/70 flex items-center gap-1">
                        <Icon name="apartment" className="!text-[12px]" />
                        {n.details.venue}
                      </span>
                    )}
                    {n.details?.speakers && n.details.speakers.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-fg/[0.06] text-fg/70 flex items-center gap-1">
                        <Icon name="record_voice_over" className="!text-[12px]" />
                        {n.details.speakers.length} Speaker{n.details.speakers.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {n.details?.scheduleCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-fg/[0.06] text-fg/70 flex items-center gap-1">
                        <Icon name="calendar_month" className="!text-[12px]" />
                        {n.details.scheduleCount} Sessions
                      </span>
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

