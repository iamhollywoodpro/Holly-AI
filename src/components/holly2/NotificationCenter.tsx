'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check, Info, AlertCircle, CheckCircle, Music, Code, Sparkles } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'success',
      title: 'Music Generated',
      message: 'Your lo-fi beat "Chill Vibes" is ready!',
      timestamp: new Date(Date.now() - 5 * 60000),
      read: false,
      action: {
        label: 'Listen',
        onClick: () => window.location.href = '/music-studio',
      },
    },
    {
      id: '2',
      type: 'info',
      title: 'New Feature',
      message: 'Try the new Code Workshop to view HOLLY\'s source code',
      timestamp: new Date(Date.now() - 2 * 3600000),
      read: false,
      action: {
        label: 'Explore',
        onClick: () => window.location.href = '/code-workshop',
      },
    },
    {
      id: '3',
      type: 'success',
      title: 'Export Complete',
      message: 'Your conversation has been exported successfully',
      timestamp: new Date(Date.now() - 24 * 3600000),
      read: true,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertCircle;
      case 'error': return AlertCircle;
      default: return Info;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'success': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'error': return '#EF4444';
      default: return cyberpunkTheme.colors.primary.cyan;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: cyberpunkTheme.colors.text.secondary }}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: cyberpunkTheme.colors.primary.cyan,
              color: '#FFFFFF',
            }}
          >
            {unreadCount}
          </div>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            className="absolute right-0 top-12 w-96 max-h-[600px] rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.secondary,
              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            }}
          >
            {/* Header */}
            <div 
              className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: cyberpunkTheme.colors.border.primary }}
            >
              <h3 
                className="text-lg font-bold"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm hover:opacity-80 transition-opacity"
                  style={{ color: cyberpunkTheme.colors.primary.cyan }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[500px]">
              {notifications.length === 0 ? (
                <div 
                  className="p-8 text-center"
                  style={{ color: cyberpunkTheme.colors.text.tertiary }}
                >
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map(notification => {
                  const Icon = getIcon(notification.type);
                  const color = getColor(notification.type);

                  return (
                    <div
                      key={notification.id}
                      className="p-4 border-b hover:bg-white/5 transition-colors"
                      style={{
                        borderColor: cyberpunkTheme.colors.border.primary,
                        backgroundColor: notification.read ? 'transparent' : `${color}05`,
                      }}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div 
                          className="p-2 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <Icon 
                            className="w-5 h-5"
                            style={{ color }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 
                              className="font-semibold"
                              style={{ color: cyberpunkTheme.colors.text.primary }}
                            >
                              {notification.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                              style={{ color: cyberpunkTheme.colors.text.tertiary }}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <p 
                            className="text-sm mb-2"
                            style={{ color: cyberpunkTheme.colors.text.secondary }}
                          >
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <span 
                              className="text-xs"
                              style={{ color: cyberpunkTheme.colors.text.tertiary }}
                            >
                              {formatTime(notification.timestamp)}
                            </span>

                            {notification.action && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  notification.action!.onClick();
                                  setIsOpen(false);
                                }}
                                className="text-sm px-3 py-1 rounded hover:opacity-80 transition-opacity"
                                style={{ color }}
                              >
                                {notification.action.label}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
