'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useBuilderStore } from '@/lib/builder/store';
import { HollyAgentConsole } from './HollyAgentConsole';
import { WorkspaceFileExplorer } from './WorkspaceFileExplorer';
import { CodeEditorPane } from './CodeEditorPane';
import { PreviewPane } from './PreviewPane';
import { TerminalPanel } from './TerminalPanel';
import { BuildStatusBar } from './BuildStatusBar';
import { BuilderPromptBar } from './BuilderPromptBar';
import type { BuildEvent, BuildSession } from '@/lib/builder/store';
import {
  Globe, Smartphone, Github, ShoppingBag, Server, Layers,
  X, Sparkles, ChevronRight, ArrowRight, Zap,
} from 'lucide-react';

interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  badge?: string;
  prompt: string;
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'simple-web',
    title: 'Simple Website or Web App',
    description: 'Perfect for quick prototypes, landing pages, includes built-in database.',
    icon: <Globe className="w-6 h-6" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30 hover:border-blue-500/60',
    prompt: 'Create a simple website',
  },
  {
    id: 'native-app',
    title: 'Native App Development',
    description: 'Build native apps with Flutter. Preview on multiple devices.',
    icon: <Smartphone className="w-6 h-6" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30 hover:border-green-500/60',
    prompt: 'Create a Flutter native app',
  },
  {
    id: 'github-high-perf',
    title: 'Existing GitHub Project (High Performance)',
    description: 'Enhanced resources for Plus members. Connect your GitHub repository with increased CPU and memory for faster builds.',
    icon: <Github className="w-6 h-6" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30 hover:border-purple-500/60',
    badge: 'Beta',
    prompt: 'Clone and work on my GitHub repository',
  },
  {
    id: 'shopify',
    title: 'Shopify Development & Manager',
    description: 'Develop and optimize Shopify theme templates, manage Shopify stores.',
    icon: <ShoppingBag className="w-6 h-6" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
    prompt: 'Build a Shopify theme or manage my Shopify store',
  },
  {
    id: 'fullstack',
    title: 'Full-Stack Website App',
    description: 'Production-ready stack with auth, account management, backend, and database. Built with Hono framework on Node.js optimized for Cloudflare Pages.',
    icon: <Layers className="w-6 h-6" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30 hover:border-orange-500/60',
    prompt: 'Create a full-stack web application with auth and database',
  },
  {
    id: 'github-standard',
    title: 'Existing GitHub Project',
    description: 'Connect your GitHub repository for full development workflows. Specify your preferred frameworks, libraries, and implementation details.',
    icon: <Github className="w-6 h-6" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500/60',
    prompt: 'Connect to my GitHub repository and start developing',
  },
  {
    id: 'ssh-server',
    title: 'Bring Your Own SSH Server',
    description: 'Work on GitHub projects deployed on your own server via SSH.',
    icon: <Server className="w-6 h-6" />,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30 hover:border-rose-500/60',
    prompt: 'Connect to my SSH server and start building',
  },
];

