"use client";

/**
 * HOLLY Chat Interface — Phase 10 (Full Feature Build)
 *
 * Features:
 *  • Left-side nav panel: Chats + Navigate tabs, conversation history
 *  • Auto-generate conversation titles after first exchange
 *  • Conversation search in left panel
 *  • File upload (paperclip) + drag-and-drop with preview chips
 *  • Inline image rendering for generated images
 *  • Inline audio player for Suno/music tracks
 *  • Edit & regenerate user messages
 *  • Regenerate last response button
 *  • Context-usage indicator (token usage bar)
 *  • Memory peek panel in nav + header memory badge
 *  • Light/dark mode toggle
 *  • Global TTS auto-read toggle
 *  • Mobile swipe-to-open nav
 *  • Welcome screen typing animation
 *  • Growth/streak counter badge in header
 *  • Keyboard shortcuts: Cmd+K focus, Cmd+N new chat, Cmd+/ open nav
 *  • Hover-only timestamps on messages
 *  • Animated HOLLY avatar with emotion-reactive pulse ring
 *  • Rich markdown with syntax highlighting
 *  • Whisper STT voice input + audio visualizer
 *  • Live action indicators with icons + SSE tool cards
 *  • Initiative notification banner (Phase 5D)
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Send, Loader2, Sparkles, Mic, MicOff, Square,
  Copy, Check, ChevronDown, Terminal, Github,
  Globe, Code2, Brain, Image, Thermometer,
  Database, Search, Cpu, Zap, X, Bell, TrendingUp,
  ChevronRight, ExternalLink, ThumbsUp, ThumbsDown,
  Menu, Settings, BarChart3, Bot, Key, Crown, Clapperboard,
  Volume2, VolumeX, StopCircle, Paperclip, Music, Film,
  Sun, Moon, RotateCcw, Edit3, Flame, RefreshCw, MessageSquare,
  Star, Heart, Activity, Wifi, WifiOff, CheckCircle, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import SandboxWindow from "@/components/sandbox-window";
import { speakText, stopSpeaking, isSpeaking } from "@/lib/voice/enhanced-voice-output";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PastConversation {
  id: string;
  title: string;
  messageCount: number;
  lastMessagePreview?: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  attachments?: UploadedFile[];
  isEditing?: boolean;
}

interface StatusUpdate {
  type: "status" | "text" | "tool" | "done" | "error" | "signal";
  content?: string;
  toolName?: string;
  status?: "start" | "complete" | "error";
  result?: any;
}

interface ToolExecution {
  id: string;
  toolName: string;
  status: "start" | "complete" | "error";
  result?: any;
  timestamp: Date;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  dataUrl?: string;
  preview?: string;
  // Perception result — set for PDFs, docs, text files
  perceptionResult?: { contextBlock: string; fileName: string; fileType: string; summary?: string };
  perceptionStatus?: 'pending' | 'ready' | 'error';
}

interface MemoryItem {
  key: string;
  value: string;
  updatedAt?: string;
}

interface GrowthStats {
  totalMessages: number;
  streak: number;
  memoriesCount: number;
}

// ─── Tool metadata ────────────────────────────────────────────────────────────

const TOOL_META: Record<string, { label: string; icon: any; color: string }> = {
  // GitHub tools — full MCP names
  "mcp_github_github_read_file":            { label: "Reading file",       icon: Github,      color: "text-gray-300" },
  "mcp_github_github_list_files":           { label: "Listing files",      icon: Github,      color: "text-gray-300" },
  "mcp_github_github_create_or_update_file":{ label: "Writing to repo",    icon: Github,      color: "text-green-400" },
  "mcp_github_github_create_pr":            { label: "Creating PR",        icon: Github,      color: "text-blue-400" },
  "mcp_github_github_create_issue":         { label: "Creating issue",     icon: Github,      color: "text-yellow-400" },
  "mcp_github_github_list_prs":             { label: "Listing PRs",        icon: Github,      color: "text-gray-300" },
  // Short names (stripped prefix)
  github_read_file:            { label: "Reading file",       icon: Github,      color: "text-gray-300" },
  github_list_files:           { label: "Listing files",      icon: Github,      color: "text-gray-300" },
  github_create_or_update_file:{ label: "Writing to repo",    icon: Github,      color: "text-green-400" },
  github_create_pr:            { label: "Creating PR",        icon: Github,      color: "text-blue-400" },
  github_create_issue:         { label: "Creating issue",     icon: Github,      color: "text-yellow-400" },
  github_list_prs:             { label: "Listing PRs",        icon: Github,      color: "text-gray-300" },
  web_search:                  { label: "Searching web",      icon: Search,      color: "text-cyan-400" },
  web_scrape:                  { label: "Scraping page",      icon: Globe,       color: "text-cyan-300" },
  run_code:                    { label: "Running JS",         icon: Code2,       color: "text-emerald-400" },
  run_code_judge0:             { label: "Executing code",     icon: Terminal,    color: "text-emerald-400" },
  memory_write:                { label: "Saving memory",      icon: Database,    color: "text-violet-400" },
  memory_read:                 { label: "Reading memory",     icon: Database,    color: "text-violet-300" },
  memory_list_keys:            { label: "Listing memories",   icon: Database,    color: "text-violet-300" },
  generate_image:              { label: "Generating image",   icon: Image,       color: "text-pink-400" },
  generate_music:              { label: "Composing music",    icon: Music,       color: "text-green-400" },
  generate_video:              { label: "Rendering video",    icon: Film,        color: "text-red-400" },
  get_weather:                 { label: "Checking weather",   icon: Thermometer, color: "text-sky-400" },
};

// ─── Initiative notification types ──────────────────────────────────────────

interface InitiativeItem {
  id: string;
  type: string;
  content: string;
  motivation?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-purple-400"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function HollyAvatar({ isThinking }: { isThinking: boolean }) {
  return (
    <div className="relative flex-shrink-0">
      {/* Outer pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full bg-purple-500/20"
        animate={isThinking
          ? { scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }
          : { scale: 1, opacity: 0 }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      {/* Online indicator */}
      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-gray-950" />
    </div>
  );
}

