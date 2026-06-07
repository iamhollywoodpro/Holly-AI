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
        <h2 className="text-2xl font-black text-[#F5F0E8] mb-2 uppercase tracking-widest">Sensory Alert Protocols</h2>
        <p className="text-[#8C8476] text-xs font-medium uppercase tracking-[0.15em]">Configure neural pulses and architectural broadcast states</p>
      </div>

      {/* Desktop Notifications */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-[#F5F0E8] uppercase tracking-widest">Architectural Broadcasts</div>
            <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Project system alerts directly to the sovereign viewport</div>
          </div>
          <button
            onClick={async () => {
              await requestNotificationPermission();
              updateSettings({
                notifications: { ...settings.notifications, desktop: !settings.notifications.desktop },
              });
            }}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-500 ${
              settings.notifications.desktop ? 'bg-[#66CCCC]' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-[#F5F0E8] transition-transform duration-500 ${
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
              settings.notifications.sounds ? 'bg-[#66CCCC]' : 'bg-[#1E1B18]'
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
              settings.notifications.deploymentAlerts ? 'bg-[#66CCCC]' : 'bg-[#1E1B18]'
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
              settings.notifications.githubWebhooks ? 'bg-[#66CCCC]' : 'bg-[#1E1B18]'
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
              settings.notifications.buildFailures ? 'bg-[#66CCCC]' : 'bg-[#1E1B18]'
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
        <div className={`rounded-2xl p-6 border transition-all duration-500 ${
          Notification.permission === 'granted'
            ? 'bg-[#66CCCC]/5 border-[#66CCCC]/20 shadow-[0_0_20px_rgba(102,204,204,0.05)]'
            : Notification.permission === 'denied'
            ? 'bg-[#C7B8EA]/5 border-[#C7B8EA]/20'
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center gap-4">
            <div className="text-xl">
              {Notification.permission === 'granted' ? '✨' : 
               Notification.permission === 'denied' ? '🚫' : '⚠️'}
            </div>
            <div className="flex-1">
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${
                Notification.permission === 'granted' ? 'text-[#66CCCC]' :
                Notification.permission === 'denied' ? 'text-[#C7B8EA]' : 'text-[#8C8476]'
              }`}>
                Grid Resonance: {Notification.permission.toUpperCase()}
              </div>
              <div className="text-[9px] text-[#8C8476] uppercase tracking-widest font-medium leading-relaxed">
                {Notification.permission === 'granted' &&
                  'The sovereign viewport is synchronized for real-time broadcasts.'}
                {Notification.permission === 'denied' &&
                  'Sensory alerts are severed. Restore via browser architectural settings.'}
                {Notification.permission === 'default' &&
                  'Requesting synchronization for real-time architectural events.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save indicator */}
      {isSaving && (
        <div className="text-[10px] text-[#66CCCC] font-black uppercase tracking-widest flex items-center gap-3">
          <div className="w-3.5 h-3.5 border-2 border-[#66CCCC] border-t-transparent rounded-full animate-spin" />
          Calibrating Sensory Array...
        </div>
      )}
    </div>
  );
}
