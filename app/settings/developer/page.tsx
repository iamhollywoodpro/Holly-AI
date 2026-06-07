'use client';

import { useSettings } from '@/lib/settings/settings-store';
import { useEffect, useState, useCallback } from 'react';
import { ArrowDownTrayIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

// ── AI Router status types ────────────────────────────────────────────────────

interface ProviderInfo {
  id:          string;
  name:        string;
  configured:  boolean;
  models:      string[];
  tasks:       string[];
  freeQuota:   string;
  signupUrl:   string;
}

interface RouterStatus {
  phase:             string;
  status:            'healthy' | 'partial' | 'degraded';
  providers_total:   number;
  providers_active:  number;
  providers:         ProviderInfo[];
  routing_matrix:    Record<string, string[]>;
  note:              string;
}

// ─── Provider icons ───────────────────────────────────────────────────────────

const PROVIDER_ICONS: Record<string, string> = {
  groq:       '⚡',
  cf_workers: '☁️',
  nvidia_nim: '🟩',
  openrouter: '🔀',
  ollama:     '🖥️',
};

const TASK_EMOJIS: Record<string, string> = {
  speed: '⚡', coding: '💻', reasoning: '🧠',
  long_context: '📄', vision: '👁️', creative: '✨',
  agent: '🤖', local: '🔒',
};

// ── Model Discovery Panel ────────────────────────────────────────────────────
function ModelDiscoveryPanel() {
  const [status, setStatus]   = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [report, setReport]   = useState<any>(null);
  const [registry, setRegistry] = useState<any>(null);
  const [showCandidates, setShowCandidates] = useState(false);

  const runDiscovery = async () => {
    setStatus('running');
    try {
      const res = await fetch('/api/admin/model-update', { method: 'POST' });
      const data = await res.json();
      if (res.ok) { setReport(data.report); setStatus('done'); }
      else setStatus('error');
    } catch { setStatus('error'); }
  };

  const loadRegistry = async () => {
    try {
      const res = await fetch('/api/admin/model-update');
      if (res.ok) setRegistry(await res.json());
    } catch {}
  };

  return (
    <div className="space-y-4 pt-6 border-t border-gray-800">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-black text-[#F5F0E8] flex items-center gap-3 uppercase tracking-widest">
            🔍 Heuristic Discovery
            <span className="text-[9px] font-black px-2.5 py-0.5 bg-[#66CCCC]/10 text-[#66CCCC] rounded-full border border-[#66CCCC]/20 uppercase tracking-tighter">
              Auto · 0500 UTC
            </span>
          </h3>
          <p className="text-[9px] text-[#8C8476] uppercase tracking-[0.2em] mt-1 font-medium">
            Calibrate neural nodes daily for emergent open-source intelligence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadRegistry}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-[#1E1B18] hover:bg-[#24211D] border border-white/5 rounded-xl text-[#8C8476] transition-colors"
          >
            View Registry
          </button>
          <button
            onClick={runDiscovery}
            disabled={status === 'running'}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-[#66CCCC] hover:bg-[#66CCCC]/90 disabled:opacity-30 rounded-xl text-[#0A0908] transition-colors flex items-center gap-2"
          >
            {status === 'running' ? (
              <><span className="inline-block w-3 h-3 border-2 border-[#0A0908] border-t-transparent rounded-full animate-spin" /> SCANNING...</>
            ) : '▶ INITIALIZE'}
          </button>
        </div>
      </div>

      {/* Rules */}
      <div className="text-xs text-gray-500 bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 space-y-1">
        <p className="font-medium text-gray-400">Upgrade Rules (enforced in code)</p>
        <p>✅ Free models only — MIT, Apache-2.0, Llama-3/4, CC-BY licences</p>
        <p>✅ Better benchmark scores required before promotion</p>
        <p>✅ Suno V5.5 remains the only paid API (music generation)</p>
        <p>🚫 No GPT, no Claude, no Gemini — ever</p>
      </div>

      {/* Discovery result */}
      {report && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3 text-xs">
          <p className="text-gray-400">Run: {new Date(report.checkedAt).toLocaleString()}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-[#66CCCC]/10 border border-[#66CCCC]/20 rounded-lg p-2">
              <p className="text-2xl font-bold text-[#66CCCC]">{report.promoted?.length ?? 0}</p>
              <p className="text-gray-400">Promoted</p>
            </div>
            <div className="text-center bg-gray-800 border border-gray-700 rounded-lg p-2">
              <p className="text-2xl font-bold text-white">{report.candidates ?? 0}</p>
              <p className="text-gray-400">Checked</p>
            </div>
            <div className="text-center bg-gray-800 border border-gray-700 rounded-lg p-2">
              <p className="text-2xl font-bold text-gray-300">{report.skipped?.length ?? 0}</p>
              <p className="text-gray-400">Not yet live</p>
            </div>
          </div>
          {report.promoted?.length > 0 && (
            <div>
              <p className="text-green-400 font-medium mb-1">✅ Models promoted this run:</p>
              {report.promoted.map((p: string, i: number) => (
                <p key={i} className="text-gray-300 font-mono">{p}</p>
              ))}
            </div>
          )}
          {report.errors?.length > 0 && (
            <div>
              <p className="text-red-400 font-medium mb-1">⚠ Errors:</p>
              {report.errors.map((e: string, i: number) => (
                <p key={i} className="text-gray-500">{e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Registry */}
      {registry && (
        <div className="space-y-3">
          <button
            onClick={() => setShowCandidates(v => !v)}
            className="w-full text-left px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-400 transition-colors flex items-center justify-between"
          >
            <span>📋 {registry.candidates?.length ?? 0} candidate models being monitored</span>
            <span>{showCandidates ? '▲' : '▼'}</span>
          </button>
          {showCandidates && registry.candidates && (
            <div className="space-y-2">
              {registry.candidates.map((c: any) => (
                <div key={c.key} className={`text-xs px-4 py-2 rounded-lg border flex items-start gap-3 ${
                  c.inCatalogue
                    ? 'bg-green-500/5 border-green-500/20 text-green-300'
                    : 'bg-gray-900 border-gray-800 text-gray-400'
                }`}>
                  <span className="shrink-0">{c.inCatalogue ? '✅' : '⏳'}</span>
                  <div className="min-w-0">
                    <span className="font-mono font-medium">{c.key}</span>
                    <span className="text-gray-600 ml-2">supersedes {c.supersedes}</span>
                    <p className="text-gray-500 truncate mt-0.5">{c.reason}</p>
                    <p className="text-gray-600">{c.licence} · {c.taskTypes.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeveloperPage() {
  const { settings, updateSettings, loadSettings, isSaving, exportSettings, resetToDefaults } =
    useSettings();
  const [exportedJson, setExportedJson] = useState('');
  const [routerStatus, setRouterStatus] = useState<RouterStatus | null>(null);
  const [routerLoading, setRouterLoading] = useState(false);
  const [showRouting, setShowRouting] = useState(false);

  const loadRouterStatus = useCallback(async () => {
    setRouterLoading(true);
    try {
      const res = await fetch('/api/v1/status');
      if (res.ok) setRouterStatus(await res.json());
    } catch {}
    setRouterLoading(false);
  }, []);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    loadSettings();
    loadRouterStatus();
  }, [loadRouterStatus]);

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
        <h2 className="text-2xl font-black text-[#F5F0E8] mb-2 uppercase tracking-widest">Grid Engineering Protocols</h2>
        <p className="text-[#8C8476] text-xs font-medium uppercase tracking-[0.15em]">Advanced architectural diagnostics and debugging arrays</p>
      </div>

      {/* Debug Toggles */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-[#F5F0E8] uppercase tracking-widest">Diagnostic Mode</div>
            <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Expose granular neural logs and error trace arrays</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                developer: { ...settings.developer, debugMode: !settings.developer.debugMode },
              })
            }
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-500 ${
              settings.developer.debugMode ? 'bg-[#66CCCC]' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-[#F5F0E8] transition-transform duration-500 ${
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
              settings.developer.showApiLogs ? 'bg-[#66CCCC]' : 'bg-[#1E1B18]'
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
              settings.developer.performanceMetrics ? 'bg-[#66CCCC]' : 'bg-[#1E1B18]'
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
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-[#1E1B18] rounded-lg border border-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ArrowDownTrayIcon className="w-5 h-5 text-[#66CCCC]" />
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#66CCCC] hover:bg-[#66CCCC]/80 rounded-lg text-white font-medium transition-colors"
              >
                <DocumentDuplicateIcon className="w-5 h-5" />
                Copy to Clipboard
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#1E1B18] hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Download JSON
              </button>
              <button
                onClick={() => setShowExport(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-[#1E1B18] rounded-lg text-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Model Router Status (Phase 8A) ── */}
      <div className="space-y-6 pt-10 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#F5F0E8] flex items-center gap-3 uppercase tracking-widest">
              🛤️ Neural Router Array
              <span className="text-[9px] font-black px-2.5 py-0.5 bg-[#66CCCC]/10 text-[#66CCCC] rounded-full border border-[#66CCCC]/20 uppercase tracking-tighter">
                PHASE 8A
              </span>
            </h3>
            <p className="text-[9px] text-[#8C8476] uppercase tracking-[0.2em] mt-1 font-medium">
              Task-aware dynamic routing across sovereign provider matrices
            </p>
          </div>
          <button
            onClick={loadRouterStatus}
            disabled={routerLoading}
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-[#1E1B18] border border-gray-700 rounded-lg text-gray-300 transition-colors flex items-center gap-1.5"
          >
            {routerLoading ? (
              <span className="inline-block w-3 h-3 border-2 border-[#66CCCC] border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>↻</span>
            )}
            Refresh
          </button>
        </div>

        {routerStatus && (
          <div className="space-y-3">
            {/* Summary bar */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
              routerStatus.status === 'healthy'  ? 'bg-green-500/10 border-green-500/30' :
              routerStatus.status === 'partial'  ? 'bg-yellow-500/10 border-yellow-500/30' :
                                                   'bg-red-500/10 border-red-500/30'
            }`}>
              <span className="text-lg">
                {routerStatus.status === 'healthy' ? '✅' : routerStatus.status === 'partial' ? '⚠️' : '❌'}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  routerStatus.status === 'healthy' ? 'text-green-300' :
                  routerStatus.status === 'partial' ? 'text-yellow-300' : 'text-red-300'
                }`}>
                  {routerStatus.providers_active}/{routerStatus.providers_total} providers active
                </p>
                <p className="text-xs text-gray-400 truncate">{routerStatus.note}</p>
              </div>
            </div>

            {/* Provider cards */}
            <div className="grid grid-cols-1 gap-2">
              {routerStatus.providers.map(p => (
                <div
                  key={p.id}
                  className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
                    p.configured
                      ? 'bg-gray-800/60 border-gray-700'
                      : 'bg-gray-900/40 border-gray-800 opacity-60'
                  }`}
                >
                  <span className="text-xl mt-0.5 shrink-0">{PROVIDER_ICONS[p.id] ?? '🤖'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{p.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        p.configured
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-[#1E1B18] text-gray-500 border border-gray-600'
                      }`}>
                        {p.configured ? 'Active' : 'Not configured'}
                      </span>
                      {p.tasks.map(t => (
                        <span key={t} className="text-xs text-gray-500">
                          {TASK_EMOJIS[t] ?? ''} {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{p.freeQuota}</p>
                    {!p.configured && (
                      <a
                        href={p.signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#66CCCC] hover:text-[#66CCCC] underline mt-0.5 inline-block"
                      >
                        Get free key →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Routing matrix toggle */}
            <button
              onClick={() => setShowRouting(v => !v)}
              className="w-full text-left px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-400 transition-colors flex items-center justify-between"
            >
              <span>🗺️ View routing matrix (task → model waterfall)</span>
              <span>{showRouting ? '▲' : '▼'}</span>
            </button>

            {showRouting && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2">
                {Object.entries(routerStatus.routing_matrix).map(([task, models]) => (
                  <div key={task} className="flex items-start gap-2">
                    <span className="text-xs font-mono text-[#66CCCC] w-20 shrink-0 pt-0.5">
                      {TASK_EMOJIS[task] ?? ''} {task}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {models.map((m, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300 flex items-center gap-1">
                          {i > 0 && <span className="text-gray-600">→</span>}
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!routerStatus && !routerLoading && (
          <p className="text-xs text-gray-500 italic">Click Refresh to load router status</p>
        )}
      </div>

      {/* ── Model Discovery & Auto-Upgrade ── */}
      <ModelDiscoveryPanel />

      {/* Warning Box */}
      <div className="bg-[#C7B8EA]/5 border border-[#C7B8EA]/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-xl">⚠️</div>
          <div className="flex-1">
            <div className="text-[10px] font-black text-[#C7B8EA] uppercase tracking-[0.2em] mb-2">Architectural Advisory</div>
            <p className="text-[9px] text-[#C7B8EA]/70 uppercase tracking-widest font-medium leading-relaxed">
              THESE PROTOCOLS ARE RESERVED FOR SENIOR ARCHITECTS. ENABLING DIAGNOSTIC OVERLAYS MAY COLLAPSE PERFORMANCE
              AND EXPOSE NEURAL ENCRYPTION TRACES WITHIN SYSTEM LOGS.
            </p>
          </div>
        </div>
      </div>

      {/* Save indicator */}
      {isSaving && (
        <div className="text-sm text-[#66CCCC] flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#66CCCC] border-t-transparent rounded-full animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
