'use client';

import { useSettings } from '@/lib/settings/settings-store';
import { useEffect } from 'react';

export default function NotificationsPage() {
  const { settings, updateSettings, loadSettings, isSaving } = useSettings();

  useEffect(() => {
    loadSettings();
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Notifications</h2>
        <p className="text-gray-400">Manage alerts and notification preferences</p>
      </div>

      {/* Desktop Notifications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Desktop Notifications</div>
            <div className="text-xs text-gray-400">Show system notifications for important events</div>
          </div>
          <button
            onClick={async () => {
              await requestNotificationPermission();
              updateSettings({
                notifications: { ...settings.notifications, desktop: !settings.notifications.desktop },
              });
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.notifications.desktop ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.notifications.desktop ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Sound Effects</div>
            <div className="text-xs text-gray-400">Play sounds for notifications and actions</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                notifications: { ...settings.notifications, sounds: !settings.notifications.sounds },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.notifications.sounds ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.notifications.sounds ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Event Types */}
      <div className="space-y-4 pt-6 border-t border-gray-800">
        <h3 className="text-lg font-semibold text-white">Notify me about:</h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Deployment Status</div>
            <div className="text-xs text-gray-400">Vercel deployment started, succeeded, or failed</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                notifications: {
                  ...settings.notifications,
                  deploymentAlerts: !settings.notifications.deploymentAlerts,
                },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.notifications.deploymentAlerts ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.notifications.deploymentAlerts ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">GitHub Events</div>
            <div className="text-xs text-gray-400">Pull requests, issues, and commits</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                notifications: {
                  ...settings.notifications,
                  githubWebhooks: !settings.notifications.githubWebhooks,
                },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.notifications.githubWebhooks ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.notifications.githubWebhooks ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Build Failures</div>
            <div className="text-xs text-gray-400">CI/CD pipeline failures and errors</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                notifications: {
                  ...settings.notifications,
                  buildFailures: !settings.notifications.buildFailures,
                },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.notifications.buildFailures ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.notifications.buildFailures ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Browser Permissions Check */}
      {typeof window !== 'undefined' && 'Notification' in window && (
        <div className={`rounded-lg p-4 border ${
          Notification.permission === 'granted'
            ? 'bg-green-500/10 border-green-500/30'
            : Notification.permission === 'denied'
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {Notification.permission === 'granted' ? '✅' : 
               Notification.permission === 'denied' ? '❌' : '⚠️'}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white mb-1">
                Browser Notification Permission: {Notification.permission}
              </div>
              <div className="text-xs text-gray-400">
                {Notification.permission === 'granted' &&
                  'Desktop notifications are enabled in your browser'}
                {Notification.permission === 'denied' &&
                  'You have blocked notifications. Enable them in browser settings.'}
                {Notification.permission === 'default' &&
                  'Click the toggle above to request notification permission'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save indicator */}
      {isSaving && (
        <div className="text-sm text-purple-400 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
