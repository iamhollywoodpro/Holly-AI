'use client';

import { useSettings } from '@/lib/settings/settings-store';
import { useEffect, useState } from 'react';
import { ArrowDownTrayIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

export default function DeveloperPage() {
  const { settings, updateSettings, loadSettings, isSaving, exportSettings, resetToDefaults } =
    useSettings();
  const [exportedJson, setExportedJson] = useState('');
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const handleExport = () => {
    const json = exportSettings();
    setExportedJson(json);
    setShowExport(true);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportedJson);
  };

  const handleDownload = () => {
    const blob = new Blob([exportedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holly-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Developer Tools</h2>
        <p className="text-gray-400">Advanced settings and debugging tools</p>
      </div>

      {/* Debug Toggles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Debug Mode</div>
            <div className="text-xs text-gray-400">Show detailed error messages and logs</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                developer: { ...settings.developer, debugMode: !settings.developer.debugMode },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.developer.debugMode ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.developer.debugMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Show API Call Logs</div>
            <div className="text-xs text-gray-400">Log all API requests and responses</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                developer: { ...settings.developer, showApiLogs: !settings.developer.showApiLogs },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.developer.showApiLogs ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.developer.showApiLogs ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Performance Metrics</div>
            <div className="text-xs text-gray-400">Display response times and performance data</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                developer: {
                  ...settings.developer,
                  performanceMetrics: !settings.developer.performanceMetrics,
                },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.developer.performanceMetrics ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.developer.performanceMetrics ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="space-y-4 pt-6 border-t border-gray-800">
        <h3 className="text-lg font-semibold text-white">Data Management</h3>

        <button
          onClick={handleExport}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ArrowDownTrayIcon className="w-5 h-5 text-purple-400" />
            <div className="text-left">
              <div className="text-sm font-medium text-white">Export Settings</div>
              <div className="text-xs text-gray-400">Download your settings as JSON</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            if (confirm('Reset all settings to defaults? This cannot be undone.')) {
              resetToDefaults();
            }
          }}
          className="w-full flex items-center justify-between px-4 py-3 bg-red-900/20 hover:bg-red-900/30 rounded-lg border border-red-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <div className="text-left">
              <div className="text-sm font-medium text-red-300">Reset to Defaults</div>
              <div className="text-xs text-red-400/70">Restore factory settings</div>
            </div>
          </div>
        </button>
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <h3 className="text-xl font-bold text-white mb-4">Exported Settings</h3>
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 mb-4 overflow-auto max-h-96">
              <pre className="text-xs text-gray-300 font-mono">{exportedJson}</pre>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopyToClipboard}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-medium transition-colors"
              >
                <DocumentDuplicateIcon className="w-5 h-5" />
                Copy to Clipboard
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Download JSON
              </button>
              <button
                onClick={() => setShowExport(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Box */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-yellow-300 mb-1">Developer Mode Warning</div>
            <p className="text-xs text-gray-400">
              These settings are for advanced users. Enabling debug features may impact performance
              and expose sensitive information in logs.
            </p>
          </div>
        </div>
      </div>

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
