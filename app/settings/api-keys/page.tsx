'use client';

/**
 * /settings/api-keys — Phase 7: Developer API Key Dashboard
 *
 * Allows authenticated users to:
 *  • Create new API keys (name, scopes, optional expiry, RPM/RPD limits)
 *  • View all their keys (prefix, scopes, usage stats, status)
 *  • Copy the raw key ONCE after creation
 *  • Revoke (soft-delete) individual keys
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Shield,
  Zap,
  Clock,
  BarChart3,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id:            string;
  name:          string;
  keyPrefix:     string;
  scopes:        string[];
  isActive:      boolean;
  rpmLimit:      number;
  rpdLimit:      number;
  expiresAt:     string | null;
  lastUsedAt:    string | null;
  createdAt:     string;
  totalRequests: number;
}

interface NewKeyResult {
  id:        string;
  name:      string;
  rawKey:    string;
  prefix:    string;
  scopes:    string[];
  rpmLimit:  number;
  rpdLimit:  number;
  expiresAt: string | null;
  createdAt: string;
}

const ALL_SCOPES = ['chat', 'evolution:read', 'feedback:write', 'agent:run'];
const SCOPE_LABELS: Record<string, string> = {
  'chat':            '💬 Chat',
  'evolution:read':  '📈 Evolution (read)',
  'feedback:write':  '👍 Feedback (write)',
  'agent:run':       '🤖 Agent (run)',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeSince(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ScopeTag({ scope }: { scope: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#2D8B5E]/10 text-[#2D8B5E] border border-[#2D8B5E]/20">
      {SCOPE_LABELS[scope] ?? scope}
    </span>
  );
}

function StatusBadge({ isActive, expiresAt }: { isActive: boolean; expiresAt: string | null }) {
  const expired = expiresAt && new Date(expiresAt) < new Date();
  if (!isActive || expired) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#C47A4A]/10 text-[#C47A4A] border border-[#C47A4A]/20">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C47A4A]" />
        {expired ? 'Severed (Expired)' : 'Severed (Revoked)'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#2D8B5E]/10 text-[#2D8B5E] border border-[#2D8B5E]/20">
      <span className="w-1.5 h-1.5 rounded-full bg-[#2D8B5E] animate-pulse shadow-[0_0_8px_#2D8B5E]" />
      Active
    </span>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const [keys, setKeys]                     = useState<ApiKey[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [showCreate, setShowCreate]         = useState(false);
  const [newKeyResult, setNewKeyResult]     = useState<NewKeyResult | null>(null);
  const [rawKeyCopied, setRawKeyCopied]     = useState(false);
  const [copiedId, setCopiedId]             = useState<string | null>(null);
  const [revokingId, setRevokingId]         = useState<string | null>(null);
  const [expandedId, setExpandedId]         = useState<string | null>(null);

  // Create-form state
  const [formName,       setFormName]       = useState('');
  const [formScopes,     setFormScopes]     = useState<string[]>(['chat']);
  const [formRpm,        setFormRpm]        = useState(20);
  const [formRpd,        setFormRpd]        = useState(1000);
  const [formExpiry,     setFormExpiry]     = useState('');
  const [creating,       setCreating]       = useState(false);
  const [createError,    setCreateError]    = useState<string | null>(null);

  // ── load keys ────────────────────────────────────────────────────────────────

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/v1/keys', { credentials: 'include' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Failed to load keys');
      setKeys(data.keys);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  // ── create key ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formName.trim()) { setCreateError('Please enter a name for this key.'); return; }
    if (formScopes.length === 0) { setCreateError('Select at least one scope.'); return; }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/v1/keys', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:      formName.trim(),
          scopes:    formScopes,
          rpmLimit:  formRpm,
          rpdLimit:  formRpd,
          expiresAt: formExpiry || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Failed to create key');
      setNewKeyResult(data.key);
      setShowCreate(false);
      // Reset form
      setFormName('');
      setFormScopes(['chat']);
      setFormRpm(20);
      setFormRpd(1000);
      setFormExpiry('');
      await loadKeys();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  // ── revoke ────────────────────────────────────────────────────────────────────

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    setRevokingId(id);
    try {
      await fetch(`/api/v1/keys/${id}`, { method: 'DELETE', credentials: 'include' });
      await loadKeys();
    } finally {
      setRevokingId(null);
    }
  };

  // ── copy ──────────────────────────────────────────────────────────────────────

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyRawKey = async () => {
    if (!newKeyResult) return;
    await navigator.clipboard.writeText(newKeyResult.rawKey);
    setRawKeyCopied(true);
    setTimeout(() => setRawKeyCopied(false), 3000);
  };

  // ─── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#F5F0E8] flex items-center gap-3 uppercase tracking-widest">
            <Key className="w-6 h-6 text-[#2D8B5E]" />
            Neural Access Protocols
          </h2>
          <p className="text-[#8C8476] mt-2 text-[11px] font-medium uppercase tracking-[0.15em]">
            Manage programmatic links for the{' '}
            <code className="text-[#2D8B5E] bg-[#2D8B5E]/10 px-1.5 py-0.5 rounded font-black tracking-tighter">
              /api/v1/
            </code>{' '}
            architectural grid.
          </p>
        </div>
        <motion.button
          onClick={() => setShowCreate(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#2D8B5E] to-[#C47A4A] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(45,139,94,0.15)]"
        >
          <Plus className="w-4 h-4" />
          Initialize Protocol
        </motion.button>
      </div>

      {/* Docs banner */}
      <div className="flex items-center gap-4 p-4 bg-[#2D8B5E]/5 border border-[#2D8B5E]/10 rounded-2xl text-[10px] text-[#8C8476] font-black uppercase tracking-widest leading-relaxed">
        <Shield className="w-4 h-4 shrink-0 text-[#2D8B5E]" />
        <span>
          PROMISSORY KEYS UTILIZE SHA-256 HASHING — THE RAW PROTOCOL IS DISCLOSED <strong>EXCLUSIVELY</strong> AT INITIALIZATION.
          AUTHORIZATION VIA <code className="bg-[#2D8B5E]/10 px-1.5 rounded text-[#2D8B5E]">Bearer holly_xxxx</code> OR{' '}
          <code className="bg-[#2D8B5E]/10 px-1.5 rounded text-[#2D8B5E]">x-api-key: holly_xxxx</code>.
        </span>
        <a
          href="https://holly-ai.dev/docs/api"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto shrink-0 flex items-center gap-2 text-[#2D8B5E] hover:text-[#F5F0E8] transition-colors"
        >
          Protocols <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* New Key Reveal Banner */}
      <AnimatePresence>
        {newKeyResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative p-6 bg-[#2D8B5E]/10 border border-[#2D8B5E]/30 rounded-3xl"
          >
            <button
              onClick={() => setNewKeyResult(null)}
              className="absolute top-4 right-4 text-[#8C8476] hover:text-[#F5F0E8]"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <Check className="w-4 h-4 text-[#2D8B5E]" />
              <span className="font-black text-[#2D8B5E] uppercase tracking-widest text-xs">PROTOCOL ESTABLISHED — COMMIT TO SECURE ARCHIVE</span>
            </div>
            <p className="text-[10px] text-[#8C8476] font-black uppercase tracking-widest mb-5">
              THIS IS THE SOLE DISCLOSURE OF THE RAW NEURAL KEY. ENCRYPT THIS DATA IMMEDIATELY.
            </p>
            <div className="flex items-center gap-4 bg-[#0A0908] border border-[#2D8B5E]/20 rounded-2xl px-5 py-4 font-mono text-sm text-[#F5F0E8] break-all">
              <span className="flex-1 select-all tracking-wider">{newKeyResult.rawKey}</span>
              <button
                onClick={copyRawKey}
                className="shrink-0 text-[#8C8476] hover:text-[#2D8B5E] transition-colors"
              >
                {rawKeyCopied ? <Check className="w-5 h-5 text-[#2D8B5E]" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {rawKeyCopied && (
              <p className="text-[9px] text-[#2D8B5E] font-black uppercase tracking-[0.2em] mt-3">✓ PROTOCOL COPIED TO BUFFER</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Form Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1,    y: 0  }}
              exit={{ scale: 0.95,    y: 20 }}
              className="w-full max-w-lg bg-[#12110F] border border-[#2D8B5E]/20 rounded-3xl p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-[#F5F0E8] flex items-center gap-3 uppercase tracking-widest">
                  <Plus className="w-5 h-5 text-[#2D8B5E]" />
                  Initialize Protocol
                </h3>
                <button onClick={() => setShowCreate(false)} className="text-[#8C8476] hover:text-[#F5F0E8]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="text-[10px] font-black text-[#2D8B5E] uppercase tracking-[0.2em] block mb-2">PROTOCOL IDENTIFIER</label>
                <input
                  type="text"
                  placeholder="e.g. CORE ANALYTICS, PROD GRID"
                  maxLength={64}
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-[#0A0908] border border-[#2D8B5E]/10 rounded-xl px-4 py-3 text-[#F5F0E8] text-sm placeholder-[#5C564D] focus:outline-none focus:border-[#2D8B5E] transition-colors uppercase tracking-widest"
                />
              </div>

              {/* Scopes */}
              <div>
                <label className="text-[10px] font-black text-[#2D8B5E] uppercase tracking-[0.2em] block mb-3">PERMISSION SCOPES</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SCOPES.map(scope => (
                    <button
                      key={scope}
                      onClick={() =>
                        setFormScopes(prev =>
                          prev.includes(scope)
                            ? prev.filter(s => s !== scope)
                            : [...prev, scope],
                        )
                      }
                      className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${
                        formScopes.includes(scope)
                          ? 'bg-[#2D8B5E] border-[#2D8B5E] text-[#0A0908] shadow-[0_0_15px_rgba(45,139,94,0.3)]'
                          : 'bg-[#0A0908] border-white/10 text-[#8C8476] hover:border-[#2D8B5E]/30'
                      }`}
                    >
                      {SCOPE_LABELS[scope] ?? scope}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-1">
                    RPM limit <span className="text-gray-500">(1–100)</span>
                  </label>
                  <input
                    type="number"
                    min={1} max={100}
                    value={formRpm}
                    onChange={e => setFormRpm(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2D8B5E]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-1">
                    RPD limit <span className="text-gray-500">(1–10 000)</span>
                  </label>
                  <input
                    type="number"
                    min={1} max={10000}
                    value={formRpd}
                    onChange={e => setFormRpd(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2D8B5E]"
                  />
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">
                  Expires on <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="date"
                  value={formExpiry}
                  onChange={e => setFormExpiry(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2D8B5E] [color-scheme:dark]"
                />
              </div>

              {createError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {createError}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl bg-[#1E1B18] hover:bg-[#24211D] text-[#8C8476] text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Abort
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#2D8B5E] to-[#C47A4A] disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-90 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(45,139,94,0.2)]"
                >
                  {creating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  {creating ? 'SYNCHRONIZING…' : 'INITIALIZE'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading keys…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-8 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={loadKeys} className="ml-2 underline hover:text-red-300">Retry</button>
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Key className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No API keys yet</p>
          <p className="text-sm mt-1">Create a key to start using the HOLLY Public API.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 bg-[#2D8B5E] hover:bg-[#2D8B5E]/80 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Create your first key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(key => (
            <motion.div
              key={key.id}
              layout
              className={`border rounded-2xl overflow-hidden transition-all duration-500 ${
                key.isActive && !(key.expiresAt && new Date(key.expiresAt) < new Date())
                  ? 'bg-[#12110F] border-white/5 hover:border-[#2D8B5E]/20 shadow-xl'
                  : 'bg-[#0A0908] border-white/5 opacity-50'
              }`}
            >
              {/* Key row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <Key className="w-4 h-4 text-[#2D8B5E] shrink-0" />

                {/* Name + prefix */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-black text-[#F5F0E8] text-[11px] uppercase tracking-widest truncate">{key.name}</span>
                    <StatusBadge isActive={key.isActive} expiresAt={key.expiresAt} />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <code className="text-[10px] text-[#5C564D] font-mono tracking-widest">{key.keyPrefix}••••••••</code>
                    <button
                      onClick={() => copyToClipboard(key.keyPrefix, key.id)}
                      className="text-gray-600 hover:text-gray-300 transition-colors"
                      title="Copy prefix"
                    >
                      {copiedId === key.id ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Scopes */}
                <div className="hidden md:flex flex-wrap gap-1 max-w-[220px]">
                  {key.scopes.map(s => <ScopeTag key={s} scope={s} />)}
                </div>

                {/* Stats quick */}
                <div className="hidden sm:flex flex-col items-end text-xs text-gray-500 mr-2">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    {key.totalRequests.toLocaleString()} req
                  </span>
                  <span className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {timeSince(key.lastUsedAt)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExpandedId(expandedId === key.id ? null : key.id)}
                    className="p-1.5 text-gray-500 hover:text-white transition-colors rounded"
                    title="Details"
                  >
                    {expandedId === key.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {key.isActive && (
                    <button
                      onClick={() => handleRevoke(key.id)}
                      disabled={revokingId === key.id}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded disabled:opacity-50"
                      title="Revoke key"
                    >
                      {revokingId === key.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {expandedId === key.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-gray-700/50"
                  >
                    <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Rate limits
                        </div>
                        <div className="text-white">{key.rpmLimit} rpm / {key.rpdLimit.toLocaleString()} rpd</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Expires
                        </div>
                        <div className="text-white">{formatDate(key.expiresAt)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Created
                        </div>
                        <div className="text-white">{formatDate(key.createdAt)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Last used
                        </div>
                        <div className="text-white">{timeSince(key.lastUsedAt)}</div>
                      </div>
                    </div>

                    {/* Scopes on mobile */}
                    <div className="md:hidden px-4 pb-3">
                      <div className="text-gray-500 text-xs mb-2">Scopes</div>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map(s => <ScopeTag key={s} scope={s} />)}
                      </div>
                    </div>

                    {/* Usage snippet */}
                    <div className="px-5 pb-5">
                      <div className="text-[#5C564D] text-[9px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <Copy className="w-3.5 h-3.5" /> ARCHITECTURAL CURL SNIPPET
                      </div>
                      <pre className="bg-[#0A0908] rounded-xl p-5 text-[11px] text-[#8C8476] overflow-x-auto whitespace-pre-wrap border border-white/5 font-mono leading-relaxed">
{`curl -X POST https://your-domain.com/api/v1/chat \\
  -H "Authorization: Bearer ${key.keyPrefix}••••" \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"Hello HOLLY!"}],"stream":false}'`}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Refresh */}
      {keys.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={loadKeys}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
