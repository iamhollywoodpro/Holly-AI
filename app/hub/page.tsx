'use client';

/**
 * HOLLY Tool Hub — Interactive API Playground & Documentation
 * Route: /hub
 *
 * Sections:
 *   Playground — live API testing with preset payloads
 *   Docs       — full API reference with curl examples and schemas
 *   Logs       — client-side request history
 *   Metrics    — server-side performance metrics
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolId  = 'aura' | 'sentinel';
type Section = 'playground' | 'docs' | 'logs' | 'metrics';

interface RequestLog {
  id:        string;
  tool:      ToolId;
  action:    string;
  status:    'pending' | 'success' | 'error';
  duration?: number;
  timestamp: string;
  input:     unknown;
  output?:   unknown;
  error?:    string;
}

// ─── Preset payloads ──────────────────────────────────────────────────────────

const PRESETS: Record<string, Record<string, unknown>> = {
  'aura.analyze_song': {
    title: 'Midnight Drive', artist: 'Nova', genre: 'synthpop',
    bpm: 128, key: 'G minor', mood: 'euphoric',
    lyrics: "Neon lights streak the highway\nYour voice cuts through the static\nWe're chasing something, something\nThat keeps us automatic\n\nGo faster, don't look back now\nThis city's in the rearview\nI swear we'll find a way out\nOf everything we're running to",
  },
  'aura.generate_recommendations': {
    title: 'Midnight Drive', genre: 'synthpop',
    currentKey: 'G minor', currentBpm: 128,
    targetMood: 'anthemic', targetAudience: 'Gen-Z pop',
    areas: ['chords', 'lyrics', 'production'],
  },
  'aura.identify_hit_potential': {
    title: 'Midnight Drive', genre: 'synthpop',
    artist: 'Nova', targetMarket: 'US mainstream',
    similarArtists: ['The Weeknd', 'Dua Lipa', 'Tame Impala'],
  },
  'sentinel.analyze_code': {
    language: 'javascript',
    filename: 'utils.js',
    focusAreas: ['errors', 'performance', 'security'],
    code: `function fetchUser(id) {
  const url = "https://api.example.com/users/" + id;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      document.innerHTML = data.bio; // XSS vulnerability
      console.log(data.password);   // logging sensitive data
    })

  var cache = [];
  for (var i = 0; i < 10000; i++) {
    cache.push(new Array(1000).fill(i)); // memory leak
  }
}`,
  },
  'sentinel.generate_code': {
    description: 'A React hook that fetches user data from an API with loading, error, and retry states',
    language: 'typescript',
    framework: 'React',
    style: 'functional hooks',
    requirements: [
      'Auto-retry on failure (up to 3 times)',
      'Exponential backoff between retries',
      'TypeScript generics for flexible data type',
      'AbortController for cleanup on unmount',
    ],
  },
};

// ─── Curl examples ────────────────────────────────────────────────────────────

const CURL_EXAMPLES: Record<string, string> = {
  'aura.analyze_song': `curl -X POST https://holly.nexamusicgroup.com/api/hub/aura/analyze_song \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer holly_xxxx" \\
  -d '{
    "title": "Midnight Drive",
    "artist": "Nova",
    "genre": "synthpop",
    "bpm": 128,
    "key": "G minor",
    "mood": "euphoric"
  }'`,

  'aura.generate_recommendations': `curl -X POST https://holly.nexamusicgroup.com/api/hub/aura/generate_recommendations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer holly_xxxx" \\
  -d '{
    "title": "Midnight Drive",
    "genre": "synthpop",
    "currentKey": "G minor",
    "currentBpm": 128,
    "areas": ["chords", "lyrics", "production"]
  }'`,

  'aura.identify_hit_potential': `curl -X POST https://holly.nexamusicgroup.com/api/hub/aura/identify_hit_potential \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer holly_xxxx" \\
  -d '{
    "title": "Midnight Drive",
    "genre": "synthpop",
    "targetMarket": "US mainstream",
    "similarArtists": ["The Weeknd", "Dua Lipa"]
  }'`,

  'master.route': `curl -X POST https://holly.nexamusicgroup.com/api/hub \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer holly_xxxx" \\
  -d '{
    "tool": "aura",
    "action": "analyze_song",
    "payload": {
      "title": "Midnight Drive",
      "genre": "synthpop"
    }
  }'`,

  'sentinel.analyze_code': `curl -X POST https://holly.nexamusicgroup.com/api/hub/sentinel/analyze_code \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer holly_xxxx" \\
  -d '{
    "code": "function add(a,b){ return a+b }",
    "language": "javascript",
    "focusAreas": ["errors", "style"]
  }'`,

  'sentinel.generate_code': `curl -X POST https://holly.nexamusicgroup.com/api/hub/sentinel/generate_code \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer holly_xxxx" \\
  -d '{
    "description": "A debounce utility function with TypeScript types",
    "language": "typescript",
    "style": "functional"
  }'`,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    green:  'bg-green-900/40 text-green-300 border-green-700/50',
    blue:   'bg-blue-900/40 text-blue-300 border-blue-700/50',
    purple: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
    yellow: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
    red:    'bg-red-900/40 text-red-300 border-red-700/50',
    gray:   'bg-gray-800/60 text-gray-400 border-gray-600/40',
    orange: 'bg-orange-900/40 text-orange-300 border-orange-700/50',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-mono rounded border ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  );
}

function JsonViewer({ data, maxHeight = '400px' }: { data: unknown; maxHeight?: string }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute top-2 right-2 text-xs text-gray-500 hover:text-gray-300 z-10 bg-black/60 px-2 py-0.5 rounded"
      >
        {collapsed ? '▼ expand' : '▲ collapse'}
      </button>
      {!collapsed && (
        <pre
          className="bg-black/60 border border-gray-700/50 rounded-xl p-4 text-xs text-green-300 font-mono overflow-auto leading-relaxed"
          style={{ maxHeight }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      {collapsed && (
        <div
          className="bg-black/40 border border-gray-700/30 rounded-xl px-4 py-2 text-xs text-gray-500 cursor-pointer hover:border-gray-600/60"
          onClick={() => setCollapsed(false)}
        >
          {Array.isArray(data)
            ? `Array[${(data as unknown[]).length}]`
            : typeof data === 'object' && data !== null
              ? `Object{${Object.keys(data as object).slice(0, 5).join(', ')}${Object.keys(data as object).length > 5 ? ', …' : ''}}`
              : String(data)}
        </div>
      )}
    </div>
  );
}

function CodeBlock({ code, lang = '' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="relative group">
      <button
        onClick={copy}
        className="absolute top-2 right-2 text-xs text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800/80 px-2 py-0.5 rounded z-10"
      >
        {copied ? '✓ copied' : 'copy'}
      </button>
      {lang && (
        <span className="absolute top-2 left-3 text-xs text-gray-600 font-mono">{lang}</span>
      )}
      <pre className="bg-gray-950/80 border border-gray-700/50 rounded-xl p-4 pt-6 text-xs text-gray-300 font-mono overflow-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

function StatusDot({ status }: { status: 'pending' | 'success' | 'error' }) {
  if (status === 'pending') return <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />;
  if (status === 'success') return <span className="inline-block w-2 h-2 rounded-full bg-green-400" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-red-400" />;
}

function FieldTable({ fields, required }: { fields: { name: string; type: string; description: string; required: boolean }[]; required?: boolean }) {
  const filtered = required !== undefined ? fields.filter(f => f.required === required) : fields;
  if (filtered.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-gray-700/40">
      <table className="w-full text-xs">
        <thead className="bg-gray-800/60">
          <tr>
            <th className="text-left px-3 py-2 text-gray-400 font-medium">Field</th>
            <th className="text-left px-3 py-2 text-gray-400 font-medium">Type</th>
            <th className="text-left px-3 py-2 text-gray-400 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/30">
          {filtered.map(f => (
            <tr key={f.name} className="bg-black/20 hover:bg-black/40">
              <td className="px-3 py-2 font-mono text-blue-300">{f.name}{f.required ? <span className="text-red-400 ml-0.5">*</span> : ''}</td>
              <td className="px-3 py-2 font-mono text-yellow-300">{f.type}</td>
              <td className="px-3 py-2 text-gray-400">{f.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── AURA Schema ──────────────────────────────────────────────────────────────

const AURA_ACTIONS = [
  {
    id: 'analyze_song', name: 'Analyze Song', endpoint: 'POST /api/hub/aura/analyze_song',
    description: 'Deep-analysis of a song\'s structure, melody, and lyrics. Returns patterns, trends, and a quality score.',
    fields: [
      { name: 'title',   type: 'string', required: true,  description: 'Song title' },
      { name: 'artist',  type: 'string', required: false, description: 'Artist name' },
      { name: 'genre',   type: 'string', required: false, description: 'Music genre (e.g. "synthpop", "hip-hop")' },
      { name: 'lyrics',  type: 'string', required: false, description: 'Full lyrics text — enables deep lyric analysis' },
      { name: 'bpm',     type: 'number', required: false, description: 'Beats per minute (e.g. 128)' },
      { name: 'key',     type: 'string', required: false, description: 'Musical key (e.g. "G minor", "C major")' },
      { name: 'mood',    type: 'string', required: false, description: 'Song mood (e.g. "euphoric", "melancholic")' },
    ],
    returns: 'structure { sections, tempo, timeSignature, estimatedDuration }, melody { range, complexity, hooks[], key, mode }, lyrics { themes[], sentiment, rhymeScheme, wordCount }, patterns[], trends[], overallScore (0–100), summary',
    useCases: [
      'Pre-release quality check before pitching to labels',
      'A&R tool to screen inbound demo submissions at scale',
      'Compare your song structure against genre conventions',
      'Identify weak sections before final mix',
    ],
  },
  {
    id: 'generate_recommendations', name: 'Generate Recommendations', endpoint: 'POST /api/hub/aura/generate_recommendations',
    description: 'Generate specific, actionable improvement recommendations including chord progressions, melody ideas, and lyric edits.',
    fields: [
      { name: 'title',          type: 'string',   required: true,  description: 'Song title' },
      { name: 'genre',          type: 'string',   required: false, description: 'Music genre' },
      { name: 'lyrics',         type: 'string',   required: false, description: 'Current lyrics text' },
      { name: 'currentKey',     type: 'string',   required: false, description: 'Current key (e.g. "A minor")' },
      { name: 'currentBpm',     type: 'number',   required: false, description: 'Current BPM' },
      { name: 'targetMood',     type: 'string',   required: false, description: 'Desired emotional mood' },
      { name: 'targetAudience', type: 'string',   required: false, description: 'Target audience (e.g. "Gen-Z pop")' },
      { name: 'areas',          type: 'string[]', required: false, description: 'Focus: melody | chords | lyrics | structure | production' },
    ],
    returns: 'recommendations[] { area, priority, suggestion, rationale, example }, chordProgressions[] { name, chords[], genre, mood }, melodyIdeas[], lyricsEdits[] { original, suggested, reason }, productionTips[], summary',
    useCases: [
      'Get specific chord substitutions for a stale chorus',
      'Improve lyrics with AI-suggested line edits',
      'Find production techniques to match a target mood',
      'Get genre-appropriate structural suggestions',
    ],
  },
  {
    id: 'identify_hit_potential', name: 'Identify Hit Potential', endpoint: 'POST /api/hub/aura/identify_hit_potential',
    description: 'Score commercial hit potential using market trend analysis, audience modeling, and platform fit scoring.',
    fields: [
      { name: 'title',              type: 'string',   required: true,  description: 'Song title' },
      { name: 'genre',              type: 'string',   required: true,  description: 'Primary genre' },
      { name: 'artist',             type: 'string',   required: false, description: 'Artist name' },
      { name: 'lyrics',             type: 'string',   required: false, description: 'Lyrics text' },
      { name: 'targetMarket',       type: 'string',   required: false, description: 'Target market (e.g. "US mainstream")' },
      { name: 'releaseDate',        type: 'string',   required: false, description: 'Planned release date (ISO 8601)' },
      { name: 'similarArtists',     type: 'string[]', required: false, description: 'Comparable artist names' },
      { name: 'streamingPlatforms', type: 'string[]', required: false, description: 'Target platforms (Spotify, TikTok, etc.)' },
    ],
    returns: 'hitScore (0–100), verdict (high|medium|low), confidence (0.0–1.0), marketAnalysis { genreTrend, audienceMatch, platformFit, seasonality, competitionLevel }, strengths[], weaknesses[], opportunities[], comparables[] { title, artist, reason }, recommendation',
    useCases: [
      'Prioritize which songs to release from a backlog',
      'Time a release to align with genre trend peaks',
      'Identify platform-specific strengths for campaign targeting',
      'Validate commercial potential before spending on production',
    ],
  },
];

const SENTINEL_ACTIONS = [
  {
    id: 'analyze_code', name: 'Analyze Code', endpoint: 'POST /api/hub/sentinel/analyze_code',
    description: 'Analyze a code snippet for errors, performance bottlenecks, security vulnerabilities, and style issues. Returns a quality score and optionally auto-corrected code.',
    fields: [
      { name: 'code',       type: 'string',   required: true,  description: 'Source code to analyze (max 20,000 chars)' },
      { name: 'language',   type: 'string',   required: true,  description: 'Programming language (js, ts, python, go, rust, etc.)' },
      { name: 'filename',   type: 'string',   required: false, description: 'Filename for context (e.g. "auth.ts")' },
      { name: 'context',    type: 'string',   required: false, description: 'What the code is supposed to do' },
      { name: 'focusAreas', type: 'string[]', required: false, description: 'errors | performance | security | style | all' },
    ],
    returns: 'score (0–100), errors[] { line, column, severity, code, message, fix }, warnings[], suggestions[], performance[] { type, description, impact, suggestion }, security[] { type, description, severity, cwe, fix }, metrics { lines, functions, complexity, maintainability, testability }, summary, fixedCode?',
    useCases: [
      'Automated code review on every PR',
      'Security audit of API route handlers',
      'Detect memory leaks and performance bottlenecks',
      'Generate corrected code with one API call',
    ],
  },
  {
    id: 'generate_code', name: 'Generate Code', endpoint: 'POST /api/hub/sentinel/generate_code',
    description: 'Generate clean, production-ready code from a natural language description. Includes explanation, usage example, dependencies, and optional unit tests.',
    fields: [
      { name: 'description',  type: 'string',   required: true,  description: 'Natural language description of what to build' },
      { name: 'language',     type: 'string',   required: true,  description: 'Target programming language' },
      { name: 'framework',    type: 'string',   required: false, description: 'Framework (Next.js, React, FastAPI, etc.)' },
      { name: 'style',        type: 'string',   required: false, description: 'functional | OOP | hooks | async/await | class-based' },
      { name: 'context',      type: 'string',   required: false, description: 'Surrounding code or imports for context' },
      { name: 'requirements', type: 'string[]', required: false, description: 'Specific requirements to include' },
      { name: 'examples',     type: 'string[]', required: false, description: 'Example inputs/outputs to guide generation' },
    ],
    returns: 'code (string), language, explanation, usage (how to integrate), dependencies[], tests? (unit test code), notes[]',
    useCases: [
      'Generate boilerplate for a new feature from a ticket description',
      'Create utility functions from plain English',
      'Bootstrap React components with full TypeScript types',
      'Generate musical composition algorithms (e.g. chord generators, MIDI helpers)',
    ],
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HubPage() {
  const [section, setSection] = useState<Section>('playground');
  const [activeTool, setActiveTool] = useState<ToolId>('aura');
  const [activeAction, setActiveAction] = useState('analyze_song');
  const [apiKey, setApiKey] = useState('');
  const [payload, setPayload] = useState(() => JSON.stringify(PRESETS['aura.analyze_song'], null, 2));
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [docsTool, setDocsTool] = useState<'aura' | 'sentinel' | 'master'>('master');
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const logIdRef = useRef(0);

  const tools = {
    aura: {
      name: 'AURA', color: 'purple', icon: '🎵',
      description: 'A&R Intelligence Engine',
      actions: ['analyze_song', 'generate_recommendations', 'identify_hit_potential'],
    },
    sentinel: {
      name: 'Sentinel', color: 'blue', icon: '⚡',
      description: 'Code Intelligence Engine',
      actions: ['analyze_code', 'generate_code'],
    },
  };

  const selectAction = useCallback((tool: ToolId, action: string) => {
    setActiveTool(tool);
    setActiveAction(action);
    const preset = PRESETS[`${tool}.${action}`];
    if (preset) setPayload(JSON.stringify(preset, null, 2));
  }, []);

  const runRequest = useCallback(async () => {
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      alert('Invalid JSON in payload editor. Please fix before running.');
      return;
    }

    const logId = `log_${++logIdRef.current}`;
    const logEntry: RequestLog = {
      id: logId, tool: activeTool, action: activeAction,
      status: 'pending', timestamp: new Date().toISOString(), input: parsedPayload,
    };
    setLogs(prev => [logEntry, ...prev.slice(0, 49)]);
    setIsLoading(true);

    const start = Date.now();
    try {
      const endpoint = `/api/hub/${activeTool}/${activeAction}`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (apiKey.startsWith('holly_') || apiKey.length > 10) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        headers['x-hub-key'] = 'hub_dev';
      }

      const res  = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(parsedPayload) });
      const data = await res.json();
      const duration = Date.now() - start;

      setLogs(prev => prev.map(l =>
        l.id === logId
          ? { ...l, status: res.ok ? 'success' : 'error', duration, output: data, error: !res.ok ? data.error : undefined }
          : l,
      ));
    } catch (err) {
      setLogs(prev => prev.map(l =>
        l.id === logId
          ? { ...l, status: 'error', duration: Date.now() - start, error: err instanceof Error ? err.message : 'Network error' }
          : l,
      ));
    } finally {
      setIsLoading(false);
    }
  }, [activeTool, activeAction, payload, apiKey]);

  const fetchMetrics = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiKey.length > 10) headers['Authorization'] = `Bearer ${apiKey}`;
      else headers['x-hub-key'] = 'hub_dev';
      const res  = await fetch('/api/hub/metrics', { headers });
      const data = await res.json();
      setMetrics(data);
    } catch {
      setMetrics({ error: 'Failed to fetch metrics. Try again.' });
    }
  }, [apiKey]);

  const latestLog = logs[0];
  const tool = tools[activeTool];

  return (
    <div className="min-h-screen bg-black text-white font-sans">

      {/* ── Header ── */}
      <div className="border-b border-gray-800/60 bg-gradient-to-r from-gray-950 via-black to-gray-950 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-base shadow-lg shadow-violet-900/30">
              ⚙
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-tight">HOLLY Tool Hub</h1>
              <p className="text-gray-500 text-xs">Modular API Framework · v1.0.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge label="🎵 AURA" color="purple" />
            <Badge label="⚡ Sentinel" color="blue" />
            <Badge label="5 endpoints" color="gray" />
            <Badge label="JWT + Hub-Key" color="yellow" />
          </div>
        </div>

        {/* Nav tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-0 border-t border-gray-800/40">
          {(['playground', 'docs', 'logs', 'metrics'] as Section[]).map(s => (
            <button
              key={s}
              onClick={() => { setSection(s); if (s === 'metrics') fetchMetrics(); }}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
                section === s
                  ? 'border-violet-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {s === 'playground' ? '▶ Playground'
                : s === 'docs'   ? '📄 Docs'
                : s === 'logs'   ? '📋 Logs'
                : '📊 Metrics'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ══════════════════════════════════════════════════════
            PLAYGROUND
        ══════════════════════════════════════════════════════ */}
        {section === 'playground' && (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

            {/* Sidebar */}
            <div className="space-y-3">
              {/* API Key input */}
              <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-4">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide block mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  placeholder="holly_xxxx or leave blank"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full bg-black/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 font-mono"
                />
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Blank → dev bypass. Production: generate at{' '}
                  <a href="/settings/api-keys" className="text-violet-400 hover:underline">/settings/api-keys</a>
                </p>
              </div>

              {/* Tool & action selector */}
              {(Object.entries(tools) as [ToolId, typeof tools.aura][]).map(([tid, t]) => (
                <div key={tid} className="bg-gray-900/60 border border-gray-700/40 rounded-2xl overflow-hidden">
                  <div className={`px-4 py-2.5 border-b border-gray-700/40 flex items-center gap-2 ${activeTool === tid ? 'bg-gray-800/60' : ''}`}>
                    <span className="text-base">{t.icon}</span>
                    <span className="font-semibold text-sm text-white">{t.name}</span>
                    <Badge label={t.description} color={t.color as 'purple' | 'blue'} />
                  </div>
                  <div className="p-2 space-y-1">
                    {t.actions.map(action => (
                      <button
                        key={action}
                        onClick={() => selectAction(tid, action)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                          activeTool === tid && activeAction === action
                            ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                        }`}
                      >
                        <span className="font-mono text-xs">{action}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quick links */}
              <div className="bg-gray-900/40 border border-gray-700/30 rounded-2xl p-3 space-y-1.5">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Quick Links</p>
                {[
                  { label: 'Hub directory', href: '/api/hub' },
                  { label: 'AURA manifest', href: '/api/hub/aura' },
                  { label: 'Sentinel manifest', href: '/api/hub/sentinel' },
                  { label: 'Server logs', href: '/api/hub/logs' },
                  { label: 'Server metrics', href: '/api/hub/metrics' },
                ].map(({ label, href }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <span className="font-mono">{href}</span>
                    <span className="text-gray-700 ml-1">↗</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Main panel */}
            <div className="space-y-4">
              {/* Request editor */}
              <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700/40 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge label="POST" color="orange" />
                    <code className="text-sm text-white">/api/hub/{activeTool}/{activeAction}</code>
                    <Badge label={tool.name} color={tool.color as 'purple' | 'blue'} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPayload(JSON.stringify(PRESETS[`${activeTool}.${activeAction}`] ?? {}, null, 2))}
                      className="px-3 py-1 text-xs text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-700/60 rounded-lg transition-colors"
                    >
                      ↺ Reset preset
                    </button>
                    <button
                      onClick={runRequest}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                    >
                      {isLoading ? <><span className="animate-spin inline-block">⟳</span> Running…</> : <>▶ Run</>}
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block font-semibold uppercase tracking-wide">Request Body (JSON)</label>
                    <textarea
                      value={payload}
                      onChange={e => setPayload(e.target.value)}
                      rows={16}
                      spellCheck={false}
                      className="w-full bg-black/60 border border-gray-700/50 rounded-xl p-3 text-sm text-green-300 font-mono focus:outline-none focus:border-violet-500 resize-y"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block font-semibold uppercase tracking-wide">cURL Equivalent</label>
                    <CodeBlock
                      code={CURL_EXAMPLES[`${activeTool}.${activeAction}`] ?? `curl -X POST /api/hub/${activeTool}/${activeAction} \\\n  -H "Authorization: Bearer holly_xxxx" \\\n  -d '${payload}'`}
                      lang="bash"
                    />
                  </div>
                </div>
              </div>

              {/* Response */}
              <AnimatePresence mode="wait">
                {latestLog && latestLog.tool === activeTool && latestLog.action === activeAction && (
                  <motion.div
                    key={latestLog.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border overflow-hidden ${
                      latestLog.status === 'success' ? 'border-green-700/40 bg-green-950/10'
                      : latestLog.status === 'error'  ? 'border-red-700/40 bg-red-950/10'
                      : 'border-yellow-700/40 bg-yellow-950/10'
                    }`}
                  >
                    <div className="px-4 py-3 border-b border-gray-700/30 flex items-center gap-3 flex-wrap">
                      <StatusDot status={latestLog.status} />
                      <span className="text-sm font-semibold text-white capitalize">{latestLog.status}</span>
                      {latestLog.duration !== undefined && (
                        <Badge label={`${latestLog.duration}ms`} color={latestLog.duration < 2000 ? 'green' : latestLog.duration < 5000 ? 'yellow' : 'red'} />
                      )}
                      <span className="text-xs text-gray-600 ml-auto font-mono">{latestLog.timestamp}</span>
                    </div>
                    <div className="p-4">
                      {latestLog.status === 'error' && !latestLog.output && (
                        <p className="text-red-300 text-sm mb-3 bg-red-950/20 rounded-lg px-3 py-2">
                          ⚠ {latestLog.error}
                        </p>
                      )}
                      {latestLog.output && (
                        <div className="space-y-3">
                          {/* Highlight key fields from response */}
                          {latestLog.status === 'success' && latestLog.output && typeof latestLog.output === 'object' && (latestLog.output as Record<string, unknown>).data && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {activeTool === 'aura' && activeAction === 'analyze_song' && (() => {
                                const d = (latestLog.output as Record<string, unknown>).data as Record<string, unknown>;
                                return [
                                  { label: 'Quality Score', value: `${d?.overallScore ?? '—'}/100`, color: 'green' },
                                  { label: 'Tempo', value: (d?.structure as Record<string, unknown>)?.tempo as string ?? '—', color: 'blue' },
                                  { label: 'Sentiment', value: (d?.lyrics as Record<string, unknown>)?.sentiment as string ?? '—', color: 'purple' },
                                  { label: 'Complexity', value: (d?.melody as Record<string, unknown>)?.complexity as string ?? '—', color: 'yellow' },
                                ].map(({ label, value, color }) => (
                                  <div key={label} className={`bg-gray-900/60 border border-gray-700/30 rounded-xl p-3 text-center`}>
                                    <p className="text-xs text-gray-500">{label}</p>
                                    <p className={`text-base font-bold text-${color}-400 mt-0.5`}>{value}</p>
                                  </div>
                                ));
                              })()}
                              {activeTool === 'aura' && activeAction === 'identify_hit_potential' && (() => {
                                const d = (latestLog.output as Record<string, unknown>).data as Record<string, unknown>;
                                return [
                                  { label: 'Hit Score', value: `${d?.hitScore ?? '—'}/100`, color: 'green' },
                                  { label: 'Verdict', value: d?.verdict as string ?? '—', color: d?.verdict === 'high' ? 'green' : d?.verdict === 'medium' ? 'yellow' : 'red' },
                                  { label: 'Confidence', value: `${Math.round(((d?.confidence as number) ?? 0) * 100)}%`, color: 'blue' },
                                  { label: 'Genre Trend', value: (d?.marketAnalysis as Record<string, unknown>)?.genreTrend as string ?? '—', color: 'purple' },
                                ].map(({ label, value, color }) => (
                                  <div key={label} className="bg-gray-900/60 border border-gray-700/30 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500">{label}</p>
                                    <p className={`text-base font-bold text-${color}-400 mt-0.5`}>{value}</p>
                                  </div>
                                ));
                              })()}
                              {activeTool === 'sentinel' && activeAction === 'analyze_code' && (() => {
                                const d = (latestLog.output as Record<string, unknown>).data as Record<string, unknown>;
                                const m = d?.metrics as Record<string, unknown> ?? {};
                                return [
                                  { label: 'Quality Score', value: `${d?.score ?? '—'}/100`, color: Number(d?.score) >= 70 ? 'green' : Number(d?.score) >= 40 ? 'yellow' : 'red' },
                                  { label: 'Errors', value: String((d?.errors as unknown[])?.length ?? 0), color: 'red' },
                                  { label: 'Warnings', value: String((d?.warnings as unknown[])?.length ?? 0), color: 'yellow' },
                                  { label: 'Complexity', value: String(m?.complexity ?? '—'), color: 'blue' },
                                ].map(({ label, value, color }) => (
                                  <div key={label} className="bg-gray-900/60 border border-gray-700/30 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500">{label}</p>
                                    <p className={`text-base font-bold text-${color}-400 mt-0.5`}>{value}</p>
                                  </div>
                                ));
                              })()}
                            </div>
                          )}
                          <JsonViewer data={latestLog.output} maxHeight="500px" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state */}
              {(!latestLog || latestLog.tool !== activeTool || latestLog.action !== activeAction) && !isLoading && (
                <div className="border border-dashed border-gray-700/40 rounded-2xl p-10 text-center">
                  <p className="text-3xl mb-3">{tool.icon}</p>
                  <p className="text-gray-400 text-sm font-medium">Response will appear here after you click ▶ Run</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Preset loaded for <code className="text-gray-500">{activeTool}.{activeAction}</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            DOCS
        ══════════════════════════════════════════════════════ */}
        {section === 'docs' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">API Reference</h2>
                <p className="text-gray-400 text-sm mt-1">Complete documentation for all HOLLY Tool Hub endpoints.</p>
              </div>
              <div className="flex gap-2">
                {(['master', 'aura', 'sentinel'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setDocsTool(t)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                      docsTool === t ? 'bg-violet-600 text-white' : 'bg-gray-800/60 text-gray-400 hover:text-white'
                    }`}
                  >
                    {t === 'master' ? '⚙ Hub' : t === 'aura' ? '🎵 AURA' : '⚡ Sentinel'}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Authentication (always shown) ── */}
            <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <span>🔐</span> Authentication
              </h3>
              <p className="text-gray-400 text-sm">All hub endpoints require one of these authentication methods:</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'Bearer Token', code: 'Authorization: Bearer holly_xxxx', note: 'Personal API key from /settings/api-keys', badge: 'Recommended' },
                  { label: 'X-API-Key Header', code: 'x-api-key: holly_xxxx', note: 'Alternative header format', badge: 'Supported' },
                  { label: 'Hub Master Key', code: 'x-hub-key: <HOLLY_HUB_API_KEY>', note: 'Set HOLLY_HUB_API_KEY in Vercel env — shared secret for server-to-server calls', badge: 'Production' },
                ].map(({ label, code, note, badge }) => (
                  <div key={label} className="bg-black/40 border border-gray-700/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{label}</span>
                      <Badge label={badge} color={badge === 'Recommended' ? 'green' : badge === 'Production' ? 'purple' : 'gray'} />
                    </div>
                    <code className="block text-xs text-green-300 bg-black/40 rounded-lg px-2 py-1.5 break-all">{code}</code>
                    <p className="text-xs text-gray-500">{note}</p>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3">
                <p className="text-xs text-yellow-300">
                  <strong>Dev bypass:</strong> In development only, pass <code className="bg-black/40 px-1 rounded">x-hub-key: hub_dev</code> to skip auth.
                  This is disabled in production automatically.
                </p>
              </div>
            </div>

            {/* ── Master Hub Docs ── */}
            {docsTool === 'master' && (
              <div className="space-y-6">
                <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <Badge label="GET" color="green" />
                    <Badge label="POST" color="orange" />
                    <code className="text-white font-mono">/api/hub</code>
                    <span className="text-gray-400 text-sm">— Unified master endpoint</span>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-white font-semibold">GET /api/hub</h4>
                    <p className="text-gray-400 text-sm">Returns the full hub directory: all tools, their actions, endpoint URLs, rate limits, and server metrics. No auth required.</p>
                    <CodeBlock code="curl https://holly.nexamusicgroup.com/api/hub" lang="bash" />
                  </div>

                  <hr className="border-gray-700/40" />

                  <div className="space-y-3">
                    <h4 className="text-white font-semibold">POST /api/hub — Master Router</h4>
                    <p className="text-gray-400 text-sm">
                      Route any action to any tool through a single endpoint. Useful when building integrations where the tool name
                      is dynamic. Internally identical to calling the direct tool endpoint.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div className="bg-black/40 border border-gray-700/30 rounded-lg p-3">
                        <span className="text-red-400 font-semibold block mb-1">Required</span>
                        <code className="text-blue-300">tool</code> <span className="text-gray-500">string — "aura" | "sentinel"</span><br />
                        <code className="text-blue-300">action</code> <span className="text-gray-500">string — any valid action ID</span><br />
                        <code className="text-blue-300">payload</code> <span className="text-gray-500">object — action-specific fields</span>
                      </div>
                      <div className="bg-black/40 border border-gray-700/30 rounded-lg p-3">
                        <span className="text-green-400 font-semibold block mb-1">Response</span>
                        <code className="text-blue-300">ok</code> <span className="text-gray-500">boolean</span><br />
                        <code className="text-blue-300">requestId</code> <span className="text-gray-500">string — for tracing</span><br />
                        <code className="text-blue-300">duration</code> <span className="text-gray-500">number — ms</span><br />
                        <code className="text-blue-300">data</code> <span className="text-gray-500">tool-specific output</span>
                      </div>
                      <div className="bg-black/40 border border-gray-700/30 rounded-lg p-3">
                        <span className="text-yellow-400 font-semibold block mb-1">Rate Headers</span>
                        <code className="text-blue-300">X-RateLimit-Remaining-RPM</code><br />
                        <code className="text-blue-300">X-RateLimit-Remaining-RPD</code><br />
                        <code className="text-blue-300">X-Request-Id</code>
                      </div>
                    </div>

                    <CodeBlock code={CURL_EXAMPLES['master.route']} lang="bash" />
                  </div>
                </div>

                {/* Error codes */}
                <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-white">Error Codes</h3>
                  <div className="overflow-hidden rounded-lg border border-gray-700/40">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-800/60">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-400">HTTP Status</th>
                          <th className="text-left px-3 py-2 text-gray-400">Code</th>
                          <th className="text-left px-3 py-2 text-gray-400">Meaning</th>
                          <th className="text-left px-3 py-2 text-gray-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/30">
                        {[
                          { status: '200', code: '—', meaning: 'Success', action: 'Check ok: true in response' },
                          { status: '400', code: 'MISSING_FIELDS', meaning: 'Missing required field', action: 'Check requiredFields in GET /api/hub/tool/action' },
                          { status: '401', code: '—', meaning: 'Auth failed', action: 'Check your API key format (holly_xxxx) or set HOLLY_HUB_API_KEY' },
                          { status: '404', code: 'TOOL_NOT_FOUND', meaning: 'Unknown tool', action: 'Valid tools: aura, sentinel' },
                          { status: '404', code: 'ACTION_NOT_FOUND', meaning: 'Unknown action', action: 'Check GET /api/hub/tool for valid action IDs' },
                          { status: '429', code: 'RATE_LIMITED', meaning: 'Rate limit exceeded', action: 'Check Retry-After header and back off' },
                          { status: '500', code: 'DISPATCH_ERROR', meaning: 'LLM or internal error', action: 'Retry with exponential backoff' },
                        ].map(row => (
                          <tr key={row.code + row.status} className="bg-black/20 hover:bg-black/40">
                            <td className="px-3 py-2 font-mono text-yellow-300">{row.status}</td>
                            <td className="px-3 py-2 font-mono text-red-300">{row.code}</td>
                            <td className="px-3 py-2 text-gray-400">{row.meaning}</td>
                            <td className="px-3 py-2 text-gray-500">{row.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Rate limits */}
                <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-white">Rate Limits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { tool: 'AURA', color: 'purple', rpm: 20, rpd: 200, note: 'Per user ID per minute / per day' },
                      { tool: 'Sentinel', color: 'blue', rpm: 30, rpd: 300, note: 'Per user ID per minute / per day' },
                    ].map(({ tool, color, rpm, rpd, note }) => (
                      <div key={tool} className={`bg-${color}-900/20 border border-${color}-700/30 rounded-xl p-4`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`font-bold text-${color}-300`}>{tool}</span>
                          <Badge label={`${rpm} RPM / ${rpd} RPD`} color={color} />
                        </div>
                        <p className="text-xs text-gray-500">{note}</p>
                        <div className="mt-2 text-xs text-gray-600">
                          Dev/master keys: unlimited • Rate limit headers returned on every response
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── AURA Docs ── */}
            {docsTool === 'aura' && (
              <div className="space-y-6">
                <div className="bg-purple-900/20 border border-purple-700/40 rounded-2xl p-5 flex items-start gap-4">
                  <span className="text-3xl">🎵</span>
                  <div>
                    <h3 className="font-bold text-white text-lg">AURA — A&R Intelligence Engine</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      AI-powered music analysis platform. Analyzes songs with the precision of a data-driven A&R executive,
                      generates specific improvement recommendations, and scores commercial hit potential using market trend modeling.
                    </p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Badge label="3 actions" color="purple" />
                      <Badge label="20 RPM / 200 RPD" color="gray" />
                      <Badge label="Powered by Groq Llama-3.3 70B" color="gray" />
                    </div>
                  </div>
                </div>

                {AURA_ACTIONS.map(action => (
                  <div key={action.id} className="bg-gray-900/60 border border-gray-700/40 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedAction(expandedAction === `aura.${action.id}` ? null : `aura.${action.id}`)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge label="POST" color="orange" />
                        <code className="text-white font-mono">{action.endpoint}</code>
                        <span className="text-gray-500 text-sm hidden sm:block">{action.name}</span>
                      </div>
                      <span className="text-gray-500 ml-2">{expandedAction === `aura.${action.id}` ? '▲' : '▼'}</span>
                    </button>

                    {expandedAction === `aura.${action.id}` && (
                      <div className="px-6 pb-6 space-y-5 border-t border-gray-700/40">
                        <p className="text-gray-400 text-sm pt-4">{action.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-3">
                            <h4 className="text-white text-sm font-semibold">Request Fields</h4>
                            <FieldTable fields={action.fields} required={true} />
                            <FieldTable fields={action.fields} required={false} />
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-white text-sm font-semibold">Returns</h4>
                            <div className="bg-black/40 border border-gray-700/30 rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
                              {action.returns}
                            </div>
                            <h4 className="text-white text-sm font-semibold">Use Cases</h4>
                            <ul className="space-y-1">
                              {action.useCases.map(uc => (
                                <li key={uc} className="text-xs text-gray-500 flex items-start gap-2">
                                  <span className="text-purple-400 mt-0.5">→</span>{uc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-white text-sm font-semibold">cURL Example</h4>
                          <CodeBlock code={CURL_EXAMPLES[`aura.${action.id}`] ?? ''} lang="bash" />
                        </div>

                        <button
                          onClick={() => { selectAction('aura', action.id); setSection('playground'); }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-lg text-sm text-purple-300 transition-colors"
                        >
                          ▶ Try in Playground
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Sentinel Docs ── */}
            {docsTool === 'sentinel' && (
              <div className="space-y-6">
                <div className="bg-blue-900/20 border border-blue-700/40 rounded-2xl p-5 flex items-start gap-4">
                  <span className="text-3xl">⚡</span>
                  <div>
                    <h3 className="font-bold text-white text-lg">Sentinel — Code Intelligence Engine</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      AI-powered code analysis and generation. Analyzes code with the precision of a static analysis tool
                      combined with senior engineer insight. Generates production-ready code from plain English descriptions.
                    </p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Badge label="2 actions" color="blue" />
                      <Badge label="30 RPM / 300 RPD" color="gray" />
                      <Badge label="Powered by free LLM cascade" color="gray" />
                      <Badge label="20K char code limit" color="gray" />
                    </div>
                  </div>
                </div>

                {SENTINEL_ACTIONS.map(action => (
                  <div key={action.id} className="bg-gray-900/60 border border-gray-700/40 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedAction(expandedAction === `sentinel.${action.id}` ? null : `sentinel.${action.id}`)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge label="POST" color="orange" />
                        <code className="text-white font-mono">{action.endpoint}</code>
                        <span className="text-gray-500 text-sm hidden sm:block">{action.name}</span>
                      </div>
                      <span className="text-gray-500 ml-2">{expandedAction === `sentinel.${action.id}` ? '▲' : '▼'}</span>
                    </button>

                    {expandedAction === `sentinel.${action.id}` && (
                      <div className="px-6 pb-6 space-y-5 border-t border-gray-700/40">
                        <p className="text-gray-400 text-sm pt-4">{action.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-3">
                            <h4 className="text-white text-sm font-semibold">Request Fields</h4>
                            <FieldTable fields={action.fields} required={true} />
                            <FieldTable fields={action.fields} required={false} />
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-white text-sm font-semibold">Returns</h4>
                            <div className="bg-black/40 border border-gray-700/30 rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
                              {action.returns}
                            </div>
                            <h4 className="text-white text-sm font-semibold">Use Cases</h4>
                            <ul className="space-y-1">
                              {action.useCases.map(uc => (
                                <li key={uc} className="text-xs text-gray-500 flex items-start gap-2">
                                  <span className="text-blue-400 mt-0.5">→</span>{uc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-white text-sm font-semibold">cURL Example</h4>
                          <CodeBlock code={CURL_EXAMPLES[`sentinel.${action.id}`] ?? ''} lang="bash" />
                        </div>

                        <button
                          onClick={() => { selectAction('sentinel', action.id); setSection('playground'); }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg text-sm text-blue-300 transition-colors"
                        >
                          ▶ Try in Playground
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            LOGS
        ══════════════════════════════════════════════════════ */}
        {section === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">Request Logs</h2>
                <p className="text-gray-500 text-xs mt-0.5">Client-side history from this browser session</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge label={`${logs.length} total`} color="gray" />
                <Badge label={`${logs.filter(l => l.status === 'success').length} success`} color="green" />
                <Badge label={`${logs.filter(l => l.status === 'error').length} errors`} color="red" />
                {logs.length > 0 && (
                  <button
                    onClick={() => setLogs([])}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="border border-dashed border-gray-700/40 rounded-2xl p-16 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-gray-500">No requests yet. Use the Playground to make your first API call.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map(log => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-4 ${
                      log.status === 'success' ? 'border-green-800/40 bg-green-950/10'
                      : log.status === 'error' ? 'border-red-800/40 bg-red-950/10'
                      : 'border-yellow-800/40 bg-yellow-950/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <StatusDot status={log.status} />
                      <code className="text-sm text-white">{log.tool}.{log.action}</code>
                      {log.duration !== undefined && (
                        <Badge label={`${log.duration}ms`} color={log.duration < 2000 ? 'green' : log.duration < 5000 ? 'yellow' : 'red'} />
                      )}
                      <span className="text-xs text-gray-600 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      {log.error && <span className="text-xs text-red-400 ml-auto">⚠ {log.error}</span>}
                    </div>
                    {log.output && (
                      <div className="mt-3">
                        <JsonViewer data={log.output} maxHeight="250px" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            METRICS
        ══════════════════════════════════════════════════════ */}
        {section === 'metrics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">Performance Metrics</h2>
                <p className="text-gray-500 text-xs mt-0.5">Live stats from this server process (resets on redeploy)</p>
              </div>
              <button
                onClick={fetchMetrics}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                ↻ Refresh Server Metrics
              </button>
            </div>

            {/* Local session stats */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">This Session (Browser)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Requests', value: logs.length, color: 'text-white' },
                  { label: 'Success Rate', value: logs.length ? `${Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100)}%` : 'n/a', color: 'text-green-400' },
                  { label: 'AURA Calls', value: logs.filter(l => l.tool === 'aura').length, color: 'text-purple-400' },
                  { label: 'Sentinel Calls', value: logs.filter(l => l.tool === 'sentinel').length, color: 'text-blue-400' },
                  { label: 'Avg Duration', value: logs.length ? `${Math.round(logs.filter(l => l.duration).reduce((s, l) => s + (l.duration ?? 0), 0) / logs.filter(l => l.duration).length)}ms` : 'n/a', color: 'text-yellow-400' },
                  { label: 'Errors', value: logs.filter(l => l.status === 'error').length, color: 'text-red-400' },
                  { label: 'Fastest', value: logs.length ? `${Math.min(...logs.filter(l => l.duration).map(l => l.duration ?? 99999))}ms` : 'n/a', color: 'text-green-300' },
                  { label: 'Slowest', value: logs.length ? `${Math.max(...logs.filter(l => l.duration).map(l => l.duration ?? 0))}ms` : 'n/a', color: 'text-red-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-5">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Server-side metrics */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Server-side (All Users)</h3>
              {metrics ? (
                <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-6">
                  <JsonViewer data={metrics} maxHeight="600px" />
                </div>
              ) : (
                <div className="border border-dashed border-gray-700/40 rounded-2xl p-10 text-center">
                  <p className="text-gray-500 text-sm">Click ↻ Refresh above to load server-side metrics.</p>
                  <p className="text-gray-600 text-xs mt-1">Requires auth. Uses dev bypass in development.</p>
                </div>
              )}
            </div>

            {/* Endpoint overview */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Endpoint Map</h3>
              <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800/60">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-gray-400">Method</th>
                      <th className="text-left px-4 py-2.5 text-gray-400">Endpoint</th>
                      <th className="text-left px-4 py-2.5 text-gray-400">Tool</th>
                      <th className="text-left px-4 py-2.5 text-gray-400">Rate Limit</th>
                      <th className="text-left px-4 py-2.5 text-gray-400">Auth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {[
                      { method: 'GET',  endpoint: '/api/hub', tool: 'Hub', rl: '—', auth: 'None' },
                      { method: 'POST', endpoint: '/api/hub', tool: 'Hub (router)', rl: 'Per tool', auth: 'Required' },
                      { method: 'GET',  endpoint: '/api/hub/aura', tool: 'AURA', rl: '—', auth: 'None' },
                      { method: 'POST', endpoint: '/api/hub/aura/analyze_song', tool: 'AURA', rl: '20 RPM / 200 RPD', auth: 'Required' },
                      { method: 'POST', endpoint: '/api/hub/aura/generate_recommendations', tool: 'AURA', rl: '20 RPM / 200 RPD', auth: 'Required' },
                      { method: 'POST', endpoint: '/api/hub/aura/identify_hit_potential', tool: 'AURA', rl: '20 RPM / 200 RPD', auth: 'Required' },
                      { method: 'GET',  endpoint: '/api/hub/sentinel', tool: 'Sentinel', rl: '—', auth: 'None' },
                      { method: 'POST', endpoint: '/api/hub/sentinel/analyze_code', tool: 'Sentinel', rl: '30 RPM / 300 RPD', auth: 'Required' },
                      { method: 'POST', endpoint: '/api/hub/sentinel/generate_code', tool: 'Sentinel', rl: '30 RPM / 300 RPD', auth: 'Required' },
                      { method: 'GET',  endpoint: '/api/hub/logs', tool: 'Hub', rl: '—', auth: 'Required' },
                      { method: 'GET',  endpoint: '/api/hub/metrics', tool: 'Hub', rl: '—', auth: 'Required' },
                    ].map((row, i) => (
                      <tr key={i} className="bg-black/20 hover:bg-black/40">
                        <td className="px-4 py-2.5">
                          <Badge label={row.method} color={row.method === 'GET' ? 'green' : 'orange'} />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-gray-300">{row.endpoint}</td>
                        <td className="px-4 py-2.5 text-gray-400">{row.tool}</td>
                        <td className="px-4 py-2.5 text-gray-500">{row.rl}</td>
                        <td className="px-4 py-2.5">
                          <Badge label={row.auth} color={row.auth === 'Required' ? 'yellow' : 'gray'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
