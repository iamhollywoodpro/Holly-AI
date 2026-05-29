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
        <h2 className="text-2xl font-black text-[#F5F0E8] mb-2 uppercase tracking-widest">Linguistic Calibration Protocols</h2>
        <p className="text-[#8C8476] text-xs font-medium uppercase tracking-[0.15em]">Customize your neural resonance and exchange aesthetics</p>
      </div>

      {/* Voice Settings */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-[#2D8B5E] uppercase tracking-[0.2em]">Neural Synchronization</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-[#F5F0E8] uppercase tracking-widest">Vocal Synthesis</div>
            <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Automatically manifest system responses in physical audio</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                chat: { ...settings.chat, autoSpeak: !settings.chat.autoSpeak },
              })
            }
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-500 ${
              settings.chat.autoSpeak ? 'bg-[#2D8B5E]' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-[#F5F0E8] transition-transform duration-500 ${
                settings.chat.autoSpeak ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-[10px] font-black text-[#8C8476] uppercase tracking-widest mb-3">
            Dialect Calibration
          </label>
          <select
            value={settings.chat.voiceLanguage}
            onChange={(e) =>
              updateSettings({
                chat: { ...settings.chat, voiceLanguage: e.target.value },
              })
            }
            className="w-full px-5 py-3 bg-[#1E1B18] border border-white/5 rounded-2xl text-[#F5F0E8] text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-[#2D8B5E]/40 transition-all appearance-none cursor-pointer"
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
      <div className="space-y-6 pt-10 border-t border-white/5">
        <h3 className="text-[10px] font-black text-[#2D8B5E] uppercase tracking-[0.2em]">Chronological Presentation</h3>

        <div>
          <label className="block text-[10px] font-black text-[#8C8476] uppercase tracking-widest mb-3">
            Neural Batching Interval (Minutes)
          </label>
          <div className="flex items-center gap-6">
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
              className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#2D8B5E]"
            />
            <span className="text-[#F5F0E8] font-black text-[11px] w-12 text-right">{settings.chat.messageGrouping}M</span>
          </div>
          <p className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-2 font-medium">Consolidate exchanges materialized within this window</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-[#F5F0E8] uppercase tracking-widest">Temporal Markers</div>
            <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Append precise manifestation timestamps to each exchange</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                chat: { ...settings.chat, showTimestamps: !settings.chat.showTimestamps },
              })
            }
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-500 ${
              settings.chat.showTimestamps ? 'bg-[#2D8B5E]' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-[#F5F0E8] transition-transform duration-500 ${
                settings.chat.showTimestamps ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-[#F5F0E8] uppercase tracking-widest">Tactical Submission</div>
            <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Execute exchange via Return key (Shift+Return for line collapse)</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                chat: { ...settings.chat, enterToSend: !settings.chat.enterToSend },
              })
            }
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-500 ${
              settings.chat.enterToSend ? 'bg-[#2D8B5E]' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-[#F5F0E8] transition-transform duration-500 ${
                settings.chat.enterToSend ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Code Display */}
      <div className="space-y-6 pt-10 border-t border-white/5">
        <h3 className="text-[10px] font-black text-[#2D8B5E] uppercase tracking-[0.2em]">Architectural Presentation</h3>

        <div>
          <label className="block text-[10px] font-black text-[#8C8476] uppercase tracking-widest mb-3">
            Neural Highlighting Array
          </label>
          <select
            value={settings.chat.codeTheme}
            onChange={(e) =>
              updateSettings({
                chat: { ...settings.chat, codeTheme: e.target.value as any },
              })
            }
            className="w-full px-5 py-3 bg-[#1E1B18] border border-white/5 rounded-2xl text-[#F5F0E8] text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-[#2D8B5E]/40 transition-all appearance-none cursor-pointer"
          >
            <option value="github-dark">Sovereign Obsidian</option>
            <option value="monokai">Aurelian Gold</option>
            <option value="nord">Boreal Frost</option>
            <option value="dracula">Crimson Void</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black text-[#8C8476] uppercase tracking-widest mb-3">
            Structural Hierarchy
          </label>
          <select
            value={settings.chat.markdownStyle}
            onChange={(e) =>
              updateSettings({
                chat: { ...settings.chat, markdownStyle: e.target.value as any },
              })
            }
            className="w-full px-5 py-3 bg-[#1E1B18] border border-white/5 rounded-2xl text-[#F5F0E8] text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-[#2D8B5E]/40 transition-all appearance-none cursor-pointer"
          >
            <option value="default">Sovereign Default</option>
            <option value="minimal">Minimalist Arch</option>
            <option value="rich">Rich Editorial</option>
          </select>
        </div>
      </div>

      {/* Save indicator */}
      {isSaving && (
        <div className="text-[10px] text-[#2D8B5E] font-black uppercase tracking-widest flex items-center gap-3 pt-6">
          <div className="w-3.5 h-3.5 border-2 border-[#2D8B5E] border-t-transparent rounded-full animate-spin" />
          Synchronizing Linguistic Arrays...
        </div>
      )}
    </div>
  );
}
