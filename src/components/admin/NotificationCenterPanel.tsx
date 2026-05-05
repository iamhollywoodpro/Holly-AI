/**
 * NOTIFICATION CENTER PANEL - Phase 4E
 * View and manage user notifications across multiple channels
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  Trash2,
  Check,
  X,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  RefreshCw,
  Filter
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  channels: string[];
  deliveredVia: string[];
  actionUrl?: string;
  actionLabel?: string;
  sourceService?: string;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  critical: number;
  today: number;
}

export default function NotificationCenterPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    critical: 0,
    today: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [filterStatus, filterCategory]);

  const fetchNotifications = async () => {
    try {
      let url = '/api/admin/notifications?limit=50';
      if (filterStatus !== 'all') url += `&status=${filterStatus}`;
      if (filterCategory !== 'all') url += `&category=${filterCategory}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/notifications?action=stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          status: 'read'
        })
      });

      if (response.ok) {
        fetchNotifications();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_all_read'
        })
      });

      if (response.ok) {
        fetchNotifications();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          status: 'dismissed'
        })
      });

      if (response.ok) {
        fetchNotifications();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm('Delete this notification?')) return;

    try {
      const response = await fetch(`/api/admin/notifications?id=${notificationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchNotifications();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleClearRead = async () => {
    if (!confirm('Delete all read notifications?')) return;

    try {
      const response = await fetch('/api/admin/notifications?action=clear_read', {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchNotifications();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to clear read notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info': return <Info className="w-5 h-5 text-blue-600" />;
      default: return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'slack': return <MessageSquare className="w-4 h-4" />;
      case 'sms': return <Smartphone className="w-4 h-4" />;
      case 'push': return <Bell className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notification Center
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your notifications and alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleClearRead}
            variant="outline"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Read
          </Button>
          <Button
            onClick={handleMarkAllAsRead}
            variant="outline"
            size="sm"
          >
            <Check className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button
            onClick={() => { fetchNotifications(); fetchStats(); }}
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Bell className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
              <p className="text-2xl font-bold text-purple-600">{stats.unread}</p>
            </div>
            <Bell className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
              <p className="text-2xl font-bold text-green-600">{stats.today}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600" />
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="system">System</option>
            <option value="deployment">Deployment</option>
            <option value="code_review">Code Review</option>
            <option value="integration">Integration</option>
          </select>
        </div>
      </Card>

      {/* Notifications List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Notifications
        </h3>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No notifications found
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.status === 'unread'
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>
                        <Badge className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                        {notification.status === 'unread' && (
                          <Badge className="bg-purple-100 text-purple-800">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                        <span>{formatTimeAgo(notification.createdAt)}</span>
                        <span>•</span>
                        <span className="capitalize">{notification.category}</span>
                        {notification.sourceService && (
                          <>
                            <span>•</span>
                            <span>{notification.sourceService}</span>
                          </>
                        )}
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {notification.deliveredVia.map((channel, i) => (
                            <span key={i}>{getChannelIcon(channel)}</span>
                          ))}
                        </div>
                      </div>
                      {notification.actionUrl && (
                        <a
                          href={notification.actionUrl}
                          className="inline-block mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          {notification.actionLabel || 'View Details'} →
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    {notification.status === 'unread' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification.id)}
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismiss(notification.id)}
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(notification.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
