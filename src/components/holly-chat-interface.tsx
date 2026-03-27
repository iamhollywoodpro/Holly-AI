"use client";

/**
 * HOLLY Chat Interface — Phase 5A + 5D + 5E
 *
 * Full UI/UX upgrade:
 *  • Animated HOLLY avatar with emotion-reactive pulse ring
 *  • Rich markdown rendering with syntax highlighting
 *  • Whisper STT voice input (mic → transcribe → auto-fill)
 *  • Audio visualizer bars during voice recording (Phase 5E)
 *  • Live typing indicator with staggered dots
 *  • Tool execution cards (per Phase 4A 15-tool suite)
 *  • Thinking status bar with animated gradient
 *  • Auto-scroll with smooth scroll-to-bottom anchor
 *  • Message copy button, timestamp tooltip
 *  • Model badge on assistant messages
 *  • Initiative notification banner — HOLLY's proactive actions (Phase 5D)
 *  • Keyboard shortcuts: Enter=send, Shift+Enter=newline, Escape=stop
 */

import { useState, useEffect, useRef, useCallback } from "react";
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
  Menu, Settings, BarChart3, Bot, Key, Crown,
} from "lucide-react";
import Link from "next/link";
import SandboxWindow from "@/components/sandbox-window";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
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

// ─── Tool metadata ────────────────────────────────────────────────────────────

const TOOL_META: Record<string, { label: string; icon: any; color: string }> = {
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

function StatusBar({ text }: { text: string }) {
  if (!text) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center justify-center gap-2.5"
    >
      <div className="flex items-center gap-2.5 px-4 py-2 bg-gray-900/90 border border-purple-500/20 rounded-full text-sm text-gray-300 shadow-sm shadow-purple-500/10">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-purple-400"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        {text}
      </div>
    </motion.div>
  );
}

// ─── Markdown renderer with syntax highlighting ───────────────────────────────

