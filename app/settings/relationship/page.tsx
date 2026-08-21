'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

/**
 * C6 — Relationship Portability (HPRF v1.0)
 *
 * Export/import the user's full relationship with Holly via the real
 * Phase 16 engine (src/lib/memory/memory-portability.ts):
 *   POST /api/memory/export  → downloadable HPRF JSON
 *   GET  /api/memory/export  → counts preview
 *   POST /api/memory/import  → dryRun preview + real import (merge strategies)
 */

interface ExportPreview {
  willExport?: Record<string, number>;
  daysTogether?: number;
  totalItems?: number;
  exportFormat?: string;
  error?: string;
}

interface ImportPreview {
  success: boolean;
  imported?: Record<string, number>;
  skipped?: Record<string, number>;
  errors?: string[];
  dryRun?: boolean;
  error?: string;
}

type MergeStrategy = 'replace' | 'merge' | 'append';

const IMPORT_CATEGORIES: { key: string; label: string }[] = [
  { key: 'conversations', label: 'Conversations' },
  { key: 'memories', label: 'Memories' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'learningGoals', label: 'Learning Goals' },
  { key: 'knowledgeEntries', label: 'Knowledge Entries' },
  { key: 'goals', label: 'Goals' },
  { key: 'tasteSignals', label: 'Taste Signals' },
];

function CountGrid({ counts }: { counts: Record<string, number> }) {
  const rows = IMPORT_CATEGORIES.filter(c => counts[c.key] !== undefined);
  if (rows.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
      {rows.map(c => (
        <div key={c.key} className="px-3 py-2 bg-[#141210] rounded-lg border border-white/5">
          <div className="text-[9px] text-[#8C8476] uppercase tracking-widest">{c.label}</div>
          <div className="text-sm font-bold text-[#66CCCC]">{counts[c.key]}</div>
        </div>
      ))}
    </div>
  );
}

