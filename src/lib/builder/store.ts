/**
 * HOLLY AI Builder — Zustand Store
 * Extended with file-sync state (stale files, conflicts, dirty tracking)
 */
'use client';

import { create } from 'zustand';

export type BuildStatus = 'idle' | 'planning' | 'building' | 'running' | 'error' | 'done' | 'stopped';
export type BuildPhase = 'init' | 'inspect' | 'plan' | 'scaffold' | 'install' | 'build' | 'verify' | 'fix' | 'preview' | 'done' | 'error';

export interface BuildEvent {
  id?: string;
  type: string;
  sessionId?: string;
  phase?: string;
  title: string;
  body?: string;
  filePath?: string;
  command?: string;
  exitCode?: number;
  durationMs?: number;
  level?: 'info' | 'warn' | 'error' | 'success';
  progress?: number;
  previewUrl?: string;
  ts: number;
}

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  size?: number;
  language?: string;
}

export interface BuildSession {
  id: string;
  prompt: string;
  status: BuildStatus;
  phase: BuildPhase;
  progress: number;
  stack: string;
  projectType: string;
  previewUrl?: string;
  previewPort?: number;
  plan?: string;
  summary?: string;
  repoUrl?: string;
  branch?: string;
  createdAt: string;
}

/** Track per-file editor state */
export interface FileEditorState {
  content: string;         // last loaded content
  isDirty: boolean;        // user has unsaved changes
  isStale: boolean;        // HOLLY wrote a newer version
  hasConflict: boolean;    // HOLLY wants to overwrite dirty buffer
  conflictContent?: string; // what HOLLY wants to write
}

interface BuilderState {
  // Sessions
  sessions: BuildSession[];
  activeSessionId: string | null;
  activeSession: BuildSession | null;

  // Events feed
  events: BuildEvent[];

  // File system
  fileTree: FileNode[];
  openFiles: Map<string, string>; // path → content (current in editor)
  fileEditorState: Map<string, FileEditorState>; // path → sync state
  activeFilePath: string | null;

  // Terminal
  terminalHistory: string[];

  // UI state
  prompt: string;
  isStreaming: boolean;
  sidebarCollapsed: boolean;
  rightPanelTab: 'preview' | 'git' | 'github';
  bottomPanelTab: 'terminal' | 'problems' | 'logs';
  previewUrl: string | null;
  isPreviewLoading: boolean;

  // GitHub
  githubConnected: boolean;
  githubUsername: string | null;

