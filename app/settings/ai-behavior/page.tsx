'use client';

import { useSettings } from '@/lib/settings/settings-store';
import { useEffect } from 'react';

export default function AIBehaviorPage() {
  const { settings, updateSettings, loadSettings, isSaving } = useSettings();

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">AI Behavior</h2>
        <p className="text-gray-400">Configure how HOLLY thinks and responds</p>
      </div>

      {/* Response Style */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Response Style</label>
        <div className="grid grid-cols-3 gap-3">
          {(['professional', 'casual', 'technical'] as const).map((style) => (
            <button
              key={style}
              onClick={() =>
                updateSettings({
                  ai: { ...settings.ai, responseStyle: style },
                })
              }
              className={`p-4 rounded-lg border-2 transition-all ${
                settings.ai.responseStyle === style
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {style === 'professional' && '💼'}
                  {style === 'casual' && '😊'}
                  {style === 'technical' && '🔧'}
                </div>
                <div className="text-sm text-white capitalize">{style}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {style === 'professional' && 'Formal and structured'}
                  {style === 'casual' && 'Friendly and conversational'}
                  {style === 'technical' && 'Detailed and precise'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Code Comments */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Code Comments Verbosity</label>
        <div className="grid grid-cols-3 gap-3">
          {(['minimal', 'standard', 'detailed'] as const).map((level) => (
            <button
              key={level}
              onClick={() =>
                updateSettings({
                  ai: { ...settings.ai, codeComments: level },
                })
              }
              className={`p-4 rounded-lg border-2 transition-all ${
                settings.ai.codeComments === level
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-center">
                <div className="text-sm text-white capitalize">{level}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {level === 'minimal' && 'Only essential comments'}
                  {level === 'standard' && 'Balanced documentation'}
                  {level === 'detailed' && 'Comprehensive explanations'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Context Window */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Context Window (messages)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={settings.ai.contextWindow}
            onChange={(e) =>
              updateSettings({
                ai: { ...settings.ai, contextWindow: parseInt(e.target.value) },
              })
            }
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white w-12 text-right">{settings.ai.contextWindow}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          How many previous messages HOLLY remembers in the conversation
        </p>
      </div>

      {/* Creativity (Temperature) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Creativity Level
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.ai.creativity}
            onChange={(e) =>
              updateSettings({
                ai: { ...settings.ai, creativity: parseFloat(e.target.value) },
              })
            }
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white w-12 text-right">{settings.ai.creativity.toFixed(1)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Precise</span>
          <span>Balanced</span>
          <span>Creative</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Lower values = more predictable, Higher values = more creative and varied
        </p>
      </div>

      {/* Toggles */}
      <div className="space-y-4 pt-6 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Auto-save Conversations</div>
            <div className="text-xs text-gray-400">Automatically save all chat messages</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                ai: { ...settings.ai, autoSave: !settings.ai.autoSave },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.ai.autoSave ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.ai.autoSave ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-purple-300 mb-1">AI Configuration Tips</div>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Higher creativity works better for brainstorming</li>
              <li>• Lower creativity is better for code generation</li>
              <li>• Technical style provides more detailed explanations</li>
              <li>• Larger context window = better conversation understanding</li>
            </ul>
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