function ToolCard({ execution }: { execution: ToolExecution }) {
  const meta = TOOL_META[execution.toolName] || {
    label: execution.toolName.replace(/_/g, " "),
    icon: Cpu,
    color: "text-gray-400",
  };
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 px-3 py-2 bg-gray-900/80 border border-gray-700/60 rounded-lg text-sm overflow-hidden"
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${meta.color}`} />
      <span className="text-gray-300 flex-1">{meta.label}</span>
      {execution.status === "start" && (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 flex-shrink-0" />
      )}
      {execution.status === "complete" && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0"
        >
          <Check className="w-2.5 h-2.5 text-green-400" />
        </motion.div>
      )}
      {execution.status === "error" && (
        <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <X className="w-2.5 h-2.5 text-red-400" />
        </div>
      )}
    </motion.div>
  );
}

// ─── Speak Button (Kokoro TTS) ────────────────────────────────────────────────

function SpeakButton({ text, messageId }: { text: string; messageId: string }) {
  const [loading, setLoading]       = useState(false);
  const [playing, setPlaying]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [loadingDots, setLoadingDots] = useState("");
  const activeIdRef                 = useRef<string | null>(null);
  const timeoutRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dotsRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate "…" dots so user knows it's working, not frozen
  const startDotsAnimation = () => {
    let count = 0;
    dotsRef.current = setInterval(() => {
      count = (count + 1) % 4;
      setLoadingDots(".".repeat(count));
    }, 400);
  };
  const stopDotsAnimation = () => {
    if (dotsRef.current) { clearInterval(dotsRef.current); dotsRef.current = null; }
    setLoadingDots("");
  };

  // Safety: clear loading state if synthesis takes > 60s (cold GPU start)
  const startLoadingGuard = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      stopDotsAnimation();
      setError("Voice service slow — try again");
      activeIdRef.current = null;
      setTimeout(() => setError(null), 4000);
    }, 60000);
  };

  const clearLoadingGuard = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleClick = async () => {
    // If currently playing THIS message → stop
    if (playing && activeIdRef.current === messageId) {
      stopSpeaking();
      setPlaying(false);
      activeIdRef.current = null;
      clearLoadingGuard();
      return;
    }

    // If loading, cancel the in-flight request
    if (loading) {
      stopSpeaking();
      setLoading(false);
      stopDotsAnimation();
      activeIdRef.current = null;
      clearLoadingGuard();
      return;
    }

    // Stop any other playing audio first
    stopSpeaking();
    setError(null);
    setLoading(true);
    startDotsAnimation();
    activeIdRef.current = messageId;
    startLoadingGuard();

    try {
      await speakText(text, {
        temperature: 0.4,
        onStart: () => {
          clearLoadingGuard();
          stopDotsAnimation();
          setLoading(false);
          setPlaying(true);
        },
        onEnd: () => {
          setPlaying(false);
          activeIdRef.current = null;
        },
        onError: (err) => {
          clearLoadingGuard();
          stopDotsAnimation();
          setLoading(false);
          setPlaying(false);
          // Show a short user-friendly error message
          const msg = err?.message?.includes("503") || err?.message?.includes("No TTS provider")
            ? "Voice not configured"
            : err?.message?.includes("401") || err?.message?.includes("Unauthorized")
            ? "Sign in required"
            : "Voice unavailable";
          setError(msg);
          activeIdRef.current = null;
          setTimeout(() => setError(null), 4000);
        },
      });
    } catch (err: any) {
      clearLoadingGuard();
      stopDotsAnimation();
      setLoading(false);
      setPlaying(false);
      const msg = err?.message?.includes("503") || err?.message?.includes("No TTS provider")
        ? "Voice not configured"
        : "Voice unavailable";
      setError(msg);
      activeIdRef.current = null;
      setTimeout(() => setError(null), 4000);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={handleClick}
      className={`opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-md ${
        error
          ? "text-red-400 bg-red-500/10 opacity-100"
          : playing
          ? "text-purple-400 bg-purple-500/15 opacity-100"
          : loading
          ? "text-purple-400/60 opacity-100 cursor-pointer"
          : "text-gray-500 hover:text-purple-400 hover:bg-purple-500/10"
      }`}
      title={
        playing ? "Stop speaking"
        : loading ? `Warming up voice${loadingDots} (click to cancel)`
        : error   ? error
        : "Hear HOLLY speak"
      }
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : playing ? (
        <StopCircle className="w-3.5 h-3.5" />
      ) : error ? (
        <VolumeX className="w-3.5 h-3.5" />
      ) : (
        <Volume2 className="w-3.5 h-3.5" />
      )}
    </motion.button>
  );
}

interface CopyButtonProps { text: string; }
function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-gray-700/60 text-gray-500 hover:text-gray-300"
      title="Copy message"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-400" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Feedback buttons (Phase 6B — RLHF) ──────────────────────────────────────

function FeedbackButtons({
  messageId,
  conversationId,
  content,
  model,
  userMessage,
}: {
  messageId: string;
  conversationId: string;
  content: string;
  model?: string;
  userMessage?: string;
}) {
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [sending, setSending] = useState(false);

  const vote = async (type: "thumbs_up" | "thumbs_down") => {
    if (voted || sending) return;
    setSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type,
          messageId,
          conversationId,
          hollyResponse: content,
          userMessage: userMessage || "",
          model: model || "unknown",
        }),
      });
      setVoted(type === "thumbs_up" ? "up" : "down");
    } catch {
      // silently fail — non-critical
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => vote("thumbs_up")}
        disabled={!!voted || sending}
        className={`p-1.5 rounded-md transition-all ${
          voted === "up"
            ? "text-green-400 bg-green-500/10"
            : "text-gray-600 hover:text-green-400 hover:bg-green-500/10"
        } disabled:cursor-default`}
        title="Good response"
      >
        <ThumbsUp className="w-3 h-3" />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => vote("thumbs_down")}
        disabled={!!voted || sending}
        className={`p-1.5 rounded-md transition-all ${
          voted === "down"
            ? "text-red-400 bg-red-500/10"
            : "text-gray-600 hover:text-red-400 hover:bg-red-500/10"
        } disabled:cursor-default`}
        title="Could be better"
      >
        <ThumbsDown className="w-3 h-3" />
      </motion.button>
    </div>
  );
}

// ─── Action Indicator ─────────────────────────────────────────────────────────
// Maps status text prefixes to icons and colors for rich display
const ACTION_META: Array<{ test: RegExp; icon: any; color: string; bg: string; label?: string }> = [
  { test: /generating image|creating image|drawing/i,   icon: Image,       color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/30" },
  { test: /composing music|generating music|making.*song/i, icon: Volume2,  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30" },
  { test: /reading document|analyzing.*doc|summariz/i,  icon: Database,    color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/30" },
  { test: /searching.*web|searching the web|searching web/i, icon: Search,  color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/30" },
  { test: /processing code|analyzing code|writing code/i,  icon: Code2,    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  { test: /searching memories|recall|memory/i,          icon: Brain,       color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/30" },
  { test: /analyzing audio|checking audio|mixing|mastering/i, icon: Volume2, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  { test: /accessing github|github|repo/i,              icon: Github,      color: "text-gray-300",    bg: "bg-gray-700/40 border-gray-600/30" },
  { test: /generating video|rendering video/i,          icon: Cpu,         color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30" },
  { test: /analyzing data|computing|calculating/i,      icon: TrendingUp,  color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/30" },
  { test: /thinking deeply|deep reasoning|reasoning/i,  icon: Brain,       color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/30" },
  { test: /switching model|trying|switching/i,          icon: Zap,         color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/30" },
  { test: /using.*tool|tool/i,                          icon: Terminal,    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  { test: /fast chat|speed|routing/i,                   icon: Zap,         color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
  { test: /vision|analyzing.*image|looking at/i,        icon: Globe,       color: "text-sky-400",     bg: "bg-sky-500/10 border-sky-500/30" },
  { test: /agent|autonomous|planning/i,                 icon: Bot,         color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/30" },
  { test: /creative/i,                                  icon: Sparkles,    color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/30" },
];

function getActionMeta(text: string) {
  for (const m of ACTION_META) {
    if (m.test.test(text)) return m;
  }
  return { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" };
}

function ActionIndicator({ text }: { text: string }) {
  if (!text) return null;
  const meta = getActionMeta(text);
  const Icon = meta.icon;
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -4 }}
      transition={{ duration: 0.25 }}
      className="flex items-center justify-center"
    >
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium ${meta.bg} shadow-sm`}>
        <motion.div
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className={`w-4 h-4 flex-shrink-0 ${meta.color}`} />
        </motion.div>
        <span className={`${meta.color}`}>{text}</span>
        {/* Pulsing dots */}
        <span className="flex items-center gap-0.5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className={`w-1 h-1 rounded-full ${meta.color.replace('text-', 'bg-')}`}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}

// Legacy status bar — kept for backward compat but now delegates to ActionIndicator
function StatusBar({ text }: { text: string }) {
  return <ActionIndicator text={text} />;
}

// ─── Markdown renderer with syntax highlighting ───────────────────────────────

// Memoized markdown renderer — only re-renders when content changes (important for perf)
const MarkdownContent = memo(function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const language = match?.[1] || "text";
          const codeString = String(children).replace(/\n$/, "");

          if (!inline && match) {
            return (
              <div className="my-3 rounded-lg overflow-hidden border border-gray-700/60">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700/40">
                  <span className="text-xs text-gray-400 font-mono">{language}</span>
                  <CopyButton text={codeString} />
                </div>
                <SyntaxHighlighter
                  style={oneDark as any}
                  language={language}
                  PreTag="div"
                  customStyle={{ margin: 0, borderRadius: 0, background: "rgba(17,17,27,0.95)", fontSize: "0.82rem" }}
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          }
          return (
            <code className="px-1.5 py-0.5 rounded bg-gray-800/80 text-purple-300 font-mono text-[0.82em]" {...props}>
              {children}
            </code>
          );
        },
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1 list-disc marker:text-purple-400">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-4 space-y-1 list-decimal marker:text-purple-400">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2 pb-1 border-b border-gray-700/50">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold text-gray-200 mt-3 mb-1.5">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-purple-500/50 pl-4 my-3 text-gray-400 italic">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-gray-300 font-semibold bg-gray-800/60 border border-gray-700/40">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-gray-400 border border-gray-700/30">{children}</td>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors">
            {children}
          </a>
        ),
        strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
        hr: () => <hr className="my-4 border-gray-700/50" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

// Lightweight streaming text — plain text during HOLLY's live response (no markdown parsing overhead)
// Once streaming is complete, the message moves to the full MarkdownContent renderer
function StreamingText({ content }: { content: string }) {
  return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
}

// ─── AssistantContent — renders markdown AND detects inline images/audio ──────