export default function RelationshipDataPage() {
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [vaultExporting, setVaultExporting] = useState(false);

  const [importFile, setImportFile] = useState<{ name: string; data: unknown } | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportPreview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load export preview counts (GET /api/memory/export)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/memory/export')
      .then(res => res.json())
      .then((data: ExportPreview) => { if (!cancelled) { setPreview(data); setPreviewLoading(false); } })
      .catch(() => { if (!cancelled) { setPreview({ error: 'Failed to load export preview' }); setPreviewLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // Export → download HPRF file
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/memory/export', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `holly-relationship-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[HPRF Export]', err);
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, []);

  // Vault → download human-readable markdown mirror
  const handleVaultDownload = useCallback(async () => {
    setVaultExporting(true);
    try {
      const res = await fetch('/api/memory/vault', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Vault generation failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `holly-memory-vault-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Memory Vault]', err);
      alert(err instanceof Error ? err.message : 'Vault generation failed');
    } finally {
      setVaultExporting(false);
    }
  }, []);

  // Pick a file → parse JSON → client-side HPRF sanity check → dry-run preview
  const handleFilePicked = useCallback(async (file: File) => {
    setFileError(null);
    setImportPreview(null);
    setImportResult(null);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('That file is not valid JSON.');
      }
      const hprf = parsed as Record<string, unknown>;
      if (hprf.version !== '1.0' || !hprf.data) {
        throw new Error('Not a valid HPRF v1.0 file — expected a Holly relationship export.');
      }
      setImportFile({ name: file.name, data: parsed });

      // Dry-run to preview what would be imported
      const res = await fetch('/api/memory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsed, options: { dryRun: true, mergeStrategy, skipExisting: true } }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Import preview failed');
      }
      setImportPreview(body as ImportPreview);
    } catch (err) {
      setImportFile(null);
      setFileError(err instanceof Error ? err.message : 'Could not read file');
    }
  }, [mergeStrategy]);

  // Real import
  const handleImport = useCallback(async () => {
    if (!importFile) return;
    if (!confirm('Import this relationship archive? This writes data to your Holly account.')) return;
    setImporting(true);
    try {
      const res = await fetch('/api/memory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: importFile.data, options: { dryRun: false, mergeStrategy, skipExisting: true } }),
      });
      const body = await res.json();
      setImportResult(body as ImportPreview);
      if (body.success) {
        setImportPreview(null);
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('[HPRF Import]', err);
      setImportResult({ success: false, error: err instanceof Error ? err.message : 'Import failed' });
    } finally {
      setImporting(false);
    }
  }, [importFile, mergeStrategy]);

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-black text-[#F5F0E8] mb-1">Relationship Data</h2>
        <p className="text-sm text-[#8C8476] mb-8">
          Your relationship with Holly belongs to you. Export a portable archive (HPRF v1.0) or
          restore one — memories, conversations, milestones, and everything Holly has learned about you.
        </p>
      </motion.div>

      {/* ── Export ── */}
      <section className="mb-10">
        <h3 className="text-[10px] font-black text-[#C7B8EA] uppercase tracking-[0.2em] mb-4">Export Archive</h3>
        <div className="bg-[#1E1B18] border border-white/5 rounded-2xl p-6">
          {previewLoading ? (
            <p className="text-sm text-[#8C8476]">Loading what Holly remembers…</p>
          ) : preview?.error ? (
            <p className="text-sm text-red-400">{preview.error}</p>
          ) : (
            <>
              {typeof preview?.daysTogether === 'number' && (
                <p className="text-sm text-[#F5F0E8] mb-1">
                  <span className="font-bold text-[#66CCCC]">{preview.daysTogether}</span> days together
                  <span className="text-[#8C8476]"> · {preview.totalItems ?? 0} items · {preview.exportFormat ?? 'HPRF v1.0'}</span>
                </p>
              )}
              <CountGrid counts={preview?.willExport ?? {}} />
              <button
                onClick={handleExport}
                disabled={exporting}
                className="mt-5 w-full px-4 py-3 bg-[#66CCCC]/10 hover:bg-[#66CCCC]/20 disabled:opacity-50 text-[#66CCCC] text-[11px] font-black uppercase tracking-widest rounded-xl border border-[#66CCCC]/20 transition-colors"
              >
                {exporting ? 'Preparing archive…' : 'Download Relationship Archive'}
              </button>
              {/* Memory Vault — human-readable markdown mirror of the same data */}
              <button
                onClick={handleVaultDownload}
                disabled={vaultExporting}
                className="mt-3 w-full px-4 py-3 bg-[#C7B8EA]/10 hover:bg-[#C7B8EA]/20 disabled:opacity-50 text-[#C7B8EA] text-[11px] font-black uppercase tracking-widest rounded-xl border border-[#C7B8EA]/20 transition-colors"
              >
                {vaultExporting ? 'Writing the vault…' : 'Download Memory Vault (readable)'}
              </button>
              <p className="mt-3 text-[11px] text-[#8C8476] leading-relaxed">
                The archive (JSON) is for restoring into Holly. The vault (markdown) is for you —
                open it anywhere, print it, keep it forever. Postgres stays the source of truth.
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── Import ── */}
      <section>
        <h3 className="text-[10px] font-black text-[#C7B8EA] uppercase tracking-[0.2em] mb-4">Restore Archive</h3>
        <div className="bg-[#1E1B18] border border-white/5 rounded-2xl p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void handleFilePicked(f); }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 border border-dashed border-[#66CCCC]/30 hover:border-[#66CCCC]/60 text-[#8C8476] hover:text-[#66CCCC] text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors"
          >
            {importFile ? `Selected: ${importFile.name}` : 'Choose HPRF v1.0 file…'}
          </button>

          {fileError && <p className="mt-3 text-sm text-red-400">{fileError}</p>}

          {importPreview && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-[10px] font-black text-[#F5F0E8] uppercase tracking-widest mb-1">Preview (nothing written yet)</p>
              <CountGrid counts={importPreview.imported ?? {}} />
              {(importPreview.errors?.length ?? 0) > 0 && (
                <p className="mt-2 text-xs text-amber-400">{importPreview.errors!.length} item(s) reported warnings</p>
              )}
              <div className="mt-4">
                <label className="block text-[9px] text-[#8C8476] uppercase tracking-widest mb-2">Merge strategy</label>
                <div className="flex gap-2">
                  {(['merge', 'append', 'replace'] as MergeStrategy[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setMergeStrategy(s)}
                      className={`flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-colors ${
                        mergeStrategy === s
                          ? 'bg-[#66CCCC]/15 text-[#66CCCC] border-[#66CCCC]/40'
                          : 'text-[#8C8476] border-white/10 hover:text-[#F5F0E8]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-[#8C8476]">
                  {mergeStrategy === 'merge' && 'Existing items are kept; new items are added. Recommended.'}
                  {mergeStrategy === 'append' && 'Everything from the file is added alongside existing data.'}
                  {mergeStrategy === 'replace' && 'The file\u2019s relationship profile replaces your current one.'}
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 px-4 py-3 bg-[#66CCCC]/10 hover:bg-[#66CCCC]/20 disabled:opacity-50 text-[#66CCCC] text-[11px] font-black uppercase tracking-widest rounded-xl border border-[#66CCCC]/20 transition-colors"
                >
                  {importing ? 'Importing…' : 'Import Archive'}
                </button>
                <button
                  onClick={() => { setImportFile(null); setImportPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  disabled={importing}
                  className="px-4 py-3 text-[#8C8476] hover:text-[#F5F0E8] text-[11px] font-black uppercase tracking-widest rounded-xl border border-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {importResult && (
            <div className={`mt-5 pt-5 border-t border-white/5 ${importResult.success ? '' : ''}`}>
              {importResult.success ? (
                <>
                  <p className="text-sm text-[#66CCCC] font-bold mb-1">Import complete.</p>
                  <CountGrid counts={importResult.imported ?? {}} />
                  {(Object.values(importResult.skipped ?? {}).some(n => n > 0)) && (
                    <p className="mt-2 text-xs text-[#8C8476]">
                      Skipped {Object.values(importResult.skipped ?? {}).reduce((a, b) => a + b, 0)} existing item(s).
                    </p>
                  )}
                  {(importResult.errors?.length ?? 0) > 0 && (
                    <p className="mt-2 text-xs text-amber-400">{importResult.errors!.length} warning(s) during import</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-red-400">{importResult.error || 'Import failed'}</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
