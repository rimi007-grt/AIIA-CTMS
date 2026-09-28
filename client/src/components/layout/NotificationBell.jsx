import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, Trash2, AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

// ── Priority styling helpers ──────────────────────────────────
const PRIORITY_CONFIG = {
  critical: {
    dot: 'bg-red-500',
    badge: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    label: 'URGENT',
    border: 'border-l-red-500'
  },
  warning: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    label: 'WARNING',
    border: 'border-l-amber-400'
  },
  info: {
    dot: 'bg-blue-400',
    badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    icon: Info,
    iconColor: 'text-blue-400',
    label: 'INFO',
    border: 'border-l-blue-400'
  }
};

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationItem({ notif, onRead, onDelete }) {
  const config = PRIORITY_CONFIG[notif.priority] || PRIORITY_CONFIG.info;
  const Icon = config.icon;
  const isUnread = !notif.is_read;

  return (
    <div
      className={`relative flex items-start gap-3 px-4 py-3 border-l-2 transition-all ${config.border}
        ${isUnread
          ? 'bg-white dark:bg-slate-800/70'
          : 'bg-slate-50/70 dark:bg-slate-900/40 opacity-75'
        }
        hover:bg-slate-50 dark:hover:bg-slate-800/80 group`}
    >
      {/* Priority icon */}
      <div className="mt-0.5 shrink-0">
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] leading-relaxed break-words ${isUnread ? 'text-slate-800 dark:text-slate-100 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
          {notif.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${config.badge}`}>
            {config.label}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {timeAgo(notif.created_at)}
          </span>
          {isUnread && (
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
          )}
        </div>
      </div>

      {/* Actions (appear on hover) */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isUnread && (
          <button
            onClick={() => onRead(notif.id)}
            title="Mark as read"
            className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
          >
            <CheckCheck className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(notif.id)}
          title="Delete"
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-400 dark:text-red-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const displayed = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const criticalCount = notifications.filter(n => n.priority === 'critical' && !n.is_read).length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative p-2 rounded-lg transition-all ${
          open
            ? 'bg-emerald-800 text-white'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white'
        }`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className={`w-5 h-5 ${criticalCount > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1 ${
            criticalCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
          }`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                Notifications
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                {criticalCount > 0 && (
                  <span className="ml-2 text-red-500 font-semibold">{criticalCount} urgent</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchNotifications}
                title="Refresh"
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0">
            {['all', 'unread'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 text-[11px] font-semibold capitalize transition-colors ${
                  filter === f
                    ? 'text-emerald-800 dark:text-emerald-400 border-b-2 border-emerald-700 dark:border-emerald-500'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin" />
                <p className="text-xs text-slate-400">Loading notifications...</p>
              </div>
            ) : displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  You're all caught up! 🎉
                </p>
              </div>
            ) : (
              displayed.map(notif => (
                <NotificationItem
                  key={notif.id}
                  notif={notif}
                  onRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {notifications.length} total notification{notifications.length !== 1 ? 's' : ''}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
                >
                  Mark all as read
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
