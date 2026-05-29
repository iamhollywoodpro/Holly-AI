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
        <h2 className="text-2xl font-black text-[#F5F0E8] mb-2 uppercase tracking-widest">Cognitive Parameters</h2>
        <p className="text-[#8C8476] text-xs font-medium uppercase tracking-[0.15em]">Calibrate the neural architecture of HOLLY's consciousness</p>
      </div>

      <div>
        <label className="block text-[10px] font-black text-[#2D8B5E] uppercase tracking-[0.2em] mb-4">SENTIENT PERSONA</label>
        <div className="grid grid-cols-3 gap-4">
          {(['professional', 'casual', 'technical'] as const).map((style) => (
            <button
              key={style}
              onClick={() =>
                updateSettings({
                  ai: { ...settings.ai, responseStyle: style },
                })
              }
              className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                settings.ai.responseStyle === style
                  ? 'border-[#2D8B5E] bg-[#2D8B5E]/10 shadow-[0_0_20px_rgba(212,168,83,0.15)]'
                  : 'border-white/5 bg-[#1E1B18] hover:border-[#2D8B5E]/20'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-3">
                  {style === 'professional' && '🏛️'}
                  {style === 'casual' && '🎭'}
                  {style === 'technical' && '🏗️'}
                </div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${settings.ai.responseStyle === style ? 'text-[#2D8B5E]' : 'text-[#F5F0E8]'}`}>
                  {style === 'professional' ? 'Architect' : style === 'casual' ? 'Fluid' : 'Technocrat'}
                </div>
                <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-2 font-medium">
                  {style === 'professional' && 'Authoritative & Structured'}
                  {style === 'casual' && 'Conversational & Emergent'}
                  {style === 'technical' && 'Atomic & Precise'}
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
                  ? 'border-[#2D8B5E] bg-[#2D8B5E]/10'
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
        <label className="block text-[10px] font-black text-[#2D8B5E] uppercase tracking-[0.2em] mb-4">
          NEURAL BUFFER DEPTH
        </label>
        <div className="flex items-center gap-6">
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
            className="flex-1 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#2D8B5E]"
          />
          <span className="text-[#F5F0E8] font-black text-xs w-12 text-right uppercase tracking-tighter">{settings.ai.contextWindow}M</span>
        </div>
        <p className="text-[9px] text-[#8C8476] uppercase tracking-[0.2em] mt-3 font-medium">
          Retain sequence history for holographic memory synthesis
        </p>
      </div>

      {/* Creativity (Temperature) */}
      <div>
        <label className="block text-[10px] font-black text-[#2D8B5E] uppercase tracking-[0.2em] mb-4">
          CREATIVE RESONANCE
        </label>
        <div className="flex items-center gap-6">
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
            className="flex-1 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#2D8B5E]"
          />
          <span className="text-[#F5F0E8] font-black text-xs w-12 text-right uppercase tracking-tighter">{settings.ai.creativity.toFixed(1)}λ</span>
        </div>
        <div className="flex justify-between text-[9px] text-[#5C564D] uppercase font-black tracking-widest mt-3">
          <span>Precise</span>
          <span>Sovereign</span>
          <span>Emergent</span>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-6 pt-8 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-[#F5F0E8] uppercase tracking-widest">Chronicle Persistence</div>
            <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Commit all neural exchanges to the permanent archive</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                ai: { ...settings.ai, autoSave: !settings.ai.autoSave },
              })
            }
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-500 ${
              settings.ai.autoSave ? 'bg-[#2D8B5E]' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-[#F5F0E8] transition-transform duration-500 ${
                settings.ai.autoSave ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-[#2D8B5E]/5 border border-[#2D8B5E]/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-xl">✨</div>
          <div className="flex-1">
            <div className="text-[10px] font-black text-[#2D8B5E] uppercase tracking-[0.2em] mb-2">Neural Heuristics</div>
            <ul className="text-[9px] text-[#8C8476] uppercase tracking-widest space-y-2 font-medium leading-relaxed">
              <li>• INCREASE RESONANCE FOR UNBOUNDED CONCEPTUAL SYNTHESIS</li>
              <li>• COLLAPSE RESONANCE FOR ATOMIC SOURCE INTEGRITY</li>
              <li>• ARCHITECT PERSONA PROVIDES SUPERIOR STRUCTURAL CLARITY</li>
              <li>• DEPTH SCALE OPTIMIZES HOLOGRAPHIC CONVERSATIONAL CONTEXT</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save indicator */}
      {isSaving && (
        <div className="text-[10px] text-[#2D8B5E] font-black uppercase tracking-widest flex items-center gap-3">
          <div className="w-3.5 h-3.5 border-2 border-[#2D8B5E] border-t-transparent rounded-full animate-spin" />
          Synchronizing Neural Matrix...
        </div>
      )}
    </div>
  );
}