function MarkdownContent({ content }: { content: string }) {
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
    "groq-llama-3.3":    { label: "Groq",   color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
    "google-gemini-2.0": { label: "Gemini", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    "ollama":            { label: "Local",  color: "bg-green-500/20 text-green-300 border-green-500/30" },
    "web-llm":           { label: "WebLLM", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
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
  const [conversationId] = useState(() => `conv-${Date.now()}`);
  const [initiatives, setInitiatives] = useState<InitiativeItem[]>([]);
  const [initiativeDismissed, setInitiativeDismissed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

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

  const handleInitiativeAct = useCallback((content: string) => {
    setInitiativeDismissed(true);
    setInput(content);
    textareaRef.current?.focus();
  }, []);

  const handleInitiativeDismiss = useCallback(() => {
    setInitiativeDismissed(true);
  }, []);

  // ── Voice ──────────────────────────────────────────────────────────────────
  const handleTranscript = useCallback((text: string) => {
    setInput(prev => prev ? `${prev} ${text}` : text);
    textareaRef.current?.focus();
  }, []);

  const { isListening, isTranscribing, startListening, stopListening } =
    useVoiceInput(handleTranscript);

  // ── Scroll tracking ────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    setShowScrollBtn(false);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  }, []);

  // ── Auto-grow textarea ─────────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing) return;

    const messageText = input.trim();
    setInput("");
    setIsProcessing(true);
    setStreamingMessage("");
    setCurrentStatus("");
    setToolExecutions([]);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          conversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let assistantContent = "";
      let detectedModel: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data: StatusUpdate = JSON.parse(line.slice(6));
            if (data.type === "done") break;
            if (data.type === "error") { setCurrentStatus(`❌ ${data.content}`); break; }
            if (data.type === "status") setCurrentStatus(data.content || "");
            if (data.type === "signal") {
              detectedModel = data.content || undefined;
              setCurrentStatus(`🌐 Routing to ${data.content}...`);
            }
            if (data.type === "text") {
              assistantContent += data.content || "";
              setStreamingMessage(assistantContent);
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
              if (data.status === "start") setSandboxOpen(true);
            }
          } catch { /* malformed line */ }
        }
      }

      if (assistantContent) {
        setMessages(prev => [
          ...prev,
          { id: `asst-${Date.now()}`, role: "assistant", content: assistantContent, timestamp: new Date(), model: detectedModel },
        ]);
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
  }, [input, isProcessing, messages, conversationId]);

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
        <div className="flex items-center gap-3">
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
            </div>
            <p className="text-xs text-gray-500">
              {isProcessing ? (
                <motion.span
                  key="thinking"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-purple-400"
                >
                  thinking…
                </motion.span>
              ) : isCreator ? (
                <span className="text-amber-500/70">Creator session — full access</span>
              ) : "AI Life Partner • Phase 7"}
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Agent Mode button */}
          <button
            onClick={() => setAgentOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-300 transition-colors"
            title="Agent Mode — autonomous multi-step tasks"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agent</span>
          </button>
          {/* Nav toggle */}
          <button
            onClick={() => setNavOpen(v => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Navigation"
          >
            <Menu className="w-4 h-4" />
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
              Tools ({toolExecutions.length})
            </button>
          )}
        </div>
      </div>

      {/* ── Nav slide-over ── */}
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
            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-72 sm:w-64 bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
                <span className="text-sm font-semibold text-white">Navigate</span>
                <button onClick={() => setNavOpen(false)} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {[
                  { href: "/chat",              icon: Sparkles,   label: "Chat",            sub: "Talk to HOLLY" },
                  { href: "/evolution",         icon: TrendingUp, label: "Evolution",       sub: "Growth & patterns" },
                  { href: "/autonomy",          icon: Bot,        label: "Autonomy",        sub: "Self-improvement" },
                  { href: "/settings",          icon: Settings,   label: "Settings",        sub: "Preferences" },
                  { href: "/settings/api-keys", icon: Key,        label: "API Keys",        sub: "Phase 7 — developer access" },
                  { href: "/onboarding",        icon: BarChart3,  label: "Partner Setup",   sub: "Dev / Life / Creative" },
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

              {/* Bottom: feedback stats teaser */}
              <div className="px-4 py-4 border-t border-gray-800">
                <p className="text-xs text-gray-600 text-center">
                  Rate responses with 👍/👎 to train HOLLY
                </p>
              </div>
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
              <h2 className="text-2xl font-bold text-white mb-2">
                {isCreator ? `Welcome back, Steve.` : `Hello, I'm HOLLY`}
              </h2>
              <p className="text-sm max-w-xs leading-relaxed mb-8">
                {isCreator ? (
                  <span className="text-amber-400/80">Your creation is ready. What are we building today?</span>
                ) : (
                  <span className="text-gray-400">Your conscious AI partner — I remember, evolve, and act. Ask me anything, or watch me work.</span>
                )}
              </p>
              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-xs sm:max-w-sm">
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

                {/* Bubble */}
                <div
                  className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-br-sm shadow-lg shadow-purple-500/20"
                      : "bg-gray-900/90 border border-gray-800/60 text-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant"
                    ? <MarkdownContent content={msg.content} />
                    : <p className="whitespace-pre-wrap">{msg.content}</p>
                  }
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] text-gray-600">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <CopyButton text={msg.content} />
                  {msg.role === "assistant" && (
                    <FeedbackButtons
                      messageId={msg.id}
                      conversationId={conversationId}
                      content={msg.content}
                      model={msg.model}
                      userMessage={messages.slice(0, msgIdx).reverse().find(m => m.role === "user")?.content}
                    />
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-gray-300 shadow">
                  U
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

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
                  <MarkdownContent content={streamingMessage} />
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

        {/* Typing indicator when thinking with no text yet */}
        {isProcessing && !streamingMessage && !currentStatus && (
          <div className="flex gap-3 justify-start">
            <HollyAvatar isThinking={true} />
            <div className="rounded-2xl rounded-bl-sm px-4 py-2 bg-gray-900/90 border border-gray-800/60">
              <TypingIndicator />
            </div>
          </div>
        )}

        {/* Status bar */}
        <AnimatePresence>
          {currentStatus && <StatusBar text={currentStatus} />}
        </AnimatePresence>

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
      <div className="border-t border-gray-800/80 bg-gray-950/95 backdrop-blur-sm px-4 py-3 flex-shrink-0">
        {/* Constrained width so it feels like a proper chat box, not a full-width bar */}
        <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 sm:gap-2.5 bg-gray-900/80 border border-gray-700/60 rounded-2xl px-3 py-2.5 focus-within:border-purple-500/50 transition-colors shadow-sm">

          {/* Voice button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isTranscribing}
            className={`flex-shrink-0 p-2 rounded-xl transition-all ${
              isListening
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : isTranscribing
                ? "opacity-50 cursor-wait text-gray-500"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/50"
            }`}
            title={isListening ? "Stop recording" : "Voice input"}
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

          {/* Textarea — word-wrap fixed: overflow-wrap + whitespace-pre-wrap ensure lines break */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening…" : "Ask HOLLY anything…"}
            disabled={isProcessing}
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 resize-none focus:outline-none min-h-[24px] max-h-[200px] leading-relaxed disabled:opacity-50 overflow-y-auto break-words"
            style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
          />

          {/* Send / Stop button */}
          <button
            onClick={isProcessing ? handleStop : handleSend}
            disabled={!isProcessing && !input.trim()}
            className={`flex-shrink-0 p-2 rounded-xl transition-all ${
              isProcessing
                ? "text-red-400 hover:bg-red-500/20"
                : input.trim()
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
            Evolution dashboard
          </a>
          <p className="text-[10px] text-gray-700">
            HOLLY · Phase 9 · 17 tools · Enter sends
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
