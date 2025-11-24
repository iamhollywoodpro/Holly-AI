'use client';

import { useSettings } from '@/lib/settings/settings-store';
import { useEffect } from 'react';

export default function ChatPreferencesPage() {
  const { settings, updateSettings, loadSettings, isSaving } = useSettings();

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Chat Preferences</h2>
        <p className="text-gray-400">Customize your chat experience with HOLLY</p>
      </div>

      {/* Voice Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Voice</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Auto-speak Responses</div>
            <div className="text-xs text-gray-400">Automatically read responses aloud</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                chat: { ...settings.chat, autoSpeak: !settings.chat.autoSpeak },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.chat.autoSpeak ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.chat.autoSpeak ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Voice Language
          </label>
          <select
            value={settings.chat.voiceLanguage}
            onChange={(e) =>
              updateSettings({
                chat: { ...settings.chat, voiceLanguage: e.target.value },
              })
            }
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="it-IT">Italian</option>
            <option value="pt-BR">Portuguese (Brazil)</option>
            <option value="ja-JP">Japanese</option>
            <option value="ko-KR">Korean</option>
            <option value="zh-CN">Chinese (Simplified)</option>
          </select>
        </div>
      </div>

      {/* Message Display */}
      <div className="space-y-4 pt-6 border-t border-gray-800">
        <h3 className="text-lg font-semibold text-white">Message Display</h3>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Message Grouping (minutes)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="30"
              value={settings.chat.messageGrouping}
              onChange={(e) =>
                updateSettings({
                  chat: { ...settings.chat, messageGrouping: parseInt(e.target.value) },
                })
              }
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-white w-12 text-right">{settings.chat.messageGrouping}m</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Group messages sent within this time</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Show Timestamps</div>
            <div className="text-xs text-gray-400">Display message send times</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                chat: { ...settings.chat, showTimestamps: !settings.chat.showTimestamps },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.chat.showTimestamps ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.chat.showTimestamps ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Enter to Send</div>
            <div className="text-xs text-gray-400">Use Enter key to send messages (Shift+Enter for new line)</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                chat: { ...settings.chat, enterToSend: !settings.chat.enterToSend },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.chat.enterToSend ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.chat.enterToSend ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Code Display */}
      <div className="space-y-4 pt-6 border-t border-gray-800">
        <h3 className="text-lg font-semibold text-white">Code Display</h3>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Code Highlighting Theme
          </label>
          <select
            value={settings.chat.codeTheme}
            onChange={(e) =>
              updateSettings({
                chat: { ...settings.chat, codeTheme: e.target.value as any },
              })
            }
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="github-dark">GitHub Dark</option>
            <option value="monokai">Monokai</option>
            <option value="nord">Nord</option>
            <option value="dracula">Dracula</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Markdown Style
          </label>
          <select
            value={settings.chat.markdownStyle}
            onChange={(e) =>
              updateSettings({
                chat: { ...settings.chat, markdownStyle: e.target.value as any },
              })
            }
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="default">Default</option>
            <option value="minimal">Minimal</option>
            <option value="rich">Rich</option>
          </select>
        </div>
      </div>

      {/* Save indicator */}
      {isSaving && (
        <div className="text-sm text-purple-400 flex items-center gap-2 pt-4">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