  // Actions
  setPrompt: (p: string) => void;
  setActiveSession: (s: BuildSession | null) => void;
  setSessions: (s: BuildSession[]) => void;
  addEvent: (e: BuildEvent) => void;
  clearEvents: () => void;
  setFileTree: (t: FileNode[]) => void;
  openFile: (path: string, content: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileDirty: (path: string, dirty: boolean) => void;
  markFileStale: (path: string) => void;
  markFileConflict: (path: string, conflictContent?: string) => void;
  resolveConflict: (path: string, keepLocal: boolean) => void;
  appendTerminal: (line: string) => void;
  clearTerminal: () => void;
  setIsStreaming: (v: boolean) => void;
  toggleSidebar: () => void;
  setRightPanelTab: (t: 'preview' | 'git' | 'github') => void;
  setBottomPanelTab: (t: 'terminal' | 'problems' | 'logs') => void;
  setPreviewUrl: (url: string | null) => void;
  setPreviewLoading: (v: boolean) => void;
  updateActiveSessionStatus: (status: BuildStatus, phase?: BuildPhase, progress?: number) => void;
  setGithubConnected: (connected: boolean, username?: string) => void;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  activeSession: null,
  events: [],
  fileTree: [],
  openFiles: new Map(),
  fileEditorState: new Map(),
  activeFilePath: null,
  terminalHistory: [],
  prompt: '',
  isStreaming: false,
  sidebarCollapsed: false,
  rightPanelTab: 'preview',
  bottomPanelTab: 'terminal',
  previewUrl: null,
  isPreviewLoading: false,
  githubConnected: false,
  githubUsername: null,

  setPrompt: p => set({ prompt: p }),

  setActiveSession: s => set({
    activeSession: s, activeSessionId: s?.id ?? null,
    events: [], fileTree: [], openFiles: new Map(),
    fileEditorState: new Map(), activeFilePath: null,
    previewUrl: s?.previewUrl ?? null,
  }),

  setSessions: sessions => set({ sessions }),
  addEvent: e => set(state => ({ events: [...state.events.slice(-500), e] })),
  clearEvents: () => set({ events: [] }),
  setFileTree: fileTree => set({ fileTree }),

  openFile: (path, content) => set(state => {
    const files = new Map(state.openFiles);
    files.set(path, content);
    const editorState = new Map(state.fileEditorState);
    // Opening a file clears stale/conflict flags
    editorState.set(path, { content, isDirty: false, isStale: false, hasConflict: false });
    return { openFiles: files, activeFilePath: path, fileEditorState: editorState };
  }),

  closeFile: path => set(state => {
    const files = new Map(state.openFiles);
    files.delete(path);
    const editorState = new Map(state.fileEditorState);
    editorState.delete(path);
    const keys = [...files.keys()];
    return {
      openFiles: files,
      fileEditorState: editorState,
      activeFilePath: state.activeFilePath === path ? (keys[keys.length - 1] ?? null) : state.activeFilePath,
    };
  }),

  setActiveFile: path => set({ activeFilePath: path }),

  updateFileContent: (path, content) => set(state => {
    const files = new Map(state.openFiles);
    files.set(path, content);
    const editorState = new Map(state.fileEditorState);
    const existing = editorState.get(path) ?? { content, isDirty: false, isStale: false, hasConflict: false };
    editorState.set(path, { ...existing, content, isDirty: true });
    return { openFiles: files, fileEditorState: editorState };
  }),

  markFileDirty: (path, dirty) => set(state => {
    const editorState = new Map(state.fileEditorState);
    const existing = editorState.get(path);
    if (existing) editorState.set(path, { ...existing, isDirty: dirty });
    return { fileEditorState: editorState };
  }),

  markFileStale: (path) => set(state => {
    const editorState = new Map(state.fileEditorState);
    const existing = editorState.get(path);
    if (!existing) {
      // File not open — no action needed, tree refresh handles it
      return {};
    }
    if (existing.isDirty) {
      // Buffer is dirty — raise conflict instead of overwriting
      editorState.set(path, { ...existing, hasConflict: true });
    } else {
      // Buffer is clean — mark stale so Monaco can reload
      editorState.set(path, { ...existing, isStale: true });
    }
    return { fileEditorState: editorState };
  }),

  markFileConflict: (path, conflictContent) => set(state => {
    const editorState = new Map(state.fileEditorState);
    const existing = editorState.get(path);
    if (existing) {
      editorState.set(path, { ...existing, hasConflict: true, conflictContent });
    }
    return { fileEditorState: editorState };
  }),

  resolveConflict: (path, keepLocal) => set(state => {
    const editorState = new Map(state.fileEditorState);
    const existing = editorState.get(path);
    if (!existing) return {};
    if (keepLocal) {
      // Keep local — clear conflict flags
      editorState.set(path, { ...existing, hasConflict: false, conflictContent: undefined });
    } else {
      // Accept HOLLY's version — reload from conflict content
      const files = new Map(state.openFiles);
      if (existing.conflictContent) files.set(path, existing.conflictContent);
      editorState.set(path, {
        content: existing.conflictContent ?? existing.content,
        isDirty: false, isStale: false, hasConflict: false,
      });
      return { openFiles: files, fileEditorState: editorState };
    }
    return { fileEditorState: editorState };
  }),

  appendTerminal: line => set(state => ({ terminalHistory: [...state.terminalHistory.slice(-2000), line] })),
  clearTerminal: () => set({ terminalHistory: [] }),
  setIsStreaming: isStreaming => set({ isStreaming }),
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setRightPanelTab: rightPanelTab => set({ rightPanelTab }),
  setBottomPanelTab: bottomPanelTab => set({ bottomPanelTab }),
  setPreviewUrl: previewUrl => set({ previewUrl }),
  setPreviewLoading: isPreviewLoading => set({ isPreviewLoading }),

  updateActiveSessionStatus: (status, phase, progress) => set(state => {
    if (!state.activeSession) return {};
    return {
      activeSession: {
        ...state.activeSession,
        status,
        phase: phase ?? state.activeSession.phase,
        progress: progress ?? state.activeSession.progress,
      },
    };
  }),

  setGithubConnected: (connected, username) => set({ githubConnected: connected, githubUsername: username ?? null }),
}));