export function BuilderWorkspace() {
  const {
    activeSession, activeSessionId, isStreaming,
    addEvent, setFileTree, setPreviewUrl, setIsStreaming,
    updateActiveSessionStatus, setActiveSession, setSessions,
    appendTerminal, sidebarCollapsed, toggleSidebar,
    rightPanelTab, setRightPanelTab, bottomPanelTab, setBottomPanelTab,
  } = useBuilderStore();

  const esRef = useRef<EventSource | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [sessions, setSessionsList] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/builder/session')
      .then(r => r.json())
      .then(d => {
        if (d.sessions) {
          setSessions(d.sessions);
          setSessionsList(d.sessions);
        }
      })
      .catch(() => {});
  }, [setSessions]);

  useEffect(() => {
    if (!activeSessionId) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }

    esRef.current?.close();
    setIsStreaming(true);

    const es = new EventSource(`/api/builder/stream/${activeSessionId}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: BuildEvent & { type: string; status?: string; phase?: string; progress?: number } = JSON.parse(e.data);

        if (event.type === 'state') {
          updateActiveSessionStatus(event.status as BuildSession['status'], event.phase as BuildSession['phase'], event.progress);
          if (event.previewUrl) { setPreviewUrl(event.previewUrl); setRightPanelTab('preview'); }
          return;
        }

        addEvent({ ...event, ts: event.ts ?? Date.now() });

        if (event.type === 'log' || event.type === 'cmd_start' || event.type === 'cmd_done') {
          appendTerminal(`[${event.type}] ${event.title}${event.body ? '\n' + event.body : ''}`);
        }
        if (event.type === 'phase' || event.type === 'progress') {
          updateActiveSessionStatus(
            activeSession?.status ?? 'building',
            event.phase as BuildSession['phase'],
            event.progress
          );
        }
        if (event.type === 'preview_ready' && event.previewUrl) {
          setPreviewUrl(event.previewUrl);
          setRightPanelTab('preview');
        }
        if (event.type === 'done' || event.type === 'error') {
          setIsStreaming(false);
          refreshFileTree(activeSessionId);
        }
        if (['file_created', 'file_deleted', 'file_renamed', 'tree_invalidated'].includes(event.type)) {
          refreshFileTree(activeSessionId);
        }
        if (event.type === 'file_updated' && event.filePath) {
          useBuilderStore.getState().markFileStale(event.filePath);
        }
        if (event.type === 'file_conflict' && event.filePath) {
          useBuilderStore.getState().markFileConflict(event.filePath, event.body);
        }
      } catch { /* parse error */ }
    };

    es.onerror = () => {
      setIsStreaming(false);
    };

    return () => { es.close(); setIsStreaming(false); };
  }, [activeSessionId]);

  const refreshFileTree = useCallback(async (sessionId: string) => {
    try {
      const r = await fetch(`/api/builder/files?sessionId=${sessionId}`);
      const d = await r.json();
      if (d.tree) setFileTree(d.tree);
    } catch { /* ignore */ }
  }, [setFileTree]);

  const handleStartProject = async (template: ProjectTemplate) => {
    try {
      const res = await fetch('/api/builder/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: template.prompt,
          templateId: template.id,
          title: template.title,
        }),
      });
      const data = await res.json();
      if (data.session) {
        setActiveSession(data.session);
        refreshFileTree(data.session.id);
        setShowNewProjectModal(false);
      }
    } catch (err) {
      console.error('[Builder] Failed to start project:', err);
    }
  };

  const handleContinueSession = (session: any) => {
    setActiveSession(session);
    refreshFileTree(session.id);
  };

  if (!activeSessionId && !showNewProjectModal) {
    return (
      <div className="flex flex-col h-screen bg-[#0d0d0f] text-gray-100">
        <BuildStatusBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-lg w-full mx-auto text-center px-6">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">HOLLY AI Builder</h1>
            <p className="text-gray-400 mb-8">Build anything from plain English. Full-stack apps, websites, native apps, and more.</p>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2 mx-auto"
            >
              <Zap className="w-5 h-5" />
              Start Building
            </button>

            {sessions.length > 0 && (
              <div className="mt-10 text-left">
                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Recent Projects</h3>
                <div className="space-y-2">
                  {sessions.slice(0, 5).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleContinueSession(s)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-purple-500/40 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{s.title || 'Untitled Project'}</p>
                        <p className="text-xs text-gray-600">{s.status} · {new Date(s.updatedAt || s.createdAt).toLocaleDateString()}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#13131A] border border-gray-800 rounded-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-white">Start a New Project</h2>
                <p className="text-sm text-gray-500 mt-0.5">Choose a starting point for your build</p>
              </div>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROJECT_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleStartProject(template)}
                    className={`flex items-start gap-4 p-4 rounded-xl border ${template.borderColor} ${template.bgColor} transition-all text-left group hover:shadow-lg`}
                  >
                    <div className={`p-2.5 rounded-xl ${template.bgColor} ${template.color} shrink-0`}>
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white">{template.title}</h3>
                        {template.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {template.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{template.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-screen bg-[#0d0d0f] text-gray-100 font-mono overflow-hidden">
        <BuildStatusBar />
        <BuilderPromptBar onSessionCreated={(s) => { setActiveSession(s); refreshFileTree(s.id); }} />

        <div className="flex flex-1 overflow-hidden">
          <div className={`${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80 min-w-[280px]'} flex flex-col border-r border-white/5 transition-all duration-200`}>
            <HollyAgentConsole />
          </div>

          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
              <div className="w-52 min-w-[180px] border-r border-white/5 overflow-y-auto">
                <WorkspaceFileExplorer />
              </div>
              <div className="flex-1 overflow-hidden">
                <CodeEditorPane />
              </div>
            </div>

            <div className="h-48 border-t border-white/5 flex flex-col">
              <div className="flex items-center gap-1 px-3 py-1 border-b border-white/5 bg-[#0d0d0f]">
                {(['terminal', 'problems', 'logs'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setBottomPanelTab(tab)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${bottomPanelTab === tab ? 'bg-purple-600/30 text-purple-300' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  {isStreaming && (
                    <span className="flex items-center gap-1 text-xs text-purple-400">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                      HOLLY building…
                    </span>
                  )}
                </div>
              </div>
              <TerminalPanel />
            </div>
          </div>

          <div className="w-[420px] min-w-[320px] flex flex-col border-l border-white/5">
            <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5">
              {(['preview', 'git'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightPanelTab(tab)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${rightPanelTab === tab ? 'bg-purple-600/30 text-purple-300' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {tab === 'preview' ? '🌐 Preview' : '⎇ Git'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              <PreviewPane />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