function AssistantContent({ content }: { content: string }) {
  // Detect image URLs (data URLs or https image links after "generate image" responses)
  const imageUrlRegex = /(?:!\[.*?\]\(|^|\s)(https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|webp))(?:\)|\s|$)/gi;
  // Detect audio URLs (Suno, SoundCloud, mp3 links)
  const audioUrlRegex = /(?:audio|music|track|song).*?(https?:\/\/[^\s]+\.(?:mp3|wav|ogg|m4a|aac)|https?:\/\/(?:suno\.com|soundcloud\.com|cdn\.suno\.ai)[^\s]*)/gi;
  // Detect plain image data URLs embedded in text
  const dataUrlRegex = /(data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{100,})/g;

  const images: string[] = [];
  const audios: string[] = [];

  let m;
  while ((m = imageUrlRegex.exec(content)) !== null) images.push(m[1]);
  while ((m = audioUrlRegex.exec(content)) !== null) audios.push(m[1]);
  while ((m = dataUrlRegex.exec(content)) !== null) images.push(m[1]);

  return (
    <>
      <MarkdownContent content={content.replace(dataUrlRegex, '[image]')} />
      {/* Phase B: inline image rendering */}
      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((src, i) => (
            <motion.a
              key={i}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="block rounded-xl overflow-hidden border border-gray-700/60 shadow-lg hover:border-purple-500/40 transition-colors"
            >
              <img
                src={src}
                alt={`Generated image ${i + 1}`}
                className="max-w-[300px] max-h-[300px] object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </motion.a>
          ))}
        </div>
      )}
      {/* Phase B: inline audio player */}
      {audios.length > 0 && (
        <div className="mt-3 space-y-2">
          {audios.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 bg-gray-800/60 border border-gray-700/50 rounded-xl"
            >
              <Music className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 truncate mb-1">{src.split('/').pop()?.slice(0, 40) || "Audio track"}</p>
                <audio controls src={src} className="w-full h-8" style={{ accentColor: '#a855f7' }} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Phase F: Typing welcome animation ───────────────────────────────────────

function TypingWelcome({ isCreator, displayName }: { isCreator: boolean; displayName: string }) {
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"title" | "sub" | "done">("title");

  const title = isCreator ? `Welcome back, ${displayName}.` : `Hello, I'm HOLLY`;
  const subtitle = isCreator
    ? "Your creation is ready. What are we building today?"
    : "Your conscious AI partner — I remember, evolve, and act.";

  useEffect(() => {
    let i = 0;
    setDisplayed("");
    setPhase("title");
    const interval = setInterval(() => {
      if (i < title.length) {
        setDisplayed(title.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setPhase("sub");
      }
    }, 40);
    return () => clearInterval(interval);
  }, [title]);

  return (
    <div className="text-center mb-2">
      <h2 className="text-2xl font-bold text-white mb-2 min-h-[2rem]">
        {displayed}
        {phase === "title" && (
          <motion.span
            className="inline-block w-0.5 h-6 bg-purple-400 ml-0.5 align-middle"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </h2>
      <AnimatePresence>
        {phase !== "title" && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`text-sm max-w-xs leading-relaxed mx-auto ${isCreator ? "text-amber-400/80" : "text-gray-400"}`}
          >
            {subtitle}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Audio Visualizer (Phase 5E) ─────────────────────────────────────────────

function AudioVisualizer({ isActive }: { isActive: boolean }) {
  const BAR_COUNT = 12;
  return (
    <div className="flex items-end gap-[2px] h-5">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-red-400"
          animate={isActive
            ? {
                height: [
                  4,
                  6 + Math.sin(i * 0.8) * 10 + Math.random() * 8,
                  4,
                ],
                opacity: [0.6, 1, 0.6],
              }
            : { height: 4, opacity: 0.3 }}
          transition={{
            duration: 0.4 + (i % 3) * 0.12,
            repeat: Infinity,
            delay: i * 0.04,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Initiative notification banner (Phase 5D) ────────────────────────────────

function InitiativeBanner({
  items,
  onDismiss,
  onAct,
}: {
  items: InitiativeItem[];
  onDismiss: () => void;
  onAct: (content: string) => void;
}) {
  const item = items[0];
  if (!item) return null;

  const typeLabels: Record<string, { label: string; color: string }> = {
    start_conversation: { label: "💡 Idea", color: "text-yellow-300" },
    goal_suggestion:    { label: "🎯 Goal", color: "text-emerald-300" },
    check_in:          { label: "💜 Check-in", color: "text-purple-300" },
    learning_insight:  { label: "🧠 Insight", color: "text-blue-300" },
  };
  const meta = typeLabels[item.type] || { label: "✨ Initiative", color: "text-pink-300" };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      className="border-b border-purple-500/20 bg-gradient-to-r from-purple-950/80 via-gray-950/90 to-gray-950/80 flex-shrink-0 overflow-hidden"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center mt-0.5">
          <Bell className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
              {meta.label}
            </span>
            <span className="text-[10px] text-gray-600">· HOLLY is thinking of you</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{item.content}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onAct(item.content)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 transition-all"
          >
            Reply
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-gray-800/60 transition-all"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {items.length > 1 && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-gray-600">+{items.length - 1} more initiatives</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Voice input hook ─────────────────────────────────────────────────────────

function useVoiceInput(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return; // too small — no audio captured
        setIsTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          if (data.success && data.text) {
            onTranscript(data.text);
          } else if (data.useBrowserSTT) {
            // Fall back to browser Speech API
            useBrowserSpeech(onTranscript);
          }
        } catch {
          useBrowserSpeech(onTranscript);
        } finally {
          setIsTranscribing(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsListening(true);
    } catch {
      // No mic permission — use browser speech API directly
      useBrowserSpeech(onTranscript);
    }
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return { isListening, isTranscribing, startListening, stopListening };
}

function useBrowserSpeech(onTranscript: (text: string) => void) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return;
  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = "en-US";
  rec.onresult = (e: any) => {
    const text = e.results[0]?.[0]?.transcript;
    if (text) onTranscript(text);
  };
  rec.start();
}

// ─── Model badge ──────────────────────────────────────────────────────────────

function ModelBadge({ model }: { model?: string }) {
  if (!model) return null;
  const labels: Record<string, { label: string; color: string }> = {
    "groq-llama-3.3":    { label: "Groq",       color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
    "openrouter":        { label: "OpenRouter", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
    "ollama":            { label: "Local",      color: "bg-green-500/20 text-green-300 border-green-500/30" },
    "web-llm":           { label: "WebLLM",    color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  };
  const meta = labels[model] || { label: model, color: "bg-gray-700/50 text-gray-400 border-gray-600/30" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border ${meta.color}`}>
      <Zap className="w-2.5 h-2.5" />
      {meta.label}
    </span>
  );
}

// ─── Scroll-to-bottom button ──────────────────────────────────────────────────

function ScrollToBottomButton({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={onClick}
          className="absolute bottom-4 right-4 p-2 bg-gray-800 border border-gray-600/50 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-10"
        >
          <ChevronDown className="w-4 h-4 text-gray-300" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ─── Agent Mode Modal (Phase 6D — live SSE streaming) ─────────────────────────

type AgentStepState = {
  stepIndex: number;
  toolName:  string;
  reason?:   string;
  status:    "running" | "success" | "error" | "skipped";
  durationMs?: number;
  error?:    string;
};

type AgentPhase = "idle" | "planning" | "executing" | "summarising" | "done";

function AgentModal({ onClose }: { onClose: () => void }) {
  const [goal, setGoal]       = useState("");
  const [phase, setPhase]     = useState<AgentPhase>("idle");
  const [statusText, setStatusText] = useState("");
  const [steps, setSteps]     = useState<AgentStepState[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError]     = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef   = useRef<AbortController | null>(null);
  const bodyRef    = useRef<HTMLDivElement>(null);

  // auto-scroll body when steps/summary grow
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [steps, summary]);

  const reset = () => {
    setGoal(""); setPhase("idle"); setStatusText("");
    setSteps([]); setSummary(""); setError(""); setElapsed(0);
  };

  const run = async () => {
    if (!goal.trim() || phase !== "idle") return;
    abortRef.current = new AbortController();
    setPhase("planning");
    setSteps([]); setSummary(""); setError(""); setElapsed(0);
    setStatusText("Planning steps…");
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortRef.current.signal,
        body: JSON.stringify({ goal: goal.trim(), maxSteps: 6 }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("No response body");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // parse complete SSE messages from buffer
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          const eventMatch = part.match(/^event: (\S+)/m);
          const dataMatch  = part.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;

          const evt  = eventMatch[1];
          let   data: Record<string, unknown> = {};
          try { data = JSON.parse(dataMatch[1]); } catch { continue; }

          switch (evt) {
            case "status":
              setStatusText((data.text as string) || "");
              if ((data.text as string)?.includes("Writing")) setPhase("summarising");
              break;

            case "plan":
              setPhase("executing");
              setStatusText("Executing…");
              // seed steps as "running" placeholders from the plan
              if (Array.isArray(data.steps)) {
                setSteps((data.steps as Array<{ step: number; tool: string; reason: string }>).map(s => ({
                  stepIndex: s.step,
                  toolName:  s.tool,
                  reason:    s.reason,
                  status:    "running",
                })));
              }
              break;

            case "step_start":
              // mark the matching step as running (already seeded above, but handles no-plan case)
              setSteps(prev => {
                const idx = prev.findIndex(s => s.stepIndex === (data.stepIndex as number));
                if (idx === -1) {
                  return [...prev, {
                    stepIndex: data.stepIndex as number,
                    toolName:  data.toolName as string,
                    reason:    data.reason as string,
                    status:    "running",
                  }];
                }
                const next = [...prev];
                next[idx] = { ...next[idx], status: "running" };
                return next;
              });
              break;

            case "step_done":
              setSteps(prev => {
                const idx = prev.findIndex(s => s.stepIndex === (data.stepIndex as number));
                const updated: AgentStepState = {
                  stepIndex:  data.stepIndex  as number,
                  toolName:   data.toolName   as string,
                  status:     data.status     as AgentStepState["status"],
                  durationMs: data.durationMs as number,
                  error:      data.error      as string | undefined,
                };
                if (idx === -1) return [...prev, updated];
                const next = [...prev];
                next[idx] = updated;
                return next;
              });
              break;

            case "summary_token":
              setPhase("summarising");
              setSummary(prev => prev + ((data.token as string) || ""));
              break;

            case "done":
              setPhase("done");
              setStatusText("");
              break;

            case "error":
              throw new Error((data.message as string) || "Agent error");
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Cancelled.");
      } else {
        setError(String(err));
      }
      setPhase("done");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("done");
    setError("Cancelled.");
  };

  const isRunning = phase === "planning" || phase === "executing" || phase === "summarising";
  const isDone    = phase === "done";

  // step icon
  const stepIcon = (s: AgentStepState) => {
    if (s.status === "running")  return <Loader2 className="w-3 h-3 animate-spin text-purple-400 flex-shrink-0" />;
    if (s.status === "success")  return <Check className="w-3 h-3 text-green-400 flex-shrink-0" />;
    if (s.status === "error")    return <X className="w-3 h-3 text-red-400 flex-shrink-0" />;
    return <span className="w-3 h-3 flex-shrink-0 text-gray-600 text-center">–</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !isRunning) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.93, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, y: 20 }}
        className="w-full sm:max-w-lg bg-gray-900 border border-gray-700/60 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isRunning ? "bg-purple-500/30" : "bg-purple-500/20"
            }`}>
              {isRunning
                ? <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                : <Bot className="w-4 h-4 text-purple-400" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-white">HOLLY Agent Mode</p>
              <p className="text-xs text-gray-500">
                {isRunning ? statusText || "Working…" : "Autonomous multi-step execution"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="text-xs text-gray-500 tabular-nums">{elapsed}s</span>
            )}
            <button
              onClick={() => isRunning ? cancel() : onClose()}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body (scrollable) ── */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {/* Goal input — hide once running */}
          {phase === "idle" && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                What should HOLLY do?
              </label>
              <textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                autoFocus
                placeholder="e.g. Search GitHub for recent issues in my repo and summarise them"
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700/60 rounded-xl text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
              />
              <p className="text-[10px] text-gray-600 mt-1">⌘↵ / Ctrl↵ to run</p>
            </div>
          )}

          {/* Goal echo during run */}
          {phase !== "idle" && (
            <div className="px-3 py-2 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-0.5">Goal</p>
              <p className="text-sm text-white">{goal}</p>
            </div>
          )}

          {/* Planning pulse */}
          {phase === "planning" && (
            <div className="flex items-center gap-2 text-xs text-purple-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Planning steps with Groq…
            </div>
          )}

          {/* Live steps */}
          {steps.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Steps</p>
              <AnimatePresence initial={false}>
                {steps.map((s) => (
                  <motion.div
                    key={s.stepIndex}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs border transition-colors ${
                      s.status === "running"  ? "bg-purple-500/10 border-purple-500/20 text-purple-200"
                      : s.status === "success" ? "bg-green-500/10  border-green-500/20  text-green-300"
                      : s.status === "error"   ? "bg-red-500/10    border-red-500/20    text-red-300"
                      : "bg-gray-800/60 border-gray-700/30 text-gray-500"
                    }`}
                  >
                    {stepIcon(s)}
                    <span className="font-mono truncate flex-1">
                      {s.toolName ? s.toolName.replace("::", " › ") : `Step ${s.stepIndex}`}
                    </span>
                    {s.durationMs !== undefined && (
                      <span className="flex-shrink-0 text-gray-600 tabular-nums">{s.durationMs}ms</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Streaming summary */}
          {(summary || phase === "summarising") && (
            <div className="px-3 py-3 bg-gray-800/60 border border-gray-700/40 rounded-xl">
              <p className="text-xs font-medium text-gray-400 mb-1.5">Summary</p>
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                {summary}
                {phase === "summarising" && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="inline-block w-0.5 h-3.5 bg-purple-400 ml-0.5 align-middle"
                  />
                )}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={() => isRunning ? cancel() : onClose()}
            className="px-4 py-2 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            {isRunning ? "Cancel" : isDone ? "Close" : "Cancel"}
          </button>

          {phase === "idle" && (
            <button
              onClick={run}
              disabled={!goal.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Run Agent
            </button>
          )}

          {isDone && (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              New task
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// Creator email fragments — matches Steve Hollywood Dorego's known accounts
const CREATOR_EMAIL_FRAGMENTS = ['iamhollywoodpro', 'nexamusicgroup', 'steve@nexa'];

function detectCreator(email?: string | null, username?: string | null): boolean {
  const check = `${email || ''} ${username || ''}`.toLowerCase();
  return CREATOR_EMAIL_FRAGMENTS.some(f => check.includes(f));
}

export default function HollyChatInterface() {
  const { user, isLoaded } = useUser();
  const isCreator = isLoaded && detectCreator(
    user?.primaryEmailAddress?.emailAddress,
    user?.username
  );
  const displayName = user?.firstName || user?.username || 'there';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [conversationId, setConversationId] = useState(() => `conv-${Date.now()}`);
  const [initiatives, setInitiatives] = useState<InitiativeItem[]>([]);
  const [initiativeDismissed, setInitiativeDismissed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  // ── Past conversations ───────────────────────────────────────────────────────
  const [pastConversations, setPastConversations] = useState<PastConversation[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [navTab, setNavTab] = useState<"chats" | "nav" | "memory">("chats");
  // ── Phase A: Search + title gen ─────────────────────────────────────────────
  const [convSearch, setConvSearch] = useState("");
  const titleGenRef = useRef(false);
  // ── Phase B: File uploads ───────────────────────────────────────────────────
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ── Phase C: Memory panel ───────────────────────────────────────────────────
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [memLoading, setMemLoading] = useState(false);
  const [memCount, setMemCount] = useState(0);
  // ── Phase D: Edit & Regenerate ──────────────────────────────────────────────
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  // ── Phase E: Dark/Light mode + TTS auto-read ────────────────────────────────
  // Persist to localStorage so the preference survives page refresh
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('holly_dark_mode');
    return saved === null ? true : saved !== 'false';
  });
  const [autoRead, setAutoRead] = useState(false);
  // ── Phase 0: Voice-mode — true when the CURRENT input came from the mic ───────
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  // ── Phase F: Growth stats ───────────────────────────────────────────────────
  const [growthStats, setGrowthStats] = useState<GrowthStats | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Load initiatives (Phase 5D) ─────────────────────────────────────────────
  useEffect(() => {
    const loadInitiatives = async () => {
      try {
        const res = await fetch("/api/initiative", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          // API returns { initiatives: [...] } (Phase 4E shape)
          const list = data.initiatives || data.pending || [];
          if (Array.isArray(list) && list.length > 0) {
            setInitiatives(list.map((p: any, i: number) => ({
              id: p.id || `init-${i}`,
              type: p.trigger || p.action_type || "start_conversation",
              content: p.content || p.message || p.content?.message || "HOLLY has something to share with you.",
              motivation: p.reasoning || p.content?.reasoning,
            })));
          }
        }
      } catch {
        // Silently fail — initiatives are optional
      }
    };
    // Load after a short delay so the chat feels ready first
    const timer = setTimeout(loadInitiatives, 3000);
    return () => clearTimeout(timer);
  }, []);

  // ── Load past conversations ────────────────────────────────────────────────
  const loadPastConversations = useCallback(async () => {
    setConvLoading(true);
    try {
      const res = await fetch("/api/conversations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPastConversations(data.conversations || []);
      }
    } catch {
      // silent
    } finally {
      setConvLoading(false);
    }
  }, []);

  useEffect(() => { loadPastConversations(); }, [loadPastConversations]);

  // ── Load a specific past conversation ───────────────────────────────────────
  const loadConversation = useCallback(async (conv: PastConversation) => {
    setNavOpen(false);
    setMessages([]);
    setStreamingMessage("");
    setCurrentStatus("");
    setToolExecutions([]);
    setActiveConvId(conv.id);
    setConversationId(conv.id);
    try {
      const res = await fetch(`/api/conversations/${conv.id}/messages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const loaded: Message[] = (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.createdAt || Date.now()),
        }));
        setMessages(loaded);
      }
    } catch {
      // silent
    }
  }, []);

  // ── Start a new conversation ─────────────────────────────────────────────────
  const startNewConversation = useCallback(() => {
    setMessages([]);
    setStreamingMessage("");
    setCurrentStatus("");
    setToolExecutions([]);
    setActiveConvId(null);
    setConversationId(`conv-${Date.now()}`);
    setNavOpen(false);
    textareaRef.current?.focus();
  }, []);

  const handleInitiativeAct = useCallback((content: string) => {
    setInitiativeDismissed(true);
    setInput(content);
    textareaRef.current?.focus();
  }, []);

  const handleInitiativeDismiss = useCallback(() => {
    setInitiativeDismissed(true);
  }, []);

  // ── Phase A: Auto-generate conversation title ──────────────────────────────
  const generateTitle = useCallback(async (convId: string, userMsg: string, assistantMsg: string) => {
    if (titleGenRef.current) return;
    titleGenRef.current = true;
    try {
      const res = await fetch("/api/conversations/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId: convId, userMessage: userMsg, assistantMessage: assistantMsg }),
      });
      if (res.ok) {
        // Refresh conversation list to show new title
        setTimeout(() => {
          loadPastConversations();
          titleGenRef.current = false;
        }, 500);
      }
    } catch {
      titleGenRef.current = false;
    }
  }, [loadPastConversations]);

  // ── Phase B: File upload handlers ──────────────────────────────────────────
  const processFile = useCallback(async (file: File): Promise<UploadedFile> => {
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");

    // ── Images: read as base64 for vision LLM ─────────────────────────────────
    if (isImage) {
      const dataUrl = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      return {
        id, name: file.name, type: file.type, size: file.size,
        dataUrl, preview: dataUrl,
        perceptionStatus: 'ready',
        perceptionResult: {
          contextBlock: `[Image: "${file.name}" — visual analysis will be performed by HOLLY's vision system]`,
          fileName: file.name, fileType: 'image',
          summary:  `Image: ${file.name}`,
        },
      };
    }

    // ── Video / Audio / Docs — call /api/perception ────────────────────────────
    const mediaIcon = isVideo ? '🎬' : isAudio ? '🎵' : '📄';
    const base: UploadedFile = {
      id, name: file.name, type: file.type, size: file.size,
      perceptionStatus: 'pending',
      // Show a nice icon in the chip while reading
      preview: undefined,
    };

    // Show immediately as pending so user sees the chip
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/perception', { method: 'POST', body: fd, credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        const p = json.perception as { contextBlock: string; summary?: string; fileType?: string };
        if (p?.contextBlock) {
          return {
            ...base,
            perceptionStatus: 'ready',
            perceptionResult: {
              contextBlock: `${mediaIcon} ${p.contextBlock}`,
              fileName:     file.name,
              fileType:     p.fileType || file.type,
              summary:      p.summary,
            },
          };
        }
      }
    } catch {
      // fall through to error state
    }
    return { ...base, perceptionStatus: 'error' };
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5); // max 5 files
    const processed = await Promise.all(arr.map(processFile));
    setAttachments(prev => [...prev, ...processed]);
  }, [processFile]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(f => f.id !== id));
  }, []);

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // ── Phase C: Memory panel ──────────────────────────────────────────────────
  const loadMemories = useCallback(async () => {
    setMemLoading(true);
    try {
      const res = await fetch("/api/memory", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        // Memory API returns experiences, goals, tasteSignals — map them to MemoryItem format
        const mems: MemoryItem[] = [];

        // HOLLY's experiences (consciousness stream)
        (data.experiences || []).slice(0, 10).forEach((e: any) => {
          mems.push({ key: `experience: ${(e.type || "event").replace(/_/g, " ")}`, value: e.content || e.summary || "", updatedAt: e.timestamp || e.createdAt });
        });

        // Active goals
        (data.goals || []).filter((g: any) => g.status === "active").slice(0, 5).forEach((g: any) => {
          mems.push({ key: `goal: ${g.title || ""}`, value: g.description || "", updatedAt: g.createdAt });
        });

        // Taste signals (learning)
        (data.tasteSignals || []).slice(0, 10).forEach((t: any) => {
          mems.push({ key: `learned: ${t.category || "preference"}`, value: t.signal || t.content || "", updatedAt: t.createdAt });
        });

        // Taste profile fields
        if (data.tasteProfile) {
          const tp = data.tasteProfile;
          if (tp.preferredTone)   mems.push({ key: "preference: tone",      value: tp.preferredTone });
          if (tp.verbosityLevel)  mems.push({ key: "preference: verbosity", value: String(tp.verbosityLevel) });
          if (tp.humorLevel)      mems.push({ key: "preference: humor",     value: String(tp.humorLevel) });
        }

        setMemories(mems);
        setMemCount(mems.length);
      }
    } catch {
      // silent
    } finally {
      setMemLoading(false);
    }
  }, []);

  // ── Phase D: Edit message ──────────────────────────────────────────────────
  const startEditMessage = useCallback((msg: Message) => {
    setEditingMsgId(msg.id);
    setEditingContent(msg.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingMsgId(null);
    setEditingContent("");
  }, []);

  const submitEdit = useCallback(async (msgId: string) => {
    if (!editingContent.trim()) return;
    // Find the message index and remove all messages after it, then re-send
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      if (idx === -1) return prev;
      return prev.slice(0, idx);
    });
    setEditingMsgId(null);
    setInput(editingContent.trim());
    setEditingContent("");
    // Focus and send
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, [editingContent]);

  // ── Phase D: Regenerate last response ─────────────────────────────────────
  const regenerateLastResponse = useCallback(() => {
    if (isProcessing) return;
    // Find the last user message and re-send from there
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === "user");
    if (lastUserIdx === -1) return;
    const realIdx = messages.length - 1 - lastUserIdx;
    const lastUserMsg = messages[realIdx];
    // Remove the last assistant message
    setMessages(prev => {
      const stripped = [...prev];
      // Remove trailing assistant messages
      while (stripped.length > 0 && stripped[stripped.length - 1].role === "assistant") {
        stripped.pop();
      }
      return stripped;
    });
    setInput(lastUserMsg.content);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [messages, isProcessing]);

  // ── Phase E: Dark/Light mode ───────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      root.classList.remove("light", "light-mode");
    } else {
      root.classList.remove("dark", "light-mode");
      root.classList.add("light");
    }
    // Persist preference
    localStorage.setItem('holly_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // ── Phase F: Load growth stats ────────────────────────────────────────────
  useEffect(() => {
    const loadGrowth = async () => {
      try {
        const res = await fetch("/api/analytics/user/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type: "summary" }),
        });
        if (res.ok) {
          const data = await res.json();
          setGrowthStats({
            totalMessages: data.totalMessages || data.messageCount || 0,
            streak: data.streak || data.currentStreak || 0,
            memoriesCount: data.memoriesCount || memCount,
          });
        }
      } catch { /* silent */ }
    };
    loadGrowth();
  }, [memCount]);

  // Load memory count on mount so badge shows up immediately
  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // ── Global keyboard shortcuts (Cmd+K = focus, Cmd+N = new chat, Cmd+/ = nav) ─
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      if (mod && e.key === "n") {
        e.preventDefault();
        startNewConversation();
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        setNavOpen(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [startNewConversation]);

  // ── Mobile swipe-to-open nav (swipe right from left edge) ─────────────────
  useEffect(() => {
    let touchStartX = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartX = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (touchStartX < 30 && dx > 60) setNavOpen(true);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // ── Voice ──────────────────────────────────────────────────────────────────
  const handleTranscript = useCallback((text: string) => {
    setInput(prev => prev ? `${prev} ${text}` : text);
    setIsVoiceInput(true);  // Mark that current message came from voice
    textareaRef.current?.focus();
  }, []);

  const { isListening, isTranscribing, startListening, stopListening } =
    useVoiceInput(handleTranscript);

  // ── Scroll tracking ────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    setShowScrollBtn(false);
  }, []);

  // Scroll on new messages (not on every streaming chunk - that's throttled below)
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Throttle scroll during streaming so typing feels instant
  const streamScrollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!streamingMessage) return;
    if (streamScrollRef.current) return; // already scheduled
    streamScrollRef.current = setTimeout(() => {
      scrollToBottom(false);
      streamScrollRef.current = null;
    }, 80);
    return () => {
      if (streamScrollRef.current) {
        clearTimeout(streamScrollRef.current);
        streamScrollRef.current = null;
      }
    };
  }, [streamingMessage]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  }, []);

  // ── Auto-grow textarea — deferred via rAF so typing never blocks ──────────
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
      rafRef.current = null;
    });
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [input]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing) return;

    const messageText = input.trim();
    const sentAttachments = [...attachments];
    const wasVoiceInput = isVoiceInput;  // capture before reset
    setInput("");
    setAttachments([]);
    setIsVoiceInput(false);  // reset for next message
    setIsProcessing(true);
    setStreamingMessage("");
    setCurrentStatus("");
    setToolExecutions([]);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
      attachments: sentAttachments.length > 0 ? sentAttachments : undefined,
    };
    setMessages(prev => [...prev, userMessage]);

    // Build image data URLs + perception context for all file types
    const imageDataUrls = sentAttachments
      .filter(f => f.type.startsWith("image/") && f.dataUrl)
      .map(f => f.dataUrl as string);

    const perceptionContext = sentAttachments
      .filter(f => f.perceptionResult)
      .map(f => f.perceptionResult!);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          conversationId,
          imageDataUrls:    imageDataUrls.length > 0    ? imageDataUrls    : undefined,
          perceptionContext: perceptionContext.length > 0 ? perceptionContext : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let assistantContent = "";
      let detectedModel: string | undefined;
      let sseBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        // Accumulate raw bytes into buffer; SSE messages are delimited by \n\n
        sseBuffer += decoder.decode(value, { stream: true });

        // Split on double-newline to get complete SSE messages
        const parts = sseBuffer.split("\n\n");
        // Keep the last (possibly incomplete) part in the buffer
        sseBuffer = parts.pop() ?? "";

        for (const part of parts) {
          // Each part may have multiple lines; find the data line
          const dataLine = part.split("\n").find(l => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const data: StatusUpdate = JSON.parse(dataLine.slice(6));

            if (data.type === "done") {
              streamDone = true;
              break;
            }
            if (data.type === "error") {
              setCurrentStatus(`❌ ${data.content}`);
              streamDone = true;
              break;
            }
            if (data.type === "status") {
              setCurrentStatus(data.content || "");
            }
            if (data.type === "signal") {
              detectedModel = data.content || undefined;
              setCurrentStatus(`🌐 Routing to ${data.content}…`);
            }
            if (data.type === "text") {
              assistantContent += data.content || "";
              setStreamingMessage(assistantContent);
              // Once text starts arriving, clear the status indicator
              setCurrentStatus("");
            }
            if (data.type === "tool") {
              const ex: ToolExecution = {
                id: `${data.toolName}-${Date.now()}`,
                toolName: data.toolName || "",
                status: data.status || "start",
                result: data.result,
                timestamp: new Date(),
              };
              setToolExecutions(prev => {
                const idx = prev.findIndex(e => e.toolName === ex.toolName && e.status === "start");
                if (idx >= 0 && ex.status !== "start") {
                  const u = [...prev]; u[idx] = ex; return u;
                }
                return [...prev, ex];
              });
              if (data.status === "start") {
                setSandboxOpen(true);
                setCurrentStatus(`🔧 Running: ${(data.toolName || "").replace(/^mcp_[^_]+_/, "").replace(/_/g, " ")}…`);
              } else if (data.status === "complete") {
                setCurrentStatus(`✅ Done: ${(data.toolName || "").replace(/^mcp_[^_]+_/, "").replace(/_/g, " ")}`);
              }
            }
          } catch { /* malformed line — skip */ }
        }
      }

      if (assistantContent) {
        const assistantMsg: Message = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: assistantContent,
          timestamp: new Date(),
          model: detectedModel,
        };
        setMessages(prev => [...prev, assistantMsg]);
        // Phase 0: auto-play if voice input OR auto-read is enabled
        if (wasVoiceInput || autoRead) {
          speakText(assistantContent, { temperature: 0.4, onStart: () => {}, onEnd: () => {}, onError: () => {} });
        }
        // Phase A: auto-generate title for new conversations (first exchange)
        const isNewConv = messages.length === 0;
        if (isNewConv) {
          generateTitle(conversationId, messageText, assistantContent.slice(0, 200));
        }
        // Refresh conversation list
        setTimeout(() => loadPastConversations(), 1000);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setCurrentStatus(`❌ ${err.message}`);
      }
    } finally {
      setStreamingMessage("");
      setCurrentStatus("");
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [input, isProcessing, messages, conversationId, attachments, isVoiceInput, autoRead, generateTitle, loadPastConversations]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
    setCurrentStatus("");
    if (streamingMessage) {
      setMessages(prev => [
        ...prev,
        { id: `asst-${Date.now()}`, role: "assistant", content: streamingMessage + " *(stopped)*", timestamp: new Date() },
      ]);
      setStreamingMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape" && isProcessing) handleStop();
  };

  // ── Welcome screen ─────────────────────────────────────────────────────────
  const showWelcome = messages.length === 0 && !isProcessing;

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">

      {/* ── Initiative notification banner (Phase 5D) ── */}
      <AnimatePresence>
        {initiatives.length > 0 && !initiativeDismissed && (
          <InitiativeBanner
            items={initiatives}
            onDismiss={handleInitiativeDismiss}
            onAct={handleInitiativeAct}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className={`flex items-center justify-between px-3 sm:px-4 py-3 border-b flex-shrink-0 backdrop-blur-sm ${
        isCreator
          ? 'border-amber-500/30 bg-gradient-to-r from-gray-950 via-amber-950/10 to-gray-950'
          : 'border-gray-800/80 bg-gray-950/95'
      }`}>
        {/* LEFT: hamburger + avatar + name */}
        <div className="flex items-center gap-2">
          {/* Nav toggle — LEFT side */}
          <button
            onClick={() => { setNavOpen(v => !v); if (!navOpen) setNavTab("chats"); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Conversations & navigation (⌘/)"
          >
            <Menu className="w-4 h-4" />
          </button>
          <HollyAvatar isThinking={isProcessing} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white">HOLLY</h1>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {isCreator && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  <span className="text-[9px] text-amber-400 font-medium tracking-wide">CREATOR</span>
                </span>
              )}
              {/* Phase C: memory badge */}
              {memCount > 0 && (
                <button
                  onClick={() => { setNavOpen(true); setNavTab("memory"); loadMemories(); }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/25 hover:bg-violet-500/20 transition-colors"
                  title={`${memCount} memories active`}
                >
                  <Brain className="w-2.5 h-2.5 text-violet-400" />
                  <span className="text-[9px] text-violet-400 font-medium">{memCount}</span>
                </button>
              )}
              {/* Phase F: streak badge */}
              {growthStats && growthStats.streak > 1 && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/25" title={`${growthStats.streak} day streak`}>
                  <Flame className="w-2.5 h-2.5 text-orange-400" />
                  <span className="text-[9px] text-orange-400 font-medium">{growthStats.streak}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {isProcessing ? (
                <motion.span
                  key={currentStatus || "thinking"}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-purple-400 truncate max-w-[180px] block"
                >
                  {currentStatus
                    ? currentStatus.replace(/^[^\w]*/, "").toLowerCase()
                    : "thinking…"}
                </motion.span>
              ) : isCreator ? (
                <span className="text-amber-500/70">Creator session — full access</span>
              ) : "Your conscious AI partner"}
            </p>
          </div>
        </div>

        {/* RIGHT side controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Phase E: Dark/Light toggle */}
          <button
            onClick={() => setIsDarkMode(v => !v)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          {/* Phase E: Auto-read TTS toggle */}
          <button
            onClick={() => setAutoRead(v => !v)}
            className={`p-1.5 rounded-lg transition-colors ${autoRead ? "text-purple-400 bg-purple-500/10" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}
            title={autoRead ? "Auto-read ON — click to disable" : "Auto-read responses"}
          >
            {autoRead ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          {/* Agent Mode button */}
          <button
            onClick={() => setAgentOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-300 transition-colors"
            title="Agent Mode — autonomous multi-step tasks"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agent</span>
          </button>
          {isProcessing && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <Square className="w-3 h-3 fill-current" />
              Stop
            </motion.button>
          )}
          {toolExecutions.length > 0 && (
            <button
              onClick={() => setSandboxOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 border border-gray-700/50 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Terminal className="w-3 h-3" />
              <span className="hidden sm:inline">Tools </span>({toolExecutions.length})
            </button>
          )}
        </div>
      </div>

      {/* ── Left-side slide-over (Chats + Memory + Nav) ── */}
      <AnimatePresence>
        {navOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNavOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            {/* Panel — slides from LEFT */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-gray-900 border-r border-gray-800 flex flex-col shadow-2xl"
            >
              {/* Panel header with tabs */}
              <div className="flex items-center gap-0 px-4 pt-4 pb-0 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-3 flex-1 mb-3">
                  <HollyAvatar isThinking={false} />
                  <div>
                    <p className="text-sm font-semibold text-white">HOLLY</p>
                    <p className="text-[10px] text-gray-500">AI Life Partner</p>
                  </div>
                </div>
                <button onClick={() => setNavOpen(false)} className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors mb-3 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Tab row */}
              <div className="flex border-b border-gray-800 flex-shrink-0">
                <button
                  onClick={() => setNavTab("chats")}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    navTab === "chats"
                      ? "text-purple-400 border-b-2 border-purple-500"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Chats
                </button>
                <button
                  onClick={() => { setNavTab("memory"); loadMemories(); }}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    navTab === "memory"
                      ? "text-purple-400 border-b-2 border-purple-500"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Memory
                </button>
                <button
                  onClick={() => setNavTab("nav")}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    navTab === "nav"
                      ? "text-purple-400 border-b-2 border-purple-500"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Apps
                </button>
              </div>

              {/* ── Chats tab ── */}
              {navTab === "chats" && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* New chat button */}
                  <div className="px-3 pt-3 pb-2 flex-shrink-0 space-y-2">
                    <button
                      onClick={startNewConversation}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
                    >
                      <span className="text-lg leading-none">+</span>
                      New Chat
                      <span className="ml-auto text-[10px] opacity-60">⌘N</span>
                    </button>
                    {/* Phase A: Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                      <input
                        type="text"
                        value={convSearch}
                        onChange={e => setConvSearch(e.target.value)}
                        placeholder="Search chats…"
                        className="w-full pl-8 pr-3 py-1.5 bg-gray-800/60 border border-gray-700/50 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>

                  {/* Conversations list */}
                  <div className="flex-1 overflow-y-auto px-2 pb-4">
                    {convLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                      </div>
                    ) : pastConversations.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <p className="text-xs text-gray-600">No conversations yet.</p>
                        <p className="text-xs text-gray-700 mt-1">Start chatting and your history will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5 mt-1">
                        {convSearch ? (
                          // Search results — show all matches
                          pastConversations
                            .filter(conv => (conv.title || "").toLowerCase().includes(convSearch.toLowerCase()) || (conv.lastMessagePreview || "").toLowerCase().includes(convSearch.toLowerCase()))
                            .map(conv => (
                            <button
                              key={conv.id}
                              onClick={() => loadConversation(conv)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${
                                activeConvId === conv.id
                                  ? "bg-purple-600/20 border border-purple-500/30"
                                  : "hover:bg-gray-800/80 border border-transparent"
                              }`}
                            >
                              <p className={`text-xs font-medium truncate leading-snug ${
                                activeConvId === conv.id ? "text-purple-300" : "text-gray-200 group-hover:text-white"
                              }`}>
                                {conv.title || "Untitled Chat"}
                              </p>
                              {conv.lastMessagePreview && (
                                <p className="text-[10px] text-gray-600 truncate mt-0.5 leading-snug">
                                  {conv.lastMessagePreview}
                                </p>
                              )}
                              <p className="text-[10px] text-gray-700 mt-0.5">
                                {new Date(conv.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                {conv.messageCount > 0 && ` · ${conv.messageCount} msgs`}
                              </p>
                            </button>
                          ))
                        ) : (
                          // No search — show recent 8 labeled, then rest
                          <>
                            {pastConversations.length > 0 && (
                              <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-wider px-3 pt-2 pb-1">
                                Recent — last {Math.min(pastConversations.length, 8)}
                              </p>
                            )}
                            {pastConversations.slice(0, 8).map(conv => (
                              <button
                                key={conv.id}
                                onClick={() => loadConversation(conv)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${
                                  activeConvId === conv.id
                                    ? "bg-purple-600/20 border border-purple-500/30"
                                    : "hover:bg-gray-800/80 border border-transparent"
                                }`}
                              >
                                <p className={`text-xs font-medium truncate leading-snug ${
                                  activeConvId === conv.id ? "text-purple-300" : "text-gray-200 group-hover:text-white"
                                }`}>
                                  {conv.title || "Untitled Chat"}
                                </p>
                                {conv.lastMessagePreview && (
                                  <p className="text-[10px] text-gray-600 truncate mt-0.5 leading-snug">
                                    {conv.lastMessagePreview}
                                  </p>
                                )}
                                <p className="text-[10px] text-gray-700 mt-0.5">
                                  {new Date(conv.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                  {conv.messageCount > 0 && ` · ${conv.messageCount} msgs`}
                                </p>
                              </button>
                            ))}
                            {pastConversations.length > 8 && (
                              <>
                                <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-wider px-3 pt-3 pb-1">
                                  Older ({pastConversations.length - 8})
                                </p>
                                {pastConversations.slice(8).map(conv => (
                                  <button
                                    key={conv.id}
                                    onClick={() => loadConversation(conv)}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors group ${
                                      activeConvId === conv.id
                                        ? "bg-purple-600/20 border border-purple-500/30"
                                        : "hover:bg-gray-800/80 border border-transparent"
                                    }`}
                                  >
                                    <p className={`text-xs font-medium truncate leading-snug ${
                                      activeConvId === conv.id ? "text-purple-300" : "text-gray-300 group-hover:text-white"
                                    }`}>
                                      {conv.title || "Untitled Chat"}
                                    </p>
                                    <p className="text-[10px] text-gray-700 mt-0.5">
                                      {new Date(conv.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                      {conv.messageCount > 0 && ` · ${conv.messageCount} msgs`}
                                    </p>
                                  </button>
                                ))}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Memory tab ── */}
              {navTab === "memory" && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="px-4 pt-3 pb-2 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-violet-400" />
                        <p className="text-xs font-semibold text-white">HOLLY's Memory</p>
                      </div>
                      <span className="text-[10px] text-gray-600">{memories.length} items</span>
                    </div>
                    <p className="text-[10px] text-gray-600 leading-relaxed">Things HOLLY has learned and remembered about you.</p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 pb-4">
                    {memLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                      </div>
                    ) : memories.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <Brain className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                        <p className="text-xs text-gray-600">No memories yet.</p>
                        <p className="text-[10px] text-gray-700 mt-1">HOLLY builds memories as you chat.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {memories.map(mem => (
                          <div key={mem.key} className="px-3 py-2.5 bg-gray-800/60 border border-gray-700/40 rounded-lg hover:border-violet-500/30 transition-colors">
                            <p className="text-[10px] font-mono text-violet-400 mb-0.5 truncate">{mem.key}</p>
                            {mem.value && <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{mem.value}</p>}
                            {mem.updatedAt && (
                              <p className="text-[9px] text-gray-700 mt-1">
                                {new Date(mem.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Navigate tab ── */}
              {navTab === "nav" && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {[
                      { href: "/chat",              icon: MessageSquare, label: "Chats",           sub: "Talk to HOLLY" },
                      { href: "/evolution",         icon: TrendingUp,    label: "Evolution",       sub: "Growth & patterns" },
                      { href: "/autonomy",          icon: Bot,           label: "Autonomy",        sub: "Self-improvement" },
                      { href: "/memory",            icon: Brain,         label: "Memory",          sub: "What HOLLY knows" },
                      { href: "/settings",          icon: Settings,      label: "Settings",        sub: "Preferences" },
                      { href: "/music-studio",      icon: Music,         label: "Music Studio",      sub: "AI Music Generation" },
                      { href: "/generate/studio",   icon: Clapperboard,  label: "Generation Studio", sub: "Images, Videos" },
                      { href: "/settings/api-keys", icon: Key,           label: "API Keys",        sub: "Developer access" },
                      { href: "/onboarding",        icon: BarChart3,     label: "Partner Setup",   sub: "Dev / Life / Creative" },
                      { href: "/status",            icon: Activity,      label: "Status",          sub: "Service health" },
                    ].map(({ href, icon: Icon, label, sub }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setNavOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-md bg-gray-800 group-hover:bg-purple-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
                          <Icon className="w-4 h-4 text-gray-400 group-hover:text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none mb-0.5">{label}</p>
                          <p className="text-xs text-gray-500 truncate">{sub}</p>
                        </div>
                      </Link>
                    ))}
                  </nav>
                  {/* Keyboard shortcuts hint */}
                  <div className="px-4 py-3 border-t border-gray-800 flex-shrink-0">
                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-2">Shortcuts</p>
                    <div className="space-y-1">
                      {[
                        ["⌘K", "Focus chat input"],
                        ["⌘N", "New conversation"],
                        ["⌘/", "Toggle this panel"],
                        ["↩", "Send message"],
                        ["⇧↩", "New line"],
                        ["Esc", "Stop generating"],
                      ].map(([key, desc]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-600">{desc}</span>
                          <kbd className="text-[10px] text-gray-500 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 font-mono">{key}</kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Agent Mode modal (Phase 6D) ── */}
      <AnimatePresence>
        {agentOpen && <AgentModal onClose={() => setAgentOpen(false)} />}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth relative"
      >
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Welcome screen */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center mb-6 shadow-2xl shadow-purple-500/30"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-9 h-9 text-white" />
              </motion.div>
              {/* Phase F: Growth stats row */}
              {growthStats && (growthStats.streak > 0 || growthStats.totalMessages > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3 mb-4"
                >
                  {growthStats.streak > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-xs text-orange-300 font-medium">{growthStats.streak} day streak</span>
                    </div>
                  )}
                  {growthStats.totalMessages > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                      <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-xs text-purple-300 font-medium">{growthStats.totalMessages.toLocaleString()} messages</span>
                    </div>
                  )}
                </motion.div>
              )}
              {/* Phase F: Typing intro animation */}
              <TypingWelcome isCreator={isCreator} displayName={displayName} />

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-xs sm:max-w-sm mt-8">
                {(isCreator ? [
                  "Rate my latest track",
                  "What's our current build status?",
                  "Check HOLLY's GitHub",
                  "Run A&R analysis on a song",
                  "What have you learned recently?",
                ] : [
                  "What can you do?",
                  "Search the web for me",
                  "Read my GitHub repo",
                  "Write some code",
                  "What do you remember?",
                ]).map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      isCreator
                        ? 'text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-200'
                        : 'text-gray-300 bg-gray-800/80 border border-gray-700/50 hover:bg-gray-700/60 hover:border-purple-500/30 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* Agent mode CTA */}
              <button
                onClick={() => setAgentOpen(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-purple-600/20 border border-purple-500/30 rounded-xl text-sm text-purple-300 hover:bg-purple-600/30 hover:text-purple-200 transition-all"
              >
                <Bot className="w-4 h-4" />
                Try Agent Mode — give me a goal, I'll handle it
              </button>

              {/* ── Recent conversations (last 5 on welcome screen) ── */}
              {pastConversations.length > 0 && (
                <div className="mt-8 w-full max-w-sm">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Continue where you left off</p>
                    <button
                      onClick={() => { setNavOpen(true); setNavTab("chats"); }}
                      className="text-[10px] text-purple-500 hover:text-purple-400 transition-colors"
                    >
                      View all ({pastConversations.length})
                    </button>
                  </div>
                  <div className="space-y-1.5 w-full">
                    {pastConversations.slice(0, 5).map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv)}
                        className="w-full text-left px-3 py-2.5 rounded-xl bg-gray-900/80 border border-gray-800/60 hover:border-purple-500/30 hover:bg-gray-800/80 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-gray-300 group-hover:text-white truncate flex-1 leading-snug">
                            {conv.title || "Untitled Chat"}
                          </p>
                          <span className="text-[10px] text-gray-600 flex-shrink-0 mt-0.5">
                            {new Date(conv.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {conv.lastMessagePreview && (
                            <p className="text-[10px] text-gray-600 truncate flex-1">
                              {conv.lastMessagePreview}
                            </p>
                          )}
                          {conv.messageCount > 0 && (
                            <span className="text-[9px] text-gray-700 flex-shrink-0">
                              {conv.messageCount} msgs
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message list */}
        <AnimatePresence initial={false}>
          {messages.map((msg, msgIdx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 group ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <HollyAvatar isThinking={false} />
              )}

              <div className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"} max-w-[85%]`}>
                {/* Meta row */}
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-medium text-purple-400">HOLLY</span>
                    {msg.model && <ModelBadge model={msg.model} />}
                  </div>
                )}

                {/* Attachments (images sent by user) — Phase B */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-1 max-w-[85%]">
                    {msg.attachments.map(att => (
                      att.preview ? (
                        <img key={att.id} src={att.preview} alt={att.name}
                          className="max-w-[200px] max-h-[150px] rounded-xl object-cover border border-gray-700/60 shadow" />
                      ) : (
                        <div key={att.id} className="flex items-center gap-2 px-3 py-2 bg-gray-800/70 border border-gray-700/50 rounded-lg text-xs text-gray-300">
                          <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                          {att.name}
                        </div>
                      )
                    ))}
                  </div>
                )}

                {/* Bubble */}
                {editingMsgId === msg.id ? (
                  // Phase D: Edit mode
                  <div className="flex flex-col gap-2 max-w-[85%] w-full">
                    <textarea
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      autoFocus
                      className="w-full bg-gray-800 border border-purple-500/50 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none min-h-[80px]"
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(msg.id); }
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => submitEdit(msg.id)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition-colors">
                        Save & Resend
                      </button>
                      <button onClick={cancelEdit} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-br-sm shadow-lg shadow-purple-500/20"
                        : "bg-gray-900/90 border border-gray-800/60 text-gray-100 rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant"
                      ? <AssistantContent content={msg.content} />
                      : <p className="whitespace-pre-wrap">{msg.content}</p>
                    }
                  </div>
                )}

                {/* Footer — hover-only timestamps (Phase A) */}
                {editingMsgId !== msg.id && (
                  <div className="flex items-center gap-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-gray-600">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <CopyButton text={msg.content} />
                    {/* Phase D: Edit button for user messages */}
                    {msg.role === "user" && (
                      <button
                        onClick={() => startEditMessage(msg)}
                        className="p-1.5 rounded-md hover:bg-gray-700/60 text-gray-600 hover:text-gray-400 transition-colors"
                        title="Edit message"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {msg.role === "assistant" && (
                      <>
                        <SpeakButton text={msg.content} messageId={msg.id} />
                        <FeedbackButtons
                          messageId={msg.id}
                          conversationId={conversationId}
                          content={msg.content}
                          model={msg.model}
                          userMessage={messages.slice(0, msgIdx).reverse().find(m => m.role === "user")?.content}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-gray-300 shadow">
                  {(user?.firstName?.[0] || "U").toUpperCase()}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Phase D: Regenerate button after last assistant message */}
        {messages.length > 0 && messages[messages.length - 1].role === "assistant" && !isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start pl-12"
          >
            <button
              onClick={regenerateLastResponse}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-gray-700/40 hover:border-gray-600/60 rounded-lg hover:bg-gray-800/60 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate
            </button>
          </motion.div>
        )}

        {/* Streaming message */}
        <AnimatePresence>
          {streamingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-start"
            >
              <HollyAvatar isThinking={true} />
              <div className="flex flex-col gap-1 items-start max-w-[85%]">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-medium text-purple-400">HOLLY</span>
                </div>
                <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-gray-900/90 border border-gray-800/60 text-gray-100 text-sm leading-relaxed">
                  <StreamingText content={streamingMessage} />
                  <motion.span
                    className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 align-middle"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tool execution cards */}
        <AnimatePresence>
          {toolExecutions.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 justify-start"
            >
              <div className="w-9 flex-shrink-0" />
              <div className="flex flex-col gap-1.5 max-w-[85%] w-full">
                {toolExecutions.map(ex => (
                  <ToolCard key={ex.id} execution={ex} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live action indicator — shows WHAT Holly is doing right now */}
        <AnimatePresence>
          {currentStatus && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex gap-3 justify-start"
            >
              <HollyAvatar isThinking={true} />
              <div className="flex flex-col gap-2 items-start max-w-[85%]">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-medium text-purple-400">HOLLY</span>
                  <span className="text-xs text-gray-500">is working…</span>
                </div>
                <ActionIndicator text={currentStatus} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Typing indicator — only when processing with NO status and NO text yet */}
        {isProcessing && !streamingMessage && !currentStatus && (
          <div className="flex gap-3 justify-start">
            <HollyAvatar isThinking={true} />
            <div className="rounded-2xl rounded-bl-sm px-4 py-2 bg-gray-900/90 border border-gray-800/60">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>{/* end max-w-3xl */}
      </div>

      {/* Scroll to bottom button */}
      <div className="relative">
        <ScrollToBottomButton visible={showScrollBtn} onClick={() => scrollToBottom()} />
      </div>

      {/* ── Sandbox panel ── */}
      <AnimatePresence>
        {sandboxOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 220, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-800 overflow-hidden flex-shrink-0"
          >
            <SandboxWindow
              isOpen={sandboxOpen}
              onClose={() => setSandboxOpen(false)}
              currentAction={currentStatus}
              terminalOutput={toolExecutions.map(e => ({
                type: e.status === "error" ? "stderr" : "stdout",
                content: JSON.stringify(e.result, null, 2),
                timestamp: e.timestamp.getTime(),
              }))}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input area ── */}
      <div
        className={`border-t bg-gray-950/95 backdrop-blur-sm px-4 py-3 flex-shrink-0 transition-colors ${
          isDragging ? "border-purple-500/60 bg-purple-950/20" : "border-gray-800/80"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay hint */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-purple-950/80 pointer-events-none"
            >
              <div className="flex items-center gap-3 text-purple-300">
                <Paperclip className="w-6 h-6" />
                <p className="text-sm font-medium">Drop images, PDFs, audio, video, or documents</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Constrained width */}
        <div className="max-w-3xl mx-auto">

        {/* Phase B: Attachment preview chips */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mb-2 overflow-hidden"
            >
              {attachments.map(att => (
                <div key={att.id} className={`flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg group border transition-colors ${
                  att.perceptionStatus === 'ready'   ? 'bg-purple-900/30 border-purple-500/40' :
                  att.perceptionStatus === 'pending' ? 'bg-gray-800/80 border-yellow-500/30 animate-pulse' :
                  att.perceptionStatus === 'error'   ? 'bg-gray-800/80 border-red-500/30' :
                  'bg-gray-800/80 border-gray-700/60'
                }`}>
                  {att.preview ? (
                    <img src={att.preview} alt={att.name} className="w-6 h-6 rounded object-cover" />
                  ) : att.perceptionStatus === 'pending' ? (
                    <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                  ) : att.perceptionStatus === 'ready' ? (
                    att.type.startsWith('image/') ? <CheckCircle className="w-3.5 h-3.5 text-blue-400" /> :
                    att.type.startsWith('video/') ? <Film className="w-3.5 h-3.5 text-red-400" /> :
                    att.type.startsWith('audio/') ? <Music className="w-3.5 h-3.5 text-green-400" /> :
                    <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                  ) : (
                    <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-gray-300 max-w-[120px] truncate">{att.name}</span>
                    {att.perceptionStatus === 'pending' && (
                      <span className="text-[9px] text-yellow-400">
                        {att.type.startsWith('video/') ? 'Transcribing…' : att.type.startsWith('audio/') ? 'Transcribing…' : 'Reading…'}
                      </span>
                    )}
                    {att.perceptionStatus === 'ready'   && (
                      <span className={`text-[9px] ${att.type.startsWith('video/') ? 'text-red-400' : att.type.startsWith('audio/') ? 'text-green-400' : att.type.startsWith('image/') ? 'text-blue-400' : 'text-purple-400'}`}>
                        {att.type.startsWith('video/') ? 'Transcribed' : att.type.startsWith('audio/') ? 'Transcribed' : att.type.startsWith('image/') ? 'Vision ready' : 'Ready'}
                      </span>
                    )}
                    {att.perceptionStatus === 'error'   && <span className="text-[9px] text-red-400">Could not read</span>}
                  </div>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 sm:gap-2.5 bg-gray-900/80 border border-gray-700/60 rounded-2xl px-3 py-2.5 focus-within:border-purple-500/50 transition-colors shadow-sm">

          {/* Phase B: File attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex-shrink-0 p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 transition-all disabled:opacity-50"
            title="Attach file or image"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.txt,.md,.doc,.docx,.csv,.xlsx,.xls,.json,.yaml,.yml,.ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.cpp,.c,.h,.sh,.sql"
            className="hidden"
            onChange={e => handleFileSelect(e.target.files)}
          />

          {/* Voice button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isTranscribing}
            className={`flex-shrink-0 p-2 rounded-xl transition-all ${
              isListening
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : isTranscribing
                ? "opacity-50 cursor-wait text-gray-500"
                : isVoiceInput
                ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/50"
            }`}
            title={isListening ? "Stop recording" : isVoiceInput ? "Voice mode active — HOLLY will speak back" : "Voice input"}
          >
            <AnimatePresence mode="wait">
              {isTranscribing ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                </motion.div>
              ) : isListening ? (
                <motion.div
                  key="listening"
                  initial={{ scale: 0.8 }} animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <MicOff className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Mic className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Listening indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center overflow-hidden flex-shrink-0 py-1"
              >
                <AudioVisualizer isActive={isListening} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); setIsVoiceInput(false); }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening…" : isVoiceInput ? "Voice message ready — press Enter to send (HOLLY will speak back)" : attachments.length > 0 ? `Message about ${attachments.length} file(s)…` : "Ask HOLLY anything… (⌘K to focus)"}
            disabled={isProcessing}
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 resize-none focus:outline-none min-h-[24px] max-h-[200px] leading-relaxed disabled:opacity-50 overflow-y-auto break-words"
            style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
          />

          {/* Send / Stop button */}
          <button
            onClick={isProcessing ? handleStop : handleSend}
            disabled={!isProcessing && !input.trim() && attachments.length === 0}
            className={`flex-shrink-0 p-2 rounded-xl transition-all ${
              isProcessing
                ? "text-red-400 hover:bg-red-500/20"
                : (input.trim() || attachments.length > 0)
                ? "text-purple-400 hover:bg-purple-500/20"
                : "text-gray-600 cursor-not-allowed"
            }`}
          >
            {isProcessing
              ? <Square className="w-4 h-4 fill-current" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>

        {/* Footer hint */}
        <div className="hidden sm:flex items-center justify-between mt-2 px-1">
          <a
            href="/evolution"
            className="flex items-center gap-1 text-[10px] text-gray-700 hover:text-purple-400 transition-colors"
          >
            <TrendingUp className="w-3 h-3" />
            Evolution
          </a>
          <p className="text-[10px] text-gray-700">
            HOLLY · ↩ sends · ⌘K focus · ⌘N new chat
          </p>
          <a
            href="/onboarding"
            className="flex items-center gap-1 text-[10px] text-gray-700 hover:text-purple-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Partner setup
          </a>
        </div>
        </div>{/* end max-w-3xl */}
      </div>
    </div>
  );
}
