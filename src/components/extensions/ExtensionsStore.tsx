"use client";

/**
 * Extensions Store — Roadmap C3
 *
 * Browse, install, and uninstall Holly's 80-extension catalog, grouped by
 * suite. Installs are real: since C2, an installed extension grants its
 * suite's tools to Holly in chat immediately.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Check, Loader2, Plus, Search, Trash2, X, Zap,
} from "lucide-react";

interface StoreExtension {
  id: string;
  suite: string;
  name: string;
  description: string;
  capabilities: string[];
  icon: string;
  nsfw?: boolean;
  premium?: boolean;
  installed: boolean;
  enabled: boolean;
}

const SUITES = [
  { id: 'all', label: 'All', icon: '✦' },
  { id: 'developer', label: 'Developer', icon: '⌨️' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'social', label: 'Social', icon: '📸' },
  { id: 'web', label: 'Web', icon: '🌐' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'productivity', label: 'Productivity', icon: '📋' },
  { id: 'research', label: 'Research', icon: '🔬' },
];

export default function ExtensionsStore() {
  const [extensions, setExtensions] = useState<StoreExtension[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suite, setSuite] = useState('all');
  const [query, setQuery] = useState('');
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/extensions/list');
      if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`);
      const data = await res.json();
      setExtensions(data.extensions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const setBusy = (id: string, busy: boolean) => {
    setBusyIds(prev => {
      const next = new Set(prev);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  };

  const install = async (ext: StoreExtension) => {
    setBusy(ext.id, true);
    try {
      const res = await fetch('/api/extensions/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId: ext.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Install failed (${res.status})`);
      setExtensions(prev =>
        prev ? prev.map(e => (e.id === ext.id ? { ...e, installed: true, enabled: true } : e)) : prev,
      );
      setToast({ msg: `${ext.name} installed — Holly can use it now` });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Install failed', isError: true });
    } finally {
      setBusy(ext.id, false);
    }
  };

  const uninstall = async (ext: StoreExtension) => {
    setBusy(ext.id, true);
    try {
      const res = await fetch('/api/extensions/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId: ext.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Uninstall failed (${res.status})`);
      setExtensions(prev =>
        prev ? prev.map(e => (e.id === ext.id ? { ...e, installed: false, enabled: false } : e)) : prev,
      );
      setToast({ msg: `${ext.name} removed` });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Uninstall failed', isError: true });
    } finally {
      setBusy(ext.id, false);
    }
  };

  const filtered = useMemo(() => {
    if (!extensions) return [];
    const q = query.trim().toLowerCase();
    return extensions.filter(ext => {
      if (suite !== 'all' && ext.suite !== suite) return false;
      if (!q) return true;
      return (
        ext.name.toLowerCase().includes(q) ||
        ext.description.toLowerCase().includes(q) ||
        ext.capabilities.some(c => c.toLowerCase().includes(q))
      );
    });
  }, [extensions, suite, query]);

  const installedCount = extensions?.filter(e => e.installed).length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/chat" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to chat
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Zap className="w-7 h-7 text-[#66CCCC]" /> Extensions Store
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {extensions
                ? `${extensions.length} extensions · ${installedCount} installed · installs take effect in chat immediately`
                : 'Loading catalog…'}
            </p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search extensions…"
              aria-label="Search extensions"
              className="w-56 bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#66CCCC]/50"
            />
          </div>
        </div>

        {/* Suite filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {SUITES.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSuite(s.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                suite === s.id
                  ? 'border-[#66CCCC]/60 bg-[#66CCCC]/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/25'
              }`}
            >
              <span className="mr-1">{s.icon}</span>{s.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 mb-6">
            {error}
          </div>
        )}

        {/* Grid */}
        {!extensions && !error && (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading extensions…
          </div>
        )}

        {extensions && filtered.length === 0 && (
          <p className="text-center text-gray-500 py-20 text-sm">
            No extensions match your search.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ext, i) => {
            const busy = busyIds.has(ext.id);
            return (
              <motion.div
                key={ext.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className={`relative p-5 rounded-2xl border flex flex-col ${
                  ext.installed
                    ? 'border-[#66CCCC]/40 bg-[#66CCCC]/[0.06]'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{ext.icon}</span>
                  {ext.installed && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#66CCCC] bg-[#66CCCC]/15 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Installed
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1">{ext.name}</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-3 flex-1">{ext.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {ext.capabilities.slice(0, 3).map(cap => (
                    <span key={cap} className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                      {cap}
                    </span>
                  ))}
                  {ext.capabilities.length > 3 && (
                    <span className="text-[10px] text-gray-600 px-1">+{ext.capabilities.length - 3}</span>
                  )}
                </div>
                {ext.nsfw && (
                  <span className="text-[10px] text-orange-400/80 mb-2">18+ · age verification required</span>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (ext.installed ? uninstall(ext) : install(ext))}
                  className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${
                    ext.installed
                      ? 'bg-white/5 text-gray-400 hover:bg-red-500/15 hover:text-red-300'
                      : 'bg-gradient-to-r from-[#66CCCC] to-[#C7B8EA] text-white hover:opacity-90'
                  }`}
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : ext.installed ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Install
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border shadow-lg ${
            toast.isError
              ? 'border-red-500/40 bg-[#1a0d0d] text-red-300'
              : 'border-[#66CCCC]/40 bg-[#0d1a1a] text-[#66CCCC]'
          }`}
        >
          {toast.isError ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
