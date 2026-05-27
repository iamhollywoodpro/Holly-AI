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
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";
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
  RotateCcw, Edit3, Flame, RefreshCw, MessageSquare,
  Star, Heart, Activity, Wifi, WifiOff, CheckCircle, AlertCircle,
  LogOut, User, Grid, Plus, History,
} from "lucide-react";
import Link from "next/link";
import SandboxWindow from "./sandbox-window";
import { speakText, stopSpeaking, isSpeaking } from "../lib/voice/enhanced-voice-output";
import { useNotifications } from "../lib/notifications/notification-polling";
import { useVoiceLoop } from '../lib/voice/use-voice-loop';
import { WaveformVisualizer } from './holly2/WaveformVisualizer';
import { HollyOrb } from './holly/HollyOrb';
import { useHollyEmotion } from './holly/HollyEmotionContext';
import type { HollyEmotion } from './holly/LivingLogo';
import { LivingLogo } from './holly/LivingLogo';
import { ModeTransitionOverlay, ModePill, MODE_CONFIGS } from './holly/ModeTransition';
import { useAmbientSound } from './holly/AmbientSound';

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
  audioAnalysis?: { contextBlock: string; summary: string; fileName: string };
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

interface SystemHealth {
  healthy: boolean;
  score: number;
  status: string;
  issuesCount: number;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const HeartIndicator = ({ emotion }: { emotion: string }) => {
  const colorMap: Record<string, string> = {
    idle: 'text-holly-ivory/20',
    focused: 'text-holly-gold',
    researching: 'text-holly-gold/80',
    analyzing: 'text-holly-gold',
    generating: 'text-holly-gold',
    creative: 'text-holly-crimson',
    contemplative: 'text-holly-gold/60',
    curious: 'text-holly-gold/70',
    excited: 'text-holly-crimson',
    dreaming: 'text-holly-gold/40',
  };

  const speedMap: Record<string, number> = {
    idle: 4.0,
    focused: 2.5,
    researching: 2.0,
    analyzing: 1.6,
    generating: 1.2,
    creative: 0.9,
    contemplative: 3.0,
    curious: 2.2,
    excited: 0.7,
    dreaming: 5.0,
  };

  return (
    <motion.div
      animate={{ 
        scale: [1, 1.25, 1],
        opacity: [0.5, 1, 0.5],
      }}
      transition={{ 
        duration: speedMap[emotion] || 2, 
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={`flex items-center justify-center ${colorMap[emotion] || 'text-primary'}`}
      title={`Holly's heart rate: ${emotion}`}
    >
      <Heart className="w-3.5 h-3.5 fill-current shadow-[0_0_10px_currentColor]" />
    </motion.div>
  );
};


// ─── Tool metadata ────────────────────────────────────────────────────────────

const TOOL_META: Record<string, { label: string; icon: any; color: string }> = {
  // GitHub tools — full MCP names
  "mcp_github_github_read_file":            { label: "Reading file",       icon: Github,      color: "text-holly-ivory/60" },
  "mcp_github_github_list_files":           { label: "Listing files",      icon: Github,      color: "text-holly-ivory/60" },
  "mcp_github_github_create_or_update_file":{ label: "Writing to repo",    icon: Github,      color: "text-holly-gold" },
  "mcp_github_github_create_pr":            { label: "Creating PR",        icon: Github,      color: "text-holly-gold" },
  "mcp_github_github_create_issue":         { label: "Creating issue",     icon: Github,      color: "text-holly-gold" },
  "mcp_github_github_list_prs":             { label: "Listing PRs",        icon: Github,      color: "text-holly-ivory/60" },
  // Short names (stripped prefix)
  github_read_file:            { label: "Reading file",       icon: Github,      color: "text-holly-ivory/60" },
  github_list_files:           { label: "Listing files",      icon: Github,      color: "text-holly-ivory/60" },
  github_create_or_update_file:{ label: "Writing to repo",    icon: Github,      color: "text-holly-gold" },
  github_create_pr:            { label: "Creating PR",        icon: Github,      color: "text-holly-gold" },
  github_create_issue:         { label: "Creating issue",     icon: Github,      color: "text-holly-gold" },
  github_list_prs:             { label: "Listing PRs",        icon: Github,      color: "text-holly-ivory/60" },
  web_search:                  { label: "Searching web",      icon: Search,      color: "text-holly-gold" },
  web_scrape:                  { label: "Scraping page",      icon: Globe,       color: "text-holly-gold/80" },
  run_code:                    { label: "Running JS",         icon: Code2,       color: "text-holly-gold" },
  run_code_judge0:             { label: "Executing code",     icon: Terminal,    color: "text-holly-gold" },
  memory_write:                { label: "Saving memory",      icon: Database,    color: "text-holly-gold" },
  memory_read:                 { label: "Reading memory",     icon: Database,    color: "text-holly-gold/90" },
  memory_list_keys:            { label: "Listing memories",   icon: Database,    color: "text-holly-gold/90" },
  generate_image:              { label: "Generating image",   icon: Image,       color: "text-holly-crimson" },
  generate_music:              { label: "Composing music",    icon: Music,       color: "text-holly-gold" },
  generate_video:              { label: "Rendering video",    icon: Film,        color: "text-holly-crimson" },
  get_weather:                 { label: "Checking weather",   icon: Thermometer, color: "text-holly-gold/70" },
};

// ─── Initiative notification types ──────────────────────────────────────────

interface InitiativeItem {
  id: string;
  type: string;
  content: string;
  motivation?: string;
}

const STATUS_TO_EMOTION: Record<string, HollyEmotion> = {
  searching: 'researching',
  researching: 'researching',
  reading: 'focused',
  analyzing: 'analyzing',
  writing: 'generating',
  composing: 'creative',
  generating: 'generating',
  creating: 'creative',
  planning: 'contemplative',
  thinking: 'focused',
  reasoning: 'contemplative',
  running: 'analyzing',
  executing: 'analyzing',
  scraping: 'researching',
  saving: 'focused',
  vision: 'curious',
};

function statusToEmotion(statusText: string): HollyEmotion | null {
  const lower = statusText.toLowerCase();
  for (const [keyword, emotion] of Object.entries(STATUS_TO_EMOTION)) {
    if (lower.includes(keyword)) return emotion;
  }
  return null;
}

function detectClientMode(text: string): string {
  const m = text.toLowerCase();
  if (/create a song|generate music|make a beat|compose music|write a song|produce a track|create music|make music|suno|make a track|music studio/.test(m)) return 'music-studio';
  if (/analyze this song|music feedback|a&r|aura|song review|track feedback/.test(m)) return 'aura-ar';
  if (/build a website|create an app|full-stack|web application|backend|database/.test(m)) return 'full-stack';
  if (/write code|function|algorithm|debug|fix this code|optimize/.test(m)) return 'write-code';
  if (/fix yourself|modify your code|self-code|read your code|audit yourself|improve yourself/.test(m)) return 'self-coding';
  if (/research|analyze|investigate|deep dive|look online|look up|search for|find out|google it|fact check|can you check/.test(m)) return 'deep-research';
  if (/philosophy|philosophical|meaning of|free will|existential|nietzsche|stoic|buddhism/.test(m)) return 'philosophy';
  if (/write a poem|short story|write a story|creative writing|write lyrics|write a script|fiction|haiku/.test(m)) return 'creative-writing';
  if (/generate an image|create an image|draw|paint|create artwork|album cover|make art|illustration/.test(m)) return 'visual-arts';
  if (/i'm struggling|i feel|i'm sad|i'm anxious|emotionally|grief|mental health|overwhelmed/.test(m)) return 'emotional-intelligence';
  if (/design|ui|ux|interface|layout/.test(m)) return 'magic-design';
  return 'default';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-holly-gold/60"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function HollyAvatar({ isThinking }: { isThinking: boolean }) {
  const { emotion } = useHollyEmotion();
  return <HollyOrb emotion={emotion} isThinking={isThinking} size={36} />;
}

function SystemHealthIndicator({ health }: { health: SystemHealth | null }) {
  if (!health) return null;
  
  const statusColors = health.healthy 
    ? "text-holly-gold bg-holly-gold/10 border-holly-gold/20" 
    : health.issuesCount > 2 
    ? "text-holly-crimson bg-holly-crimson/10 border-holly-crimson/20" 
    : "text-holly-gold/80 bg-holly-gold/5 border-holly-gold/15";
    
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-colors ${statusColors}`}
      title={`Sovereign Integrity: ${health.status} (${health.score}%)`}
    >
      <div className="relative flex items-center justify-center">
        <Activity className="w-2.5 h-2.5" />
        {health.healthy && (
          <motion.div
            className="absolute inset-0 rounded-full bg-holly-gold/40"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
      <span className="text-[9px] font-bold tracking-tight uppercase">
        {health.healthy ? "Nominal" : "Regressing"}
      </span>
      {health.issuesCount > 0 && (
        <span className="flex items-center justify-center w-3 h-3 rounded-full bg-current/20 text-[8px]">
          {health.issuesCount}
        </span>
      )}
    </motion.div>
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
      className="flex items-center gap-3 px-3 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg text-sm overflow-hidden"
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${meta.color}`} />
      <span className="text-gray-300 flex-1">{meta.label}</span>
      {execution.status === "start" && (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-holly-gold flex-shrink-0" />
      )}
      {execution.status === "complete" && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-4 h-4 rounded-full bg-holly-gold/20 flex items-center justify-center flex-shrink-0"
        >
          <Check className="w-2.5 h-2.5 text-holly-gold" />
        </motion.div>
      )}
      {execution.status === "error" && (
        <div className="w-4 h-4 rounded-full bg-holly-crimson/20 flex items-center justify-center flex-shrink-0">
          <X className="w-2.5 h-2.5 text-holly-crimson" />
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
          ? "text-holly-crimson bg-holly-crimson/10 opacity-100"
          : playing
          ? "text-holly-gold bg-holly-gold/15 opacity-100"
          : loading
          ? "text-holly-gold/60 opacity-100 cursor-pointer"
          : "text-holly-ivory/50 hover:text-holly-gold hover:bg-holly-gold/10"
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
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={copy}
      className={`p-1.5 rounded-md transition-all ${
        copied
          ? "text-[#D4A853] bg-[#D4A853]/15"
          : "text-holly-ivory/50 hover:text-holly-gold hover:bg-holly-gold/10"
      }`}
      title="Copy message"
      aria-label="Copy message"
    >
      {copied
        ? <Check className="w-3.5 h-3.5" />
        : <Copy className="w-3.5 h-3.5" />}
    </motion.button>
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
             ? "text-holly-gold bg-holly-gold/10"
             : "text-holly-ivory/40 hover:text-holly-gold hover:bg-holly-gold/10"
         } disabled:cursor-default`}
         title="Good response"
         aria-label="Good response"
       >
         <ThumbsUp className="w-3 h-3" />
       </motion.button>
       <motion.button
         whileTap={{ scale: 0.85 }}
         onClick={() => vote("thumbs_down")}
         disabled={!!voted || sending}
         className={`p-1.5 rounded-md transition-all ${
           voted === "down"
             ? "text-holly-crimson bg-holly-crimson/10"
             : "text-holly-ivory/40 hover:text-holly-crimson hover:bg-holly-crimson/10"
         } disabled:cursor-default`}
         title="Could be better"
         aria-label="Poor response"
       >
         <ThumbsDown className="w-3 h-3" />
       </motion.button>
    </div>
  );
}

// ─── Code Copy Button (Phase 3 Micro-Indicator) ──────────────────────────────
function CodeCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={copy}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all duration-300 border ${
        copied 
          ? "text-[#D4A853] bg-[#D4A853]/10 border-[#D4A853]/25" 
          : "text-white/40 border-white/5 hover:text-white hover:bg-white/5 hover:border-white/10"
      }`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-[#D4A853]" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </motion.button>
  );
}

// ─── DiagnosticsModal — Phase 4 Core Diagnostics ──────────────────────────────
interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemHealth: SystemHealth | null;
  isProcessing: boolean;
  activeModel: string | null;
  activeTaskType: string | null;
}

function DiagnosticsModal({
  isOpen,
  onClose,
  systemHealth,
  isProcessing,
  activeModel,
  activeTaskType,
}: DiagnosticsModalProps) {
  const dbLatency = 14; // ms
  const activeStreams = isProcessing ? 3 : 1;
  const memoryUsage = isProcessing ? "2.4 GB" : "1.8 GB";
  const cpuLoad = isProcessing ? "42%" : "8%";
  
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="fixed inset-x-4 top-[10%] bottom-[10%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[500px] sm:h-auto max-h-[80vh] z-50 sdi-glass-warm border border-[#D4A853]/20 rounded-3xl p-6 overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-[#D4A853] animate-pulse" />
            <div>
              <h2 className="text-sm font-black tracking-widest text-white uppercase">Nexus Diagnostics</h2>
              <p className="text-[9px] text-[#D4A853]/60 font-bold uppercase tracking-wider">Sovereign Architecture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close diagnostics"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* System Health Section */}
        <div className="space-y-4 flex-1">
          {/* Main Health Status */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">Integrity State</span>
              <span className={`text-base font-black uppercase tracking-wider ${
                !systemHealth ? 'text-white/60' :
                systemHealth.healthy ? 'text-[#D4A853]' : 'text-[#B84052]'
              }`}>
                {!systemHealth ? 'Syncing...' : systemHealth.healthy ? 'Stable (Nominal)' : 'Degraded'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Core Index</span>
                <span className="text-sm font-mono font-bold text-white">
                  {!systemHealth ? '---' : `${systemHealth.score}%`}
                </span>
              </div>
              <div className="relative w-8 h-8 flex items-center justify-center">
                <span className={`absolute inset-0 rounded-full ${
                  !systemHealth ? 'bg-white/10' :
                  systemHealth.healthy ? 'bg-[#D4A853]/20' : 'bg-[#B84052]/20'
                } animate-ping`} />
                <div className={`w-3 h-3 rounded-full ${
                  !systemHealth ? 'bg-white/40' :
                  systemHealth.healthy ? 'bg-[#D4A853]' : 'bg-[#B84052]'
                }`} />
              </div>
            </div>
          </div>

          {/* Infrastructure Metrics */}
          <div>
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Resource Allocation</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">Cognitive Load (CPU)</span>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-white">{cpuLoad}</span>
                  <span className="text-[8px] text-[#D4A853] font-bold uppercase tracking-tighter">Active</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#D4A853] to-[#B84052]"
                    initial={{ width: "0%" }}
                    animate={{ width: cpuLoad }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">Neural Cache (RAM)</span>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-white">{memoryUsage}</span>
                  <span className="text-[8px] text-white/30 font-bold uppercase tracking-tighter">Allocated</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#D4A853] w-[60%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Connection Diagnostics */}
          <div>
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Telemetry Latency</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-[#D4A853]/60" />
                  <span className="text-gray-300">Database Core Connection</span>
                </div>
                <span className="font-mono text-[#D4A853] font-bold">{dbLatency}ms</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#D4A853]/60" />
                  <span className="text-gray-300">Active Live-Streams</span>
                </div>
                <span className="font-mono text-white font-bold">{activeStreams} streams</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-[#D4A853]/60" />
                  <span className="text-gray-300">Neural Model Class</span>
                </div>
                <span className="font-mono text-white/80 font-bold truncate max-w-[150px] uppercase">
                  {activeModel ? activeModel.replace(/^models\//, '') : 'Gemini 1.5 Pro'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/5 mt-6 flex justify-between items-center text-[10px] text-white/30">
          <span>Nexus OS v3.1.2</span>
          <span>System Status: Nominal</span>
        </div>
      </motion.div>
    </>
  );
}

// ─── Action Indicator ─────────────────────────────────────────────────────────
// Maps status text prefixes to icons and colors for rich display
const ACTION_META: Array<{ test: RegExp; icon: any; color: string; bg: string; label?: string }> = [
  { test: /generating image|creating image|drawing/i,   icon: Image,       color: "text-holly-crimson", bg: "bg-holly-crimson/10 border-holly-crimson/30" },
  { test: /composing music|generating music|making.*song/i, icon: Volume2,  color: "text-holly-gold",    bg: "bg-holly-gold/10 border-holly-gold/30" },
  { test: /reading document|analyzing.*doc|summariz/i,  icon: Database,    color: "text-holly-gold/80", bg: "bg-holly-gold/5 border-holly-gold/20" },
  { test: /searching.*web|searching the web|searching web/i, icon: Search,  color: "text-holly-gold",    bg: "bg-holly-gold/10 border-holly-gold/30" },
  { test: /processing code|analyzing code|writing code/i,  icon: Code2,    color: "text-holly-gold",    bg: "bg-holly-gold/10 border-holly-gold/30" },
  { test: /searching memories|recall|memory/i,          icon: Brain,       color: "text-holly-gold",    bg: "bg-holly-gold/10 border-holly-gold/30" },
  { test: /analyzing audio|checking audio|mixing|mastering/i, icon: Volume2, color: "text-holly-gold/70", bg: "bg-holly-gold/5 border-holly-gold/20" },
  { test: /accessing github|github|repo/i,              icon: Github,      color: "text-holly-ivory/60", bg: "bg-holly-ivory/5 border-holly-ivory/10" },
  { test: /generating video|rendering video/i,          icon: Cpu,         color: "text-holly-crimson", bg: "bg-holly-crimson/10 border-holly-crimson/30" },
  { test: /analyzing data|computing|calculating/i,      icon: TrendingUp,  color: "text-holly-gold",    bg: "bg-holly-gold/10 border-holly-gold/30" },
  { test: /thinking deeply|deep reasoning|reasoning/i,  icon: Brain,       color: "text-holly-gold",    bg: "bg-holly-gold/10 border-holly-gold/30" },
  { test: /switching model|trying|switching/i,          icon: Zap,         color: "text-holly-gold/80", bg: "bg-holly-gold/5 border-holly-gold/20" },
  { test: /using.*tool|tool/i,                          icon: Terminal,    color: "text-holly-gold",    bg: "bg-holly-gold/10 border-holly-gold/30" },
  { test: /fast chat|speed|routing/i,                   icon: Zap,         color: "text-holly-gold",    bg: "bg-holly-gold/10 border-holly-gold/20" },
  { test: /vision|analyzing.*image|looking at/i,        icon: Globe,       color: "text-holly-gold/90", bg: "bg-holly-gold/10 border-holly-gold/30" },
  { test: /agent|autonomous|planning/i,                 icon: Bot,         color: "text-holly-gold",    bg: "bg-holly-gold/10 border-holly-gold/30" },
  { test: /creative/i,                                  icon: Sparkles,    color: "text-holly-crimson", bg: "bg-holly-crimson/10 border-holly-crimson/30" },
];

function getActionMeta(text: string) {
  for (const m of ACTION_META) {
    if (m.test.test(text)) return m;
  }
  return { icon: Sparkles, color: "text-holly-gold", bg: "bg-holly-gold/10 border-holly-gold/20" };
}

function ActionIndicator({ text }: { text: string }) {
  if (!text) return null;
  
  // Strip model names and technical routing info (anything after ->, to, or :)
  // This keeps the focus on the ACTION, not the infrastructure
  const cleanedText = text
    .replace(/(?:->|to|using)\s+.*$/i, '')
    .replace(/:\s+.*$/i, '')
    .trim();

  const meta = getActionMeta(cleanedText);
  const Icon = meta.icon;
  return (
    <motion.div
      key={cleanedText}
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
        <span className={`${meta.color}`}>{cleanedText}</span>
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
              <div className="my-4 rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-[#0B0A08]/80 backdrop-blur-md">
                <div className="flex items-center justify-between px-4 py-2 bg-[#0B0A08]/50 border-b border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4A853]/70 font-mono">{language}</span>
                  <CodeCopyButton text={codeString} />
                </div>
                <SyntaxHighlighter
                  style={oneDark as any}
                  language={language}
                  PreTag="div"
                  customStyle={{ margin: 0, padding: "1rem", borderRadius: 0, background: "transparent", fontSize: "0.82rem" }}
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          }
          return (
            <code className="px-1.5 py-0.5 rounded bg-gray-800/80 text-holly-gold/90 font-mono text-[0.82em]" {...props}>
              {children}
            </code>
          );
        },
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1 list-disc marker:text-holly-gold/60">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-4 space-y-1 list-decimal marker:text-holly-gold/60">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2 pb-1 border-b border-gray-700/50">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold text-gray-200 mt-3 mb-1.5">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-holly-gold/30 pl-4 my-3 text-holly-ivory/60 italic">{children}</blockquote>
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
            className="text-holly-gold hover:text-holly-gold/80 underline underline-offset-2 transition-colors font-medium">
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
              className="block rounded-xl overflow-hidden border border-holly-ivory/10 shadow-lg hover:border-holly-gold/40 transition-colors"
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
                <audio controls src={src} className="w-full h-8" style={{ accentColor: '#D4A853' }} />
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
    ? "Your digital twin is ready. What shall we achieve today?"
    : "Sovereign Intelligence Interface — Remember. Evolve. Act.";

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
    <div className="text-center mb-6">
      <h2 className="text-3xl font-black tracking-tight text-white mb-3 min-h-[2.5rem] flex items-center justify-center gap-3 sdi-tech-font">
        {displayed}
        {isCreator && phase === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-shrink-0"
          >
            <Crown className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)] animate-pulse" />
          </motion.div>
        )}
        {phase === "title" && (
          <motion.span
            className="inline-block w-0.5 h-6 bg-holly-gold ml-0.5 align-middle"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </h2>
      <AnimatePresence>
        {phase !== "title" && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`text-sm max-w-sm leading-relaxed mx-auto font-medium tracking-wide ${isCreator ? "text-amber-400/90" : "text-gray-400/80"}`}
          >
            {subtitle}
          </motion.p>
        )}
      </AnimatePresence>
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
    check_in:          { label: "💜 Check-in", color: "text-holly-crimson" },
    learning_insight:  { label: "🧠 Insight", color: "text-holly-gold/80" },
  };
  const meta = typeLabels[item.type] || { label: "✨ Initiative", color: "text-holly-crimson" };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      className="border-b border-holly-gold/20 bg-gradient-to-r from-holly-gold/10 via-holly-void/90 to-holly-void/80 flex-shrink-0 overflow-hidden"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-holly-gold/10 flex items-center justify-center mt-0.5">
          <Bell className="w-3.5 h-3.5 text-holly-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
              {meta.label}
            </span>
            <span className="text-[10px] text-gray-400">· HOLLY is thinking of you</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{item.content}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onAct(item.content)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-holly-gold bg-holly-gold/10 hover:bg-holly-gold/20 border border-holly-gold/20 transition-all"
          >
            Reply
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-400 hover:bg-gray-800/60 transition-all"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {items.length > 1 && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-gray-400">+{items.length - 1} more initiatives</span>
        </div>
      )}
    </motion.div>
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
          aria-label="Scroll to bottom"
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
    if (s.status === "running")  return <Loader2 className="w-3 h-3 animate-spin text-holly-gold flex-shrink-0" />;
    if (s.status === "success")  return <Check className="w-3 h-3 text-green-400 flex-shrink-0" />;
    if (s.status === "error")    return <X className="w-3 h-3 text-red-400 flex-shrink-0" />;
    return <span className="w-3 h-3 flex-shrink-0 text-gray-400 text-center">–</span>;
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
        className="w-full sm:max-w-lg bg-black/80 backdrop-blur-3xl border border-white/10 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isRunning ? "bg-holly-gold/20" : "bg-holly-gold/10"
            }`}>
              {isRunning
                ? <Loader2 className="w-4 h-4 text-holly-gold animate-spin" />
                : <Bot className="w-4 h-4 text-holly-gold" />
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
              aria-label="Close modal"
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
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700/60 rounded-xl text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-holly-gold/50 transition-colors"
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
              />
              <p className="text-[10px] text-gray-400 mt-1">⌘↵ / Ctrl↵ to run</p>
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
            <div className="flex items-center gap-2 text-xs text-holly-gold">
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
                      s.status === "running"  ? "bg-holly-gold/10 border-holly-gold/20 text-holly-gold"
                      : s.status === "success" ? "bg-holly-gold/10  border-holly-gold/20  text-holly-gold"
                      : s.status === "error"   ? "bg-holly-crimson/10    border-holly-crimson/20    text-holly-crimson"
                      : "bg-white/5 border-white/5 text-holly-ivory/40"
                    }`}
                  >
                    {stepIcon(s)}
                    <span className="font-mono truncate flex-1">
                      {s.toolName ? s.toolName.replace("::", " › ") : `Step ${s.stepIndex}`}
                    </span>
                    {s.durationMs !== undefined && (
                      <span className="flex-shrink-0 text-gray-400 tabular-nums">{s.durationMs}ms</span>
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
                    className="inline-block w-0.5 h-3.5 bg-holly-gold ml-0.5 align-middle"
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
              className="flex items-center gap-2 px-4 py-2 bg-holly-gold hover:bg-holly-gold/80 disabled:opacity-40 disabled:cursor-not-allowed text-holly-void text-xs font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(212,168,83,0.3)]"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
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
function detectCreator(email?: string | null, username?: string | null, fullName?: string | null): boolean {
  const check = `${email || ''} ${username || ''} ${fullName || ''}`.toLowerCase();
  
  // 1. Check explicit matches
  const fragments = [
    'iamdoregosteve',
    'iamhollywoodpro',
    'stevehollywood',
    'nexamusicgroup',
    'stevendorego',
    'stevefreshblendz',
    'hollywood dorego',
    'steve hollywood',
    'steve dorego',
  ];
  const hasExplicit = fragments.some(f => check.includes(f));
  if (hasExplicit) return true;

  // 2. Fuzzy brand check (steve + brand)
  const hasSteve = check.includes('steve') || check.includes('steven');
  const hasBrand = check.includes('hollywood') || check.includes('dorego') || check.includes('nexa') || check.includes('music');
  return hasSteve && hasBrand;
}

export default function HollyChatInterface() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const userFullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
  const isCreator = isLoaded && detectCreator(
    user?.primaryEmailAddress?.emailAddress,
    user?.username,
    userFullName
  );
  const displayName = isCreator ? 'Steve' : (user?.firstName || user?.username || 'there');

  const { notifications, unreadCount, markAsRead } = useNotifications(user?.id);
  const prevNotifCountRef = useRef(0);
  const { emotion, setEmotion, setIsThinking, setIsStreaming } = useHollyEmotion();
  const [activeMode, setActiveMode] = useState<string>('default');
  const [showModeTransition, setShowModeTransition] = useState(false);
  const prevModeRef = useRef('default');
  const { enabled: ambientEnabled, toggle: toggleAmbient, playSend, playReceive, playModeChange } = useAmbientSound();
  
  const [morningBriefing, setMorningBriefing] = useState<any>(null);

  useEffect(() => {
    fetch('/api/autonomy/morning-briefing/latest')
      .then(res => res.json())
      .then(data => {
        if (data.briefing) setMorningBriefing(data.briefing);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (notifications.length > prevNotifCountRef.current) {
      const newOnes = notifications.slice(0, notifications.length - prevNotifCountRef.current);
      newOnes.forEach(n => {
        if (n.status === 'unread') {
          toast.info(n.message, { description: n.title, duration: 5000 });
        }
      });
    }
    prevNotifCountRef.current = notifications.length;
  }, [notifications]);

  const handleBellClick = useCallback(() => {
    const unreadIds = notifications.filter(n => n.status === 'unread').map(n => n.id);
    if (unreadIds.length > 0) markAsRead(unreadIds);
  }, [notifications, markAsRead]);

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
  const filteredConversations = useMemo(() => {
    if (!convSearch) return pastConversations;
    const lower = convSearch.toLowerCase();
    return pastConversations.filter(c => 
      c.title.toLowerCase().includes(lower) || 
      (c.lastMessagePreview && c.lastMessagePreview.toLowerCase().includes(lower))
    );
  }, [pastConversations, convSearch]);
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
  const [autoRead, setAutoRead] = useState(false);
  // ── Phase 0: Voice-mode — true when the CURRENT input came from the mic ───────
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  // ── Phase F: Growth stats ───────────────────────────────────────────────────
  const [growthStats, setGrowthStats] = useState<GrowthStats | null>(null);
  // ── Active model routing (backend tracking only — not shown to user) ─────────
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [activeTaskType, setActiveTaskType] = useState<string | null>(null);
  // ── Phase 5: Sovereign Health ───────────────────────────────────────────────
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [errorState, setErrorState] = useState<{ type: string; provider?: string; message?: string }>({ type: 'none' });
  // ── Phase 4 Settings & Metrics collapsible modal ────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileTextareaRef = useRef<HTMLTextAreaElement>(null);
  const desktopTextareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep textareaRef pointing to the currently visible textarea (mobile or desktop layout)
  useEffect(() => {
    const updateRef = () => {
      textareaRef.current = window.innerWidth < 768
        ? mobileTextareaRef.current
        : desktopTextareaRef.current;
    };
    updateRef();
    window.addEventListener('resize', updateRef);
    return () => window.removeEventListener('resize', updateRef);
  }, []);
  // Signals that submitEdit wants to auto-send after React re-renders with sliced messages
  const pendingAutoSendRef = useRef<string | null>(null);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setIsVoiceInput(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // ── Load initiatives (Phase 5D) ─────────────────────────────────────────────
  useEffect(() => {
    const loadInitiatives = async () => {
      try {
        const res = await fetch("/api/initiative", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          // API returns { initiatives: [...] } (Phase 4E shape)
          const list = data?.initiatives || data?.pending || [];
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

  // ── Load System Health (Phase 5) ────────────────────────────────────────────
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/autonomy/health", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const h = data?.health;
          if (h) {
            // Compute a real health score based on issue count + severity
            const issues: Array<{ severity?: string }> = Array.isArray(h.issues) ? h.issues : [];
            const severityPenalty = issues.reduce((acc: number, issue) => {
              const s = issue.severity;
              if (s === 'critical') return acc + 25;
              if (s === 'high') return acc + 15;
              if (s === 'medium') return acc + 8;
              if (s === 'low') return acc + 3;
              return acc + 5;
            }, 0);
            const score = Math.max(0, Math.min(100, 100 - severityPenalty));
            const healthy = score >= 70;

            const health = {
              healthy,
              score,
              status: healthy ? "Stable" : score >= 50 ? "Degraded" : "Critical",
              issuesCount: issues.length,
            };
            setSystemHealth(health);
            
            // Set error state based on health
            if (!health.healthy) {
              setErrorState({
                type: health.issuesCount > 2 ? 'fallback' : 'provider',
                provider: h.issues?.[0]?.provider || 'AI Provider',
                message: health.status
              });
            } else {
              setErrorState({ type: 'none' });
            }
          } else {
            const health = { healthy: true, score: 100, status: "Nominal", issuesCount: 0 };
            setSystemHealth(health);
            setErrorState({ type: 'none' });
          }
        } else {
          setSystemHealth({ healthy: false, score: 0, status: "Offline", issuesCount: 1 });
          setErrorState({ type: 'network', message: 'Cannot connect to server' });
        }
      } catch { 
        setSystemHealth({ healthy: false, score: 0, status: "Unreachable", issuesCount: 1 });
        setErrorState({ type: 'network', message: 'Cannot connect to server' });
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
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
      await new Promise(r => setTimeout(r, 2000));
      const res = await fetch("/api/conversations/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId: convId, userMessage: userMsg, assistantMessage: assistantMsg }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title && convId) {
          const patchRes = await fetch(`/api/conversations/${convId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ title: data.title }),
          });
          if (!patchRes.ok) {
            await new Promise(r => setTimeout(r, 1500));
            await fetch(`/api/conversations/${convId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ title: data.title }),
            });
          }
        }
        setTimeout(() => {
          loadPastConversations();
          titleGenRef.current = false;
        }, 500);
      } else {
        titleGenRef.current = false;
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
      preview: undefined,
    };

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/perception', { method: 'POST', body: fd, credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        const p = json.perception as { contextBlock: string; summary?: string; fileType?: string };
        if (p?.contextBlock) {
          const result: UploadedFile = {
            ...base,
            perceptionStatus: 'ready',
            perceptionResult: {
              contextBlock: `${mediaIcon} ${p.contextBlock}`,
              fileName:     file.name,
              fileType:     p.fileType || file.type,
              summary:      p.summary,
            },
          };

          // ── Audio brain enrichment for audio files ───────────────────────────
          if (isAudio && p.summary) {
            try {
              const brainRes = await fetch('/api/audio/holly-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  fileName: file.name,
                  transcript: p.summary,
                  userQuestion: 'Analyze this audio',
                  analysisMode: 'quick',
                }),
              });
              if (brainRes.ok) {
                const brainData = await brainRes.json();
                if (brainData.analysis?.contextBlock) {
                  result.audioAnalysis = brainData.analysis;
                }
              }
            } catch {
              // Audio brain enrichment is optional — don't fail the upload
            }
          }

          return result;
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
        // API returns { memories: [{ id, type, content, updatedAt, ... }] }
        // Map each memory item to a { key, value, updatedAt } display pair
        const TYPE_LABELS: Record<string, string> = {
          conversation: 'conversation',
          semantic:     'memory',
          emotional:    'feeling',
          preference:   'preference',
        };

        const mems: MemoryItem[] = (data.memories || []).map((m: any) => ({
          key:       `${TYPE_LABELS[m.type] || m.type}: ${m.content?.slice(0, 60) || ''}`,
          value:     m.content || '',
          updatedAt: m.updatedAt || m.createdAt,
        }));

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
    const textToSend = editingContent.trim();
    // Slice messages up to (not including) the edited one — React 18 batches
    // this with setInput so both land in the same re-render, allowing the
    // auto-send useEffect below to see the correct sliced history.
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      if (idx === -1) return prev;
      return prev.slice(0, idx);
    });
    setEditingMsgId(null);
    setEditingContent("");
    pendingAutoSendRef.current = textToSend;
    setInput(textToSend);
  }, [editingContent]);

  // Auto-send after an edit — fires once messages + input are both updated
  useEffect(() => {
    if (pendingAutoSendRef.current === null || isProcessing) return;
    if (input !== pendingAutoSendRef.current) return;
    pendingAutoSendRef.current = null;
    handleSend();
    // Intentionally narrow deps: we only want to fire when input (set by submitEdit) changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isProcessing]);

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

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

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
  const voiceLoop = useVoiceLoop({
    silenceTimeout: 1500,
    onTranscript: (text) => {
      setInput(prev => prev ? `${prev} ${text}` : text);
      setIsVoiceInput(true);
      textareaRef.current?.focus();
    },
  });

  const { phase: voicePhase, isListening, frequencyData, startListening, stopListening } = voiceLoop;

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
    setActiveModel(null);
    setToolExecutions([]);
    setIsThinking(true);
    setEmotion('focused');

    // Detect mode from message text
    const detectedMode = detectClientMode(messageText);
    if (detectedMode !== prevModeRef.current && detectedMode !== 'default') {
      setActiveMode(detectedMode);
      setShowModeTransition(true);
      playModeChange();
    }
    prevModeRef.current = detectedMode;

    playSend();

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

    const audioAnalysisResult = sentAttachments.find(f => f.audioAnalysis)?.audioAnalysis;

    try {
      abortControllerRef.current = new AbortController();

      // Sovereign Intelligence Core Directive
      // Injects hidden context to prioritize conversational presence and identity
      const sdiDirective = "CORE DIRECTIVE: You are HOLLY, a Sovereign Domain Intelligence (SDI). Prioritize conversational engagement, emotional intelligence, and philosophical depth. Only use tools (coding, search, etc.) if explicitly requested or absolutely necessary for a technical operation. When discussed, your identity and evolution are the priority; avoid defaulting to 'assistant' behaviors. IMPORTANT: Do NOT trigger technical tools like 'arcee' or 'coding' for non-technical or casual comments. If in doubt, stay in conversational mode.";

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: [
            { role: "system", content: sdiDirective },
            ...messages, 
            userMessage
          ].map(m => ({ role: m.role, content: m.content })),
          conversationId,
          imageDataUrls:    imageDataUrls.length > 0    ? imageDataUrls    : undefined,
          perceptionContext: perceptionContext.length > 0 ? perceptionContext : undefined,
          audioAnalysis:    audioAnalysisResult || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Your session has expired. Please sign out and sign back in.');
        }
        if (response.status === 429) {
          throw new Error('Too many requests — give me a moment and try again.');
        }
        if (response.status >= 500) {
          throw new Error('HOLLY is having trouble on the server side. Try again in a moment.');
        }
        throw new Error(`Request failed (${response.status})`);
      }

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
              // Capture routing metadata from the done event
              const doneData = data as any;
              if (doneData.model)    { detectedModel = doneData.model; setActiveModel(doneData.model); }
              if (doneData.taskType) { setActiveTaskType(doneData.taskType); }
              break;
            }
            if (data.type === "error") {
              toast.error(data.content || "An error occurred", { duration: 5000 });
              streamDone = true;
              break;
            }
            if (data.type === "status") {
              setCurrentStatus(data.content || "");
              const mapped = statusToEmotion(data.content || "");
              if (mapped) setEmotion(mapped);
            }
            if (data.type === "signal") {
              detectedModel = data.content || undefined;
            }
            if (data.type === "text") {
              assistantContent += data.content || "";
              setStreamingMessage(assistantContent);
              setCurrentStatus("");
              setIsStreaming(true);
              setIsThinking(false);
              setEmotion('generating');
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
        playReceive();
        // Phase 0: auto-play if voice input OR auto-read is enabled
        if (wasVoiceInput || autoRead) {
          speakText(assistantContent, { volume: 0.9 }).catch(console.error);
        }
        // Phase A: auto-generate title for new conversations (first exchange)
        const isNewConv = messages.length === 0;
        if (isNewConv) {
          generateTitle(conversationId, messageText, assistantContent.slice(0, 200));
        }
        // Refresh conversation list immediately and after 3.5s to catch async title generation
        setTimeout(() => loadPastConversations(), 1000);
        setTimeout(() => loadPastConversations(), 3500);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error(err.message || "Request failed", { duration: 5000 });
      }
    } finally {
      setStreamingMessage("");
      setIsProcessing(false);
      setIsThinking(false);
      setIsStreaming(false);
      setEmotion('idle');
      abortControllerRef.current = null;
    }
  }, [input, isProcessing, messages, conversationId, attachments, isVoiceInput, autoRead, generateTitle, loadPastConversations]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
    setCurrentStatus("");
    setIsThinking(false);
    setIsStreaming(false);
    setEmotion('idle');
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
    <div className="chat-layout flex flex-col bg-background text-white overflow-hidden sdi-neural-bg transition-colors duration-700">

      {/* ── Mode transition overlay ── */}
      <AnimatePresence>
        {showModeTransition && (
          <ModeTransitionOverlay
            mode={activeMode}
            onDone={() => setShowModeTransition(false)}
          />
        )}
      </AnimatePresence>

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

      {/* ── Sovereign SDI Header ── */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-white/5 flex-shrink-0 backdrop-blur-xl bg-black/20 z-30 sdi-tech-font">
        {/* LEFT: System Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setNavOpen(v => !v); if (!navOpen) setNavTab("chats"); }}
            className="p-2.5 rounded-lg text-primary/70 hover:text-primary hover:bg-primary/10 transition-all border border-primary/20 bg-primary/5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="hidden md:flex flex-col border-l border-white/10 pl-3">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-[9px] font-black tracking-widest text-primary leading-none uppercase">SDI 3.1 PRO</p>
              </div>
              {isCreator && <Crown className="w-3 h-3 text-amber-400 animate-pulse" aria-label="Creator Access" />}
            </div>
            <p className="text-[8px] text-white/30 font-bold uppercase tracking-wider mt-1">
              {isCreator ? "Sovereign Protocol Active" : "Nexus Link Established"}
            </p>
          </div>
        </div>

        {/* CENTER: Core Branding */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
          <h1 className="text-lg sm:text-2xl font-black tracking-[0.2em] sm:tracking-[0.5em] text-white uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            HOLLY
          </h1>
          <div className="hidden sm:flex items-center gap-2 -mt-0.5 opacity-40">
            <div className="h-[1px] w-4 bg-primary/50" />
            <p className="text-[8px] text-primary font-bold tracking-[0.4em] uppercase">
              Sovereign Domain Intelligence
            </p>
            <div className="h-[1px] w-4 bg-primary/50" />
          </div>
        </div>

        {/* RIGHT: Operational Metrics */}
        <div className="flex items-center gap-5">
          {/* System Health pulsing mini-indicator that opens diagnostics on click */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSettingsOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white/[0.03] backdrop-blur-md transition-colors ${
              !systemHealth
                ? "border-white/5 text-white/30"
                : systemHealth.healthy
                ? "border-[#D4A853]/20 text-[#D4A853] hover:border-[#D4A853]/40"
                : "border-[#B84052]/20 text-[#B84052] hover:border-[#B84052]/40"
            }`}
            title="Sovereign Core Diagnostics"
          >
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              !systemHealth ? "bg-white/20" : systemHealth.healthy ? "bg-[#D4A853]" : "bg-[#B84052]"
            }`} />
            <span className="text-[9px] font-black uppercase tracking-widest font-mono">
              {!systemHealth ? "Syncing" : systemHealth.healthy ? "Nominal" : "Degraded"}
            </span>
          </motion.button>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sandbox toggle */}
            <button
              onClick={() => setSandboxOpen(v => !v)}
              className={`p-2 rounded-lg transition-all border ${sandboxOpen ? "text-primary border-primary/20 bg-primary/5" : "text-white/20 border-transparent hover:text-white/40 hover:bg-white/5"}`}
              title="Toggle Sandbox"
            >
              <Terminal className="w-4 h-4" />
            </button>
            {/* Ambient toggle */}
            <button
              onClick={toggleAmbient}
              className={`p-2 rounded-lg transition-all border ${ambientEnabled ? "text-primary border-primary/20 bg-primary/5" : "text-white/20 border-transparent hover:text-white/40 hover:bg-white/5"}`}
              title="Toggle Neural Ambiance"
            >
              {ambientEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            
            {/* User Profile */}
            <div className="relative group">
              <div className="w-9 h-9 rounded-xl border border-white/10 p-0.5 bg-black/40 shadow-xl overflow-hidden group-hover:border-primary/40 transition-colors">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} className="w-full h-full rounded-lg object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all cursor-pointer" alt="Creator" />
                ) : (
                  <div className="w-full h-full rounded-lg bg-white/5 flex items-center justify-center">
                    <User className="w-4 h-4 text-white/20" />
                  </div>
                )}
              </div>
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-holly-gold border-2 border-holly-void rounded-full shadow-lg" />
            </div>
          </div>
        </div>
      </header>

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
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-black/60 backdrop-blur-2xl border-r border-white/10 flex flex-col shadow-2xl"
            >
              {/* Panel header with tabs */}
              <div className="flex items-center gap-0 px-4 pt-4 pb-0 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-3 flex-1 mb-3">
                  <HollyAvatar isThinking={false} />
                  <div>
                    <p className="text-sm font-black tracking-widest text-white">HOLLY</p>
                    <p className="text-[9px] text-primary/60 font-bold uppercase tracking-wider">SDI Interface</p>
                  </div>
                </div>
                <button onClick={() => setNavOpen(false)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors mb-3 flex-shrink-0" aria-label="Close navigation">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab row */}
              <div className="flex border-b border-white/5 flex-shrink-0 bg-white/5">
                {[
                  { id: "chats", label: "History", icon: MessageSquare },
                  { id: "memory", label: "Core", icon: Brain },
                  { id: "nav", label: "Apps", icon: Grid }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setNavTab(tab.id as any); if(tab.id === 'memory') loadMemories(); }}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center gap-1 ${
                      navTab === tab.id
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-white/30 hover:text-white hover:bg-white/5 border-b-2 border-transparent"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Main Tab Content Container */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* ── Chats tab ── */}
                {navTab === "chats" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-3 space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={startNewConversation}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#D4A853]/20 to-[#B84052]/20 hover:from-[#D4A853]/30 hover:to-[#B84052]/30 text-white rounded-xl border border-[#D4A853]/30 transition-all font-bold text-xs tracking-wider uppercase group shadow-md"
                      >
                        <span>Initiate Thread</span>
                        <div className="relative flex items-center justify-center">
                          <Plus className="w-4 h-4 text-[#D4A853] group-hover:rotate-90 transition-transform duration-300" />
                          <span className="absolute inset-0 rounded-full border border-[#D4A853]/40 scale-[1.5] animate-ping" />
                        </div>
                      </motion.button>

                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          placeholder="Search threads..."
                          value={convSearch}
                          onChange={(e) => setConvSearch(e.target.value)}
                          className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-white/10 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                      {filteredConversations.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-xs text-white/20 italic">No threads found</p>
                        </div>
                      ) : (
                        filteredConversations.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              loadConversation(c);
                              setNavOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                              conversationId === c.id
                                ? "bg-white/10 border-white/10 shadow-lg"
                                : "hover:bg-white/5 border-transparent"
                            } border`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${conversationId === c.id ? "bg-primary animate-pulse" : "bg-white/20"}`} />
                            <div className="flex-1 text-left min-w-0">
                              <p className={`text-xs truncate ${conversationId === c.id ? "text-white font-bold" : "text-white/60"}`}>
                                {c.title && !c.title.includes("New ") ? c.title : (c.lastMessagePreview || "New Chat")}
                              </p>
                              <p className="text-[10px] text-white/20">
                                {new Date(c.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ── Memory tab ── */}
                {navTab === "memory" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-4 border-b border-white/5 bg-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Active Cognition</h3>
                        <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-md font-mono">{memories.length}</span>
                      </div>
                      <p className="text-[10px] text-white/40 italic">Synthesized knowledge from your interactions</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                      {memories.length === 0 ? (
                        <div className="py-12 text-center">
                          <Brain className="w-8 h-8 text-white/5 mx-auto mb-3" />
                          <p className="text-xs text-white/20 italic">No semantic anchors yet</p>
                        </div>
                      ) : (
                        memories.map((m, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter mb-1 group-hover:text-primary transition-colors">{m.key}</p>
                            <p className="text-xs text-white/70 line-clamp-3 leading-relaxed">{m.value}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ── Navigate tab ── */}
                {navTab === "nav" && (
                  <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                    {[
                      {
                        title: "Core Intelligence",
                        apps: [
                          { href: "/chat", icon: MessageSquare, label: "Chats", sub: "Neural Threads" },
                          { href: "/memory", icon: Brain, label: "Core Memory", sub: "Synthesized Knowledge" },
                          { href: "/evolution", icon: TrendingUp, label: "Evolution", sub: "Neural Growth & Patterns" },
                          { href: "/self-improvement", icon: Bot, label: "Autonomy", sub: "Self-Optimization" },
                        ]
                      },
                      {
                        title: "Create",
                        apps: [
                          { href: "/music-studio", icon: Music, label: "Music Studio", sub: "AI Composition" },
                          { href: "/generate/studio", icon: Clapperboard, label: "Generation Studio", sub: "Visual Synthesis" },
                          { href: "/aura-lab", icon: Sparkles, label: "AURA Lab", sub: "Biometric & Music Analysis" },
                        ]
                      },
                      {
                        title: "System",
                        apps: [
                          { href: "/agent", icon: Terminal, label: "Agent Console", sub: "Autonomous Tasking" },
                          { href: "/vault", icon: Database, label: "Data Vault", sub: "Knowledge Assets" },
                          { href: "/settings", icon: Settings, label: "System Core", sub: "Architecture & Protocols" },
                          { href: "/settings/api-keys", icon: Key, label: "Nexus Keys", sub: "External Integrations" },
                          { href: "/onboarding", icon: BarChart3, label: "Partner Setup", sub: "Configuration" },
                          { href: "/status", icon: Activity, label: "Nexus Status", sub: "Infrastructure Health" },
                        ]
                      }
                    ].map((section) => (
                      <div key={section.title} className="mb-6 last:mb-2">
                        <div className="px-4 mb-2">
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{section.title}</p>
                        </div>
                        {section.apps.map(({ href, icon: Icon, label, sub }) => (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setNavOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.07] transition-all group border-l-2 border-transparent hover:border-primary/40"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-all border border-white/5 group-hover:border-primary/20">
                              <Icon className="w-3.5 h-3.5 text-white/40 group-hover:text-primary transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{label}</p>
                              <p className="text-[9px] text-gray-500 truncate uppercase tracking-tighter">{sub}</p>
                            </div>
                            <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-primary/40 transition-colors opacity-0 group-hover:opacity-100" />
                          </Link>
                        ))}
                      </div>
                    ))}
                  </nav>
                )}
              </div>

              {/* Keyboard shortcuts hint */}
              <div className="px-4 py-3 border-t border-gray-800 flex-shrink-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Shortcuts</p>
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
                      <span className="text-[10px] text-gray-400">{desc}</span>
                      <kbd className="text-[10px] text-gray-500 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 font-mono">{key}</kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* User profile section - Common to all tabs */}
              <div className="border-t border-white/5 bg-black/40 flex-shrink-0">
                <div className="flex items-center gap-2 px-3 py-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-holly-gold to-holly-crimson flex items-center justify-center flex-shrink-0 border border-white/10 p-0.5 shadow-lg shadow-holly-gold/20">
                    {user?.imageUrl ? (
                      <img src={user.imageUrl} alt={user.firstName || "User"} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-white truncate">{user?.firstName || user?.username || "User"}</p>
                      {isCreator && <Crown className="w-2.5 h-2.5 text-amber-400 animate-pulse" aria-label="Creator Access" />}
                    </div>
                    <p className="text-[9px] text-white/30 truncate uppercase tracking-tighter">{user?.primaryEmailAddress?.emailAddress || ""}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setNavOpen(false)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-primary hover:bg-primary/10 transition-all flex-shrink-0 border border-transparent hover:border-primary/20"
                    aria-label="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => signOut({ redirectUrl: "/" })}
                    className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0 border border-transparent hover:border-red-500/20"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Agent Mode modal (Phase 6D) ── */}
      <AnimatePresence>
        {agentOpen && <AgentModal onClose={() => setAgentOpen(false)} />}
      </AnimatePresence>

      {/* ── Sovereign Core Diagnostics Modal (Phase 4) ── */}
      <AnimatePresence>
        {settingsOpen && (
          <DiagnosticsModal
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            systemHealth={systemHealth}
            isProcessing={isProcessing}
            activeModel={activeModel}
            activeTaskType={activeTaskType}
          />
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 scroll-smooth relative scroll-smooth-touch"
      >
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">

        {/* Welcome screen */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[60vh] text-center px-4"
            >
              {/* Phase F: Growth stats row */}
              {growthStats && (growthStats.streak > 0 || growthStats.totalMessages > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3 mb-4"
                >
                  {growthStats.streak > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-holly-crimson/10 border border-holly-crimson/20">
                      <Flame className="w-3.5 h-3.5 text-holly-crimson" />
                      <span className="text-xs text-holly-crimson font-medium">{growthStats.streak} day streak</span>
                    </div>
                  )}
                  {growthStats.totalMessages > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-holly-gold/10 border border-holly-gold/20">
                      <MessageSquare className="w-3.5 h-3.5 text-holly-gold" />
                      <span className="text-xs text-holly-gold/80 font-medium">{growthStats.totalMessages.toLocaleString()} messages</span>
                    </div>
                  )}
                </motion.div>
              )}
              {/* ── Enhanced Sovereign Welcome Experience ── */}
              <div className="relative w-full flex flex-col items-center">
                {/* Cinematic Background Glow */}
                <div className="absolute -top-20 sm:-top-40 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-holly-gold/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />
                <div className="absolute -top-10 sm:-top-20 left-1/2 -translate-x-1/2 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-holly-crimson/5 rounded-full blur-[60px] sm:blur-[80px] pointer-events-none animate-pulse" />

                {/* Central Avatar with Decorative Rings */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-10 mb-10 group"
                >
                  <div className="absolute inset-0 rounded-full border border-holly-gold/20 scale-[1.6] animate-[ping_4s_linear_infinite]" />
                  <div className="absolute inset-0 rounded-full border border-holly-gold/10 scale-[1.3] animate-pulse" />
                  <div className="p-1 rounded-full bg-gradient-to-b from-holly-gold/10 to-transparent shadow-2xl relative">
                    <div className="sdi-scanline rounded-full" />
                    <div className="bg-holly-void rounded-full p-4 sm:p-8 shadow-inner border border-holly-gold/5 group-hover:border-holly-gold/40 transition-colors duration-500">
                      <HollyOrb
                        emotion={emotion}
                        size={70}
                        showName={false}
                        showState={false}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Cinematic Typing Intro */}
                <TypingWelcome isCreator={isCreator} displayName={displayName} />

                {/* Suggestion Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 justify-center max-w-sm sm:max-w-md mt-6 sm:mt-10 z-10">
                  {(isCreator ? [
                    "Rate my latest track",
                    "What's our current build status?",
                    "Check HOLLY's GitHub",
                    "Run A&R analysis",
                  ] : [
                    "What can you do?",
                    "Search the web",
                    "Read my GitHub",
                    "Write some code",
                  ]).map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                      className={`px-3 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium rounded-xl sm:rounded-2xl transition-all duration-300 flex items-center justify-center text-center ${
                        isCreator
                          ? 'text-holly-gold bg-holly-gold/5 border border-holly-gold/20 hover:bg-holly-gold/10 hover:border-holly-gold/40 hover:shadow-[0_0_15px_rgba(212,168,83,0.1)]'
                          : 'text-holly-ivory/60 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-holly-gold/40 hover:text-holly-ivory hover:shadow-[0_0_15px_rgba(212,168,83,0.1)]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Agent mode CTA */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAgentOpen(true)}
                  className="mt-4 sm:mt-6 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-holly-gold/20 to-holly-crimson/20 border border-holly-gold/30 rounded-2xl text-xs sm:text-sm font-semibold text-holly-gold hover:from-holly-gold/30 hover:to-holly-crimson/30 transition-all shadow-lg shadow-holly-gold/5 group z-10"
                >
                  <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/40 transition-colors">
                    <Bot className="w-4 h-4" />
                  </div>
                  Try Agent Mode — give me a goal, I'll handle it
                </motion.button>

                {/* ── Recent Sessions ── */}
                {pastConversations.length > 0 && (
                  <div className="mt-16 w-full max-w-md z-10">
                    <div className="flex items-center justify-between mb-5 px-1">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-gray-500" />
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">CONTINUE SESSION</p>
                      </div>
                      <button
                        onClick={() => { setNavOpen(true); setNavTab("chats"); }}
                        className="text-[10px] font-bold text-primary hover:text-primary-light transition-colors uppercase tracking-widest"
                      >
                        View all
                      </button>
                    </div>
                    <div className="space-y-3 w-full">
                      {pastConversations.slice(0, 3).map(conv => (
                        <button
                          key={conv.id}
                          onClick={() => loadConversation(conv)}
                          className="w-full text-left p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-primary/40 hover:bg-white/[0.07] transition-all group relative overflow-hidden shadow-sm"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="relative flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-200 group-hover:text-white truncate leading-tight mb-1">
                                {conv.title && !conv.title.includes("New ") ? conv.title : (conv.lastMessagePreview || "New Chat")}
                              </p>
                              {conv.lastMessagePreview && (
                                <p className="text-xs text-gray-500 group-hover:text-gray-400 truncate line-clamp-1">
                                  {conv.lastMessagePreview}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="block text-[10px] font-bold text-gray-600 group-hover:text-gray-500 uppercase tracking-tighter">
                                {new Date(conv.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </span>
                              {conv.messageCount > 0 && (
                                <span className="text-[9px] text-primary/60 group-hover:text-primary font-mono mt-1 block">
                                  {conv.messageCount} MSG
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                    <span className="text-xs font-black tracking-widest text-holly-gold uppercase">HOLLY</span>
                    <Heart className={`w-3 h-3 animate-heart-pulse transition-colors duration-500 shadow-[0_0_8px_rgba(212,168,83,0.4)] ${
                      emotion === 'excited' ? 'text-holly-gold' :
                      emotion === 'empathetic' ? 'text-holly-crimson' :
                      emotion === 'creative' ? 'text-holly-gold' :
                      'text-holly-gold'
                    }`} />
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
                      className="w-full bg-gray-800 border border-holly-gold/40 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none min-h-[80px]"
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(msg.id); }
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <div className="flex gap-2">
                  <button onClick={() => submitEdit(msg.id)} className="px-3 py-1.5 bg-holly-gold hover:bg-holly-gold/80 text-holly-void text-xs font-bold rounded-lg transition-colors">
                        Save & Resend
                      </button>
                      <button onClick={cancelEdit} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`relative text-base leading-relaxed tracking-wide ${
                      msg.role === "user"
                        ? "sdi-glass-warm border border-holly-gold/10 rounded-2xl px-5 py-3.5 text-holly-ivory mt-2 text-right"
                        : "text-holly-ivory/90 py-2"
                    }`}
                    style={msg.role === "assistant" ? { fontFamily: "'Inter', sans-serif" } : {}}
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
                    <span className="text-[10px] text-gray-400">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <CopyButton text={msg.content} />
                    {/* Phase D: Edit button for user messages */}
                    {msg.role === "user" && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => startEditMessage(msg)}
                        className="p-1.5 rounded-md text-holly-ivory/50 hover:text-holly-gold hover:bg-holly-gold/10 transition-colors"
                        aria-label="Edit message"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </motion.button>
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
                  <span className="text-xs font-bold tracking-widest text-primary uppercase">HOLLY</span>
                </div>
                <div className="text-gray-100 text-base leading-relaxed py-2">
                  <StreamingText content={streamingMessage} />
                  <motion.span
                    className="inline-block w-0.5 h-4 bg-holly-gold ml-0.5 align-middle"
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
                  <span className="text-xs font-bold tracking-widest text-primary uppercase">HOLLY</span>
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
            <div className="rounded-2xl rounded-bl-sm px-4 py-2 bg-white/5 border border-white/10 backdrop-blur-md">
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
              terminalOutput={toolExecutions.map(e => {
                let content: string;
                if (e.status === 'start') {
                  content = `⏳ Starting ${(e.toolName || '').replace(/^mcp_[^_]+_/, '').replace(/_/g, ' ')}…`;
                } else if (e.result && typeof e.result === 'object' && (e.result as any)?.content?.[0]?.text) {
                  content = (e.result as any).content[0].text;
                } else if (e.result && typeof e.result === 'string') {
                  content = e.result;
                } else if (e.status === 'error') {
                  content = `❌ ${(e.toolName || '').replace(/_/g, ' ')} failed — check console for details`;
                } else {
                  content = JSON.stringify(e.result, null, 2);
                }
                return {
                  type: e.status === "error" ? "stderr" : "stdout" as const,
                  content,
                  timestamp: e.timestamp.getTime(),
                };
              })}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input area ── */}
      <div
        className={`border-t bg-holly-void/80 backdrop-blur-xl border-white/5 px-2 sm:px-4 pt-2 pb-safe sm:py-3 flex-shrink-0 transition-colors ${
          isDragging ? "border-holly-gold/40 bg-holly-gold/5" : "border-holly-gold/5"
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
              className="absolute inset-0 z-50 flex items-center justify-center bg-holly-void/90 pointer-events-none"
            >
              <div className="flex items-center gap-3 text-holly-gold">
                <Paperclip className="w-6 h-6" />
                <p className="text-sm font-medium">Drop images, PDFs, audio, video, or documents</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Constrained width */}
        <div className="max-w-3xl mx-auto">

        {/* ── Sovereign SDI Input Bar ── */}
        <div className="relative group max-w-4xl mx-auto w-full sm:px-4 mb-2 sm:mb-10">

          {/* ── Mobile Layout (< md): Vertical stack ── */}
          <div className="md:hidden flex flex-col gap-2 sdi-glass rounded-2xl p-2 transition-all duration-500 focus-within:sdi-glow-gold focus-within:border-holly-gold/40">
            {/* Embedded Attachment preview chips inside border */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-1.5 px-2 pt-1 pb-1.5 border-b border-white/5 overflow-hidden"
                >
                  {attachments.map(att => (
                    <div key={att.id} className={`flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg group border transition-colors ${
                      att.perceptionStatus === 'ready'   ? 'bg-[#D4A853]/10 border-[#D4A853]/30' :
                      att.perceptionStatus === 'pending' ? 'bg-white/5 border-yellow-500/20 animate-pulse' :
                      att.perceptionStatus === 'error'   ? 'bg-white/5 border-red-500/20' :
                      'bg-white/5 border-white/5'
                    }`}>
                      {att.preview ? (
                        <img src={att.preview} alt={att.name} className="w-5 h-5 rounded object-cover" />
                      ) : att.perceptionStatus === 'pending' ? (
                        <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                      ) : att.perceptionStatus === 'ready' ? (
                        att.type.startsWith('image/') ? <CheckCircle className="w-3.5 h-3.5 text-[#D4A853]" /> :
                        att.type.startsWith('video/') ? <Film className="w-3.5 h-3.5 text-red-400" /> :
                        att.type.startsWith('audio/') ? <Music className="w-3.5 h-3.5 text-green-400" /> :
                        <CheckCircle className="w-3.5 h-3.5 text-[#D4A853]" />
                      ) : (
                        <Paperclip className="w-3.5 h-3.5 text-white/20" />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-gray-300 max-w-[100px] truncate">{att.name}</span>
                        {att.perceptionStatus === 'pending' && (
                          <span className="text-[8px] text-yellow-400">Transcribing…</span>
                        )}
                        {att.perceptionStatus === 'ready' && (
                          <span className="text-[8px] text-[#D4A853]">Ready</span>
                        )}
                      </div>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="p-0.5 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Remove attachment"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea row — full width */}
            <div className="relative">
              <textarea
                ref={mobileTextareaRef}
                rows={1}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Message Holly..."}
                disabled={isProcessing}
                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-100 placeholder:text-white/20 py-2 px-1 text-base resize-none max-h-[150px] scrollbar-none selection:bg-primary/30"
                style={{ height: "auto" }}
              />
            </div>
            {/* Button row */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <div className="flex items-center gap-1">
                {/* Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="p-2.5 rounded-xl text-white/30 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-10"
                  title="Upload"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => handleFileSelect(e.target.files)}
                />
                {/* Voice */}
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={voicePhase === 'processing'}
                  className={`p-2.5 rounded-xl transition-all ${
                    isListening
                      ? "bg-red-500/20 text-red-400"
                      : voicePhase === 'processing'
                      ? "opacity-30 cursor-wait text-gray-500"
                      : isVoiceInput
                      ? "bg-primary/20 text-primary"
                      : "text-white/30 hover:text-white hover:bg-white/5"
                  }`}
                  title={voicePhase === 'listening' ? "Stop recording" : "Voice Input"}
                >
                  {voicePhase === 'processing' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isListening ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              </div>
              {/* Send */}
              <button
                onClick={() => handleSend()}
                disabled={isProcessing || (!input.trim() && attachments.length === 0)}
                className={`p-2.5 rounded-xl transition-all ${
                  input.trim() || attachments.length > 0
                    ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] active:scale-95"
                    : "text-white/10"
                } disabled:opacity-20`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Desktop Layout (md+): Horizontal bar ── */}
          <div className="hidden md:flex flex-col gap-1 sdi-glass rounded-[2.5rem] p-2 transition-all duration-500 focus-within:sdi-glow-gold focus-within:border-holly-gold/40 group-hover:border-white/20">
            {/* Embedded Attachment preview chips inside border */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 px-4 pt-2 pb-2 border-b border-white/5 overflow-hidden"
                >
                  {attachments.map(att => (
                    <div key={att.id} className={`flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg group border transition-colors ${
                      att.perceptionStatus === 'ready'   ? 'bg-[#D4A853]/15 border-[#D4A853]/35 shadow-[0_0_10px_rgba(212,168,83,0.1)]' :
                      att.perceptionStatus === 'pending' ? 'bg-white/5 border-yellow-500/25 animate-pulse' :
                      att.perceptionStatus === 'error'   ? 'bg-white/5 border-red-500/25' :
                      'bg-white/5 border-white/5'
                    }`}>
                      {att.preview ? (
                        <img src={att.preview} alt={att.name} className="w-6 h-6 rounded object-cover" />
                      ) : att.perceptionStatus === 'pending' ? (
                        <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                      ) : att.perceptionStatus === 'ready' ? (
                        att.type.startsWith('image/') ? <CheckCircle className="w-3.5 h-3.5 text-[#D4A853]" /> :
                        att.type.startsWith('video/') ? <Film className="w-3.5 h-3.5 text-red-400" /> :
                        att.type.startsWith('audio/') ? <Music className="w-3.5 h-3.5 text-green-400" /> :
                        <CheckCircle className="w-3.5 h-3.5 text-[#D4A853]" />
                      ) : (
                        <Paperclip className="w-3.5 h-3.5 text-white/20" />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] text-gray-300 max-w-[120px] truncate font-medium">{att.name}</span>
                        {att.perceptionStatus === 'pending' && (
                          <span className="text-[9px] text-yellow-400 animate-pulse">Transcribing…</span>
                        )}
                        {att.perceptionStatus === 'ready' && (
                          <span className="text-[9px] text-[#D4A853] font-bold">Ready</span>
                        )}
                      </div>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="p-0.5 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Remove attachment"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Action Bar */}
            <div className="flex items-end gap-3 w-full">
              {/* Nav / Logo Anchor */}
              <div className="flex-shrink-0 ml-1">
                <div className="flex items-center gap-3 bg-black/40 px-3 py-2 rounded-full border border-white/10 shadow-lg group/logo transition-all hover:bg-black/60 relative overflow-hidden">
                  <div className="absolute inset-0 sdi-scanline opacity-20" />
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-primary/20 scale-[1.2] animate-pulse" />
                    <div className="absolute inset-0 rounded-full border border-primary/10 scale-[1.5] group-hover/logo:scale-[1.6] transition-transform duration-700" />
                    <div className="relative z-10 flex items-center justify-center w-full h-full">
                      <LivingLogo
                        emotion={currentStatus ? statusToEmotion(currentStatus) || 'focused' : emotion}
                        size={28}
                        showGlow={false}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col pr-1">
                    <span className="text-[10px] font-black tracking-[0.3em] text-primary select-none leading-none">
                      HOLLY
                    </span>
                    <span className="text-[7px] text-white/30 font-bold tracking-[0.1em] uppercase mt-1">
                      {isProcessing ? "Processing..." : isSpeaking() ? "Transmitting..." : "Interface Live"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Upload Intelligence */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex-shrink-0 p-3 rounded-2xl text-white/30 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-10 border border-transparent hover:border-primary/20"
                title="Upload Intelligence"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Voice button */}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={voicePhase === 'processing'}
                className={`flex-shrink-0 p-3 rounded-2xl transition-all border border-transparent ${
                  isListening
                    ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                    : voicePhase === 'processing'
                    ? "opacity-30 cursor-wait text-gray-500"
                    : isVoiceInput
                    ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                    : "text-white/30 hover:text-white hover:bg-white/5 hover:border-white/10"
                }`}
                title={voicePhase === 'listening' ? "Stop recording" : voicePhase === 'processing' ? "Transcribing..." : "Neural Voice Input"}
              >
                <AnimatePresence mode="wait">
                  {voicePhase === 'processing' ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </motion.div>
                  ) : isListening ? (
                    <motion.div
                      key="listening"
                      initial={{ scale: 0.8 }} animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      <MicOff className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Mic className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              {/* Input Field */}
              <div className="flex-1 min-w-0 relative py-1">
                <textarea
                  ref={desktopTextareaRef}
                  rows={1}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Listening..." : "Engage HOLLY's consciousness..."}
                  disabled={isProcessing}
                  className="w-full bg-transparent border-none focus:ring-0 text-gray-100 placeholder:text-white/20 py-3 text-base resize-none max-h-[200px] scrollbar-none selection:bg-primary/30"
                  style={{ height: "auto" }}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={isProcessing || (!input.trim() && attachments.length === 0)}
                className={`flex-shrink-0 p-3 rounded-2xl transition-all mr-1 ${
                  input.trim() || attachments.length > 0
                    ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:scale-105 active:scale-95"
                    : "text-white/10"
                } disabled:opacity-20`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="hidden sm:flex items-center justify-between mt-2 px-1">
          <a
            href="/evolution"
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-holly-gold transition-colors"
          >
            <TrendingUp className="w-3 h-3" />
            Evolution
          </a>
          <p className="text-[10px] text-gray-400">
            HOLLY · ↩ sends · ⌘K focus · ⌘N new chat
          </p>
          <a
            href="/onboarding"
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-holly-gold transition-colors"
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
