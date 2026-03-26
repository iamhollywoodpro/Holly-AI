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
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
      {SCOPE_LABELS[scope] ?? scope}
    </span>
  );
}

function StatusBadge({ isActive, expiresAt }: { isActive: boolean; expiresAt: string | null }) {
  const expired = expiresAt && new Date(expiresAt) < new Date();
  if (!isActive || expired) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        {expired ? 'Expired' : 'Revoked'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
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
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-purple-400" />
            API Keys
          </h2>
          <p className="text-gray-400 mt-1">
            Manage your programmatic access keys for the{' '}
            <code className="text-purple-300 bg-purple-500/10 px-1 py-0.5 rounded text-sm">
              /api/v1/
            </code>{' '}
            endpoints.
          </p>
        </div>
        <motion.button
          onClick={() => setShowCreate(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Key
        </motion.button>
      </div>

      {/* Docs banner */}
      <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm text-purple-300">
        <Shield className="w-4 h-4 shrink-0" />
        <span>
          Keys use SHA-256 hashing — the raw key is shown <strong>once</strong> at creation and never stored.
          Pass as <code className="bg-purple-500/20 px-1 rounded">Authorization: Bearer holly_xxxx</code> or{' '}
          <code className="bg-purple-500/20 px-1 rounded">x-api-key: holly_xxxx</code>.
        </span>
        <a
          href="https://holly-ai.dev/docs/api"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto shrink-0 flex items-center gap-1 hover:text-white"
        >
          Docs <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* New Key Reveal Banner */}
      <AnimatePresence>
        {newKeyResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
          >
            <button
              onClick={() => setNewKeyResult(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-green-400">API key created — save this now!</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              This is the only time your raw key will be shown. Copy it somewhere safe before closing.
            </p>
            <div className="flex items-center gap-2 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 font-mono text-sm text-white break-all">
              <span className="flex-1 select-all">{newKeyResult.rawKey}</span>
              <button
                onClick={copyRawKey}
                className="shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                {rawKeyCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {rawKeyCopied && (
              <p className="text-xs text-green-400 mt-2">✓ Copied to clipboard</p>
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
              className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-purple-400" />
                  Create API Key
                </h3>
                <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">Key name</label>
                <input
                  type="text"
                  placeholder="e.g. My App, CI/CD, Personal Project"
                  maxLength={64}
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Scopes */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Scopes</label>
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
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        formScopes.includes(scope)
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400'
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
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
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
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
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
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                />
              </div>

              {createError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {createError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  {creating ? 'Creating…' : 'Create Key'}
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
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
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
              className={`border rounded-xl overflow-hidden transition-colors ${
                key.isActive && !(key.expiresAt && new Date(key.expiresAt) < new Date())
                  ? 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  : 'bg-gray-900/50 border-gray-800 opacity-75'
              }`}
            >
              {/* Key row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <Key className="w-4 h-4 text-purple-400 shrink-0" />

                {/* Name + prefix */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white text-sm truncate">{key.name}</span>
                    <StatusBadge isActive={key.isActive} expiresAt={key.expiresAt} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-xs text-gray-400 font-mono">{key.keyPrefix}••••••••</code>
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
                    <div className="px-4 pb-4">
                      <div className="text-gray-500 text-xs mb-2 flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Example request
                      </div>
                      <pre className="bg-gray-950 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
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
