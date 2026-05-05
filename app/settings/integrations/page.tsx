'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, AlertCircle, Loader2, ExternalLink, X,
  Music, Image, FileText, Video, Mic, Code, MessageSquare,
  HardDrive, GitBranch, Palette, Zap, Globe, ShoppingBag,
  BarChart2, Mail, Bell
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationStatus = 'connected' | 'disconnected' | 'coming-soon' | 'loading';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  category: string;
  status: IntegrationStatus;
  connectedInfo?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  docsUrl?: string;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const Icons = {
  GoogleDrive: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
      <path d="M6.28 3h11.44l4.28 7.5-4.28 7.5H6.28L2 10.5 6.28 3z" fill="#4285F4" opacity=".1"/>
      <path d="M1.5 16.5l4-7H22l-4 7H1.5z" fill="#34A853" opacity=".8"/>
      <path d="M8.5 3h7l4 7H4.5L8.5 3z" fill="#4285F4" opacity=".8"/>
      <path d="M1.5 16.5l4-7 4 7H1.5z" fill="#FBBC05" opacity=".8"/>
    </svg>
  ),
  GitHub: () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  Canva: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-.36 16.8c-1.08.72-2.52.84-3.72.24-1.92-.96-2.76-3.24-1.92-5.28.48-1.2 1.44-2.16 2.64-2.64.48-.18.96-.3 1.44-.3.72 0 1.44.18 2.04.54.12.06.24.06.36 0 .12-.06.18-.18.18-.3v-.9c0-.24-.18-.42-.42-.42H9.6c-.24 0-.42.18-.42.42v.18c0 .12.06.24.18.3.54.36.9.96.9 1.62 0 1.08-.9 1.98-1.98 1.98-.42 0-.78-.12-1.08-.36-.24-.18-.54-.12-.72.12-.18.24-.12.54.12.72.48.36 1.08.6 1.68.6 1.56 0 2.82-1.26 2.82-2.82 0-.96-.48-1.8-1.2-2.34.54-.18 1.08-.24 1.62-.12 1.8.36 3.12 2.04 2.88 3.96-.18 1.44-1.2 2.64-2.58 3.06z"/>
    </svg>
  ),
  Spotify: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  ),
  AppleMusic: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208A7.37 7.37 0 00.09 5.25c-.02.315-.03.63-.03.945v11.61c0 .315.01.63.03.945.044.895.19 1.77.534 2.598C1.04 22.12 2.004 23.042 3.34 23.572c.703.278 1.446.358 2.19.41.152.01.303.017.455.026h12.03c.152-.01.303-.017.455-.026.745-.052 1.488-.132 2.19-.41 1.336-.53 2.3-1.452 2.864-2.774.344-.828.49-1.703.534-2.598.02-.315.03-.63.03-.945V6.195c0-.023-.006-.047-.014-.07zm-6.54 3.53v5.81a3.24 3.24 0 01-.278 1.358c-.31.666-.823 1.082-1.53 1.243a3.908 3.908 0 01-.832.088c-1.052 0-1.975-.633-2.22-1.629-.19-.772.056-1.48.618-2.047.428-.43.963-.67 1.544-.8.428-.093.859-.17 1.284-.27.293-.07.44-.24.44-.54V10.53c0-.29-.158-.41-.43-.35l-3.97.9c-.27.06-.38.19-.38.47v6.16c0 .47-.035.94-.19 1.395-.29.856-.87 1.4-1.77 1.594a4.43 4.43 0 01-.92.09c-1.15 0-2.12-.71-2.28-1.82-.12-.82.2-1.5.79-2.04.44-.4.97-.63 1.54-.76.44-.1.88-.18 1.32-.28.27-.07.4-.22.4-.5V7.65c0-.38.19-.62.56-.71l5.51-1.25c.35-.08.59.09.59.45v3.515z"/>
    </svg>
  ),
  YouTube: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  Instagram: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  TikTok: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.78a4.85 4.85 0 01-1.02-.09z"/>
    </svg>
  ),
  SoundCloud: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.175 12.225c-.015.07-.026.138-.026.21v3.98c0 .072.01.14.026.21.07.288.31.49.6.49.09 0 .178-.02.257-.055l.004-.003 3.673-1.683V9.18l-3.677-1.684-.004-.003c-.08-.035-.168-.055-.257-.055-.29 0-.53.2-.6.49zm4.534-4.28v8.467l3.658-1.676V9.621L5.709 7.945zm4.375 1.276v6.82l3.658-1.676V10.9l-3.658-1.678zm4.375 1.276v5.37l3.658-1.676v-2.022l-3.658-1.672zm4.357-1.01v6.55a3.29 3.29 0 001.026-.165 3.28 3.28 0 002.254-3.116 3.277 3.277 0 00-3.28-3.27z"/>
    </svg>
  ),
  Slack: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
    </svg>
  ),
  Discord: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  ),
  Notion: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
    </svg>
  ),
  Dropbox: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4zM6 18.5L12 22l6-3.5-6-4z"/>
    </svg>
  ),
};

// ─── Category colours ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Design':       'bg-[#D4A853]/10 text-[#D4A853]',
  'Music':        'bg-[#B84052]/10 text-[#B84052]',
  'Storage':      'bg-[#D4A853]/10 text-[#D4A853]',
  'Social':       'bg-[#B84052]/10 text-[#B84052]',
  'Dev':          'bg-[#D4A853]/10 text-[#D4A853]',
  'Productivity': 'bg-[#D4A853]/10 text-[#D4A853]',
  'Community':    'bg-[#B84052]/10 text-[#B84052]',
  'Video':        'bg-[#B84052]/10 text-[#B84052]',
};

// ─── Discord Webhook Modal ────────────────────────────────────────────────────

function DiscordModal({
  onSave,
  onClose,
  saving,
}: {
  onSave: (url: string, serverName: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [url,  setUrl]  = useState('');
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#12110F] border border-[#D4A853]/20 rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-[#F5F0E8] flex items-center gap-3 uppercase tracking-widest">
            <Icons.Discord /> Connect Discord
          </h3>
          <button onClick={onClose} className="text-[#8C8476] hover:text-[#D4A853] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[#8C8476] text-xs font-medium mb-6 leading-relaxed uppercase tracking-widest">
          ESTABLISH A NEURAL WEBHOOK TO BROADCAST ANALYTICS, RELEASE ALERTS, AND A&R INSIGHTS TO YOUR NATIVE SERVER.
        </p>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-[10px] font-black text-[#D4A853] uppercase tracking-[0.2em] mb-2">TARGET CHANNEL IDENTIFIER</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. #RELEASES"
              className="w-full bg-[#0B0A08] border border-[#D4A853]/10 rounded-xl px-4 py-3 text-[#F5F0E8] text-sm placeholder-[#5C564D] focus:outline-none focus:border-[#D4A853] transition-colors uppercase tracking-widest"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[#D4A853] uppercase tracking-[0.2em] mb-2">WEBHOOK PROTOCOL URL *</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full bg-[#0B0A08] border border-[#D4A853]/10 rounded-xl px-4 py-3 text-[#F5F0E8] text-sm placeholder-[#5C564D] focus:outline-none focus:border-[#D4A853] transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-[#1A1815] hover:bg-[#24211D] text-[#8C8476] text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Abort
          </button>
          <button
            onClick={() => onSave(url, name)}
            disabled={!url.startsWith('https://discord.com/api/webhooks/') || saving}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#D4A853] to-[#B84052] disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-90 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing…</> : 'Establish Link'}
          </button>
        </div>

        <a
          href="https://support.discord.com/hc/en-us/articles/228383668"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-4 transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> How to create a Discord webhook
        </a>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const searchParams = useSearchParams();

  const [toast, setToast]                         = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [driveConnected, setDriveConnected]       = useState(false);
  const [driveEmail, setDriveEmail]               = useState('');
  const [githubConnected, setGithubConnected]     = useState(false);
  const [githubUsername, setGithubUsername]       = useState('');
  const [canvaConnected, setCanvaConnected]       = useState(false);
  const [canvaUser, setCanvaUser]                 = useState('');
  const [spotifyConnected, setSpotifyConnected]   = useState(false);
  const [spotifyUser, setSpotifyUser]             = useState('');
  const [youtubeConnected, setYoutubeConnected]   = useState(false);
  const [youtubeChannel, setYoutubeChannel]       = useState('');
  const [soundcloudConnected, setSoundcloudConnected] = useState(false);
  const [soundcloudUser, setSoundcloudUser]       = useState('');
  const [notionConnected, setNotionConnected]     = useState(false);
  const [notionWorkspace, setNotionWorkspace]     = useState('');
  const [discordConnected, setDiscordConnected]   = useState(false);
  const [discordChannel, setDiscordChannel]       = useState('');
  const [showDiscordModal, setShowDiscordModal]   = useState(false);
  const [discordSaving, setDiscordSaving]         = useState(false);
  const [statusLoading, setStatusLoading]         = useState(true);
  const [activeCategory, setActiveCategory]       = useState<string>('All');
  // New integrations
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramUser, setInstagramUser]           = useState('');
  const [tiktokConnected, setTiktokConnected]       = useState(false);
  const [tiktokUser, setTiktokUser]                 = useState('');
  const [dropboxConnected, setDropboxConnected]     = useState(false);
  const [dropboxUser, setDropboxUser]               = useState('');
  const [slackConnected, setSlackConnected]         = useState(false);
  const [slackTeam, setSlackTeam]                   = useState('');
  const [appleMusicConnected, setAppleMusicConnected] = useState(false);

  // ── Read OAuth callback query params ──────────────────────────────────────
  useEffect(() => {
    const ok          = searchParams.get('success');
    const err         = searchParams.get('error');
    const cv                  = searchParams.get('canva');
    const notionErr           = searchParams.get('notion_error');
    const spotifyErr          = searchParams.get('spotify_error');
    const ytErr               = searchParams.get('youtube_error');
    const scErr               = searchParams.get('soundcloud_error');
    const instagramConnected  = searchParams.get('instagram_connected');
    const instagramErr        = searchParams.get('instagram_error');
    const tiktokConnected     = searchParams.get('tiktok_connected');
    const tiktokErr           = searchParams.get('tiktok_error');
    const dropboxConnected    = searchParams.get('dropbox_connected');
    const dropboxErr          = searchParams.get('dropbox_error');
    const slackConnected      = searchParams.get('slack_connected');
    const slackErr            = searchParams.get('slack_error');

    if (ok === 'drive_connected')       showToast('success', '🎉 Google Drive connected!');
    if (ok === 'github_connected')      showToast('success', '🎉 GitHub connected!');
    if (ok === 'spotify_connected')     showToast('success', '🎵 Spotify connected!');
    if (ok === 'youtube_connected')     showToast('success', '▶️ YouTube connected!');
    if (ok === 'soundcloud_connected')  showToast('success', '🎧 SoundCloud connected!');
    if (ok === 'notion_connected')      showToast('success', '📝 Notion connected!');
    if (cv === 'connected')             showToast('success', '🎨 Canva connected!');
    if (cv === 'denied')                showToast('error',   'Canva connection cancelled.');
    if (instagramConnected)             showToast('success', '📸 Instagram connected!');
    if (tiktokConnected)                showToast('success', '🎵 TikTok connected!');
    if (dropboxConnected)               showToast('success', '📦 Dropbox connected!');
    if (slackConnected)                 showToast('success', '💬 Slack connected!');
    if (err)                            showToast('error',   `Error: ${decodeURIComponent(err)}`);
    if (notionErr)                      showToast('error',   `Notion error: ${notionErr}`);
    if (spotifyErr)                     showToast('error',   `Spotify error: ${spotifyErr}`);
    if (ytErr)                          showToast('error',   `YouTube error: ${ytErr}`);
    if (scErr)                          showToast('error',   `SoundCloud error: ${scErr}`);
    if (instagramErr)                   showToast('error',   `Instagram error: ${instagramErr}`);
    if (tiktokErr)                      showToast('error',   `TikTok error: ${tiktokErr}`);
    if (dropboxErr)                     showToast('error',   `Dropbox error: ${dropboxErr}`);
    if (slackErr)                       showToast('error',   `Slack error: ${slackErr}`);

    if (cv || ok || err || notionErr || spotifyErr || ytErr || scErr ||
        instagramConnected || instagramErr || tiktokConnected || tiktokErr ||
        dropboxConnected || dropboxErr || slackConnected || slackErr) {
      window.history.replaceState({}, '', '/settings/integrations');
    }
  }, [searchParams]);

  // ── Fetch all statuses in parallel ────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    await Promise.allSettled([
      fetch('/api/google-drive/status', { cache: 'no-store' })
        .then(r => r.json()).then(d => {
          setDriveConnected(d.success && d.connected);
          if (d.user?.email) setDriveEmail(d.user.email);
        }),
      fetch('/api/github/connection', { cache: 'no-store' })
        .then(r => r.json()).then(d => {
          setGithubConnected(d.connected);
          if (d.username) setGithubUsername(d.username);
        }),
      fetch('/api/canva/status', { cache: 'no-store' })
        .then(r => r.json()).then(d => {
          setCanvaConnected(d.connected);
          if (d.canvaUser?.displayName) setCanvaUser(d.canvaUser.displayName);
        }),
      fetch('/api/spotify/status', { cache: 'no-store' })
        .then(r => r.json()).then(d => {
          setSpotifyConnected(d.connected);
          if (d.integration?.displayName) setSpotifyUser(d.integration.displayName);
        }).catch(() => {}),
      fetch('/api/youtube/status', { cache: 'no-store' })
        .then(r => r.json()).then(d => {
          setYoutubeConnected(d.connected);
          if (d.channelTitle) setYoutubeChannel(d.channelTitle);
        }).catch(() => {}),
      fetch('/api/soundcloud/status', { cache: 'no-store' })
        .then(r => r.json()).then(d => {
          setSoundcloudConnected(d.connected);
          if (d.username) setSoundcloudUser(d.username);
        }).catch(() => {}),
      fetch('/api/notion/status', { cache: 'no-store' })
        .then(r => r.json()).then(d => {
          setNotionConnected(d.connected);
          if (d.workspaceName) setNotionWorkspace(d.workspaceName);
        }).catch(() => {}),
      fetch('/api/discord/status', { cache: 'no-store' })
        .then(r => r.json()).then(d => {
          setDiscordConnected(d.connected);
          if (d.channelName) setDiscordChannel(d.channelName);
        }).catch(() => {}),
      // New integrations
      fetch('/api/integrations/instagram', { cache: 'no-store' })
        .then(r => r.json()).then(d => {
          setInstagramConnected(d.connected && d.active);
          if (d.username) setInstagramUser(d.username);
        }).catch(() => {}),
      fetch('/api/integrations/tiktok', { cache: 'no-store' })
        .then(r => r.json()).then(d => {
          setTiktokConnected(d.connected && d.active);
          if (d.displayName) setTiktokUser(d.displayName);
        }).catch(() => {}),
      fetch('/api/integrations/dropbox/callback', { cache: 'no-store' }).catch(() => {}), // status only
      fetch('/api/social/status', { cache: 'no-store' })
        .then(r => r.json()).then(d => {
          const s = d.status ?? {};
          if (s.dropbox?.connected) { setDropboxConnected(true); setDropboxUser(s.dropbox.username ?? 'Dropbox'); }
          if (s.slack?.connected)   { setSlackConnected(true);   setSlackTeam(s.slack.username ?? 'Slack'); }
          if (s['apple-music']?.connected) setAppleMusicConnected(true);
          // Refresh instagram/tiktok from unified endpoint too
          if (s.instagram?.connected) { setInstagramConnected(true); if (s.instagram.username) setInstagramUser(s.instagram.username); }
          if (s.tiktok?.connected)    { setTiktokConnected(true);    if (s.tiktok.username)    setTiktokUser(s.tiktok.username); }
        }).catch(() => {}),
    ]);
    setStatusLoading(false);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  }

  async function disconnectCanva() {
    await fetch('/api/canva/status', { method: 'DELETE' });
    setCanvaConnected(false); setCanvaUser('');
    showToast('success', 'Canva disconnected.');
  }

  async function disconnectDrive() {
    await fetch('/api/google-drive/disconnect', { method: 'POST' });
    setDriveConnected(false); setDriveEmail('');
    showToast('success', 'Google Drive disconnected.');
  }

  async function disconnectSpotify() {
    await fetch('/api/spotify/disconnect', { method: 'DELETE' });
    setSpotifyConnected(false); setSpotifyUser('');
    showToast('success', 'Spotify disconnected.');
  }

  async function disconnectYouTube() {
    await fetch('/api/youtube/disconnect', { method: 'POST' });
    setYoutubeConnected(false); setYoutubeChannel('');
    showToast('success', 'YouTube disconnected.');
  }

  async function disconnectSoundCloud() {
    await fetch('/api/soundcloud/disconnect', { method: 'POST' });
    setSoundcloudConnected(false); setSoundcloudUser('');
    showToast('success', 'SoundCloud disconnected.');
  }

  async function disconnectNotion() {
    await fetch('/api/notion/disconnect', { method: 'POST' });
    setNotionConnected(false); setNotionWorkspace('');
    showToast('success', 'Notion disconnected.');
  }

  async function disconnectDiscord() {
    await fetch('/api/discord/status', { method: 'DELETE' });
    setDiscordConnected(false); setDiscordChannel('');
    showToast('success', 'Discord disconnected.');
  }

  async function disconnectInstagram() {
    await fetch('/api/integrations/instagram', { method: 'DELETE' });
    setInstagramConnected(false); setInstagramUser('');
    showToast('success', 'Instagram disconnected.');
  }

  async function disconnectTikTok() {
    await fetch('/api/integrations/tiktok', { method: 'DELETE' });
    setTiktokConnected(false); setTiktokUser('');
    showToast('success', 'TikTok disconnected.');
  }

  async function disconnectDropbox() {
    await fetch('/api/integrations/dropbox/disconnect', { method: 'DELETE' });
    setDropboxConnected(false); setDropboxUser('');
    showToast('success', 'Dropbox disconnected.');
  }

  async function disconnectSlack() {
    await fetch('/api/integrations/slack/disconnect', { method: 'DELETE' });
    setSlackConnected(false); setSlackTeam('');
    showToast('success', 'Slack disconnected.');
  }

  async function disconnectAppleMusic() {
    await fetch('/api/integrations/apple-music', { method: 'DELETE' });
    setAppleMusicConnected(false);
    showToast('success', 'Apple Music disconnected.');
  }

  async function connectInstagram() {
    const res = await fetch('/api/integrations/instagram', { method: 'POST' });
    const data = await res.json();
    if (data.authUrl) { window.location.href = data.authUrl; }
    else showToast('error', data.error ?? 'Instagram not configured');
  }

  async function connectTikTok() {
    const res = await fetch('/api/integrations/tiktok', { method: 'POST' });
    const data = await res.json();
    if (data.authUrl) { window.location.href = data.authUrl; }
    else showToast('error', data.error ?? 'TikTok not configured');
  }

  async function connectAppleMusic() {
    const res = await fetch('/api/integrations/apple-music');
    const data = await res.json();
    if (!data.configured) {
      showToast('error', 'Apple Music requires APPLE_MUSIC_KEY_ID, APPLE_MUSIC_TEAM_ID, and APPLE_MUSIC_PRIVATE_KEY env vars.');
    } else {
      showToast('error', 'Apple Music uses MusicKit JS — integration coming in next update.');
    }
  }

  async function saveDiscordWebhook(url: string, serverName: string) {
    setDiscordSaving(true);
    try {
      const res = await fetch('/api/discord/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: url, serverName }),
      });
      if (res.ok) {
        setDiscordConnected(true);
        setDiscordChannel(serverName || 'Discord');
        setShowDiscordModal(false);
        showToast('success', '🎮 Discord connected!');
        // Send test message
        fetch('/api/discord/test', { method: 'POST' }).catch(() => {});
      } else {
        showToast('error', 'Failed to save Discord webhook.');
      }
    } catch {
      showToast('error', 'Could not connect to Discord.');
    } finally {
      setDiscordSaving(false);
    }
  }

  // ── Integration definitions ──────────────────────────────────────────────
  const integrations: Integration[] = [
    // Design
    {
      id: 'canva', name: 'Canva',
      description: 'Let HOLLY create Instagram posts, YouTube thumbnails, presentations, and more using your Canva account.',
      icon: <Icons.Canva />, gradient: 'from-[#7C3AED] to-[#4F46E5]', category: 'Design',
      status: canvaConnected ? 'connected' : 'disconnected',
      connectedInfo: canvaUser || 'Canva account',
      onConnect: () => window.location.href = '/api/canva/auth',
      onDisconnect: disconnectCanva,
    },
    // Storage
    {
      id: 'google-drive', name: 'Google Drive',
      description: 'Auto-save generated music, images, and documents straight to your Google Drive.',
      icon: <Icons.GoogleDrive />, gradient: 'from-[#4285F4] to-[#34A853]', category: 'Storage',
      status: driveConnected ? 'connected' : 'disconnected',
      connectedInfo: driveEmail,
      onConnect: () => window.location.href = '/api/google-drive/connect',
      onDisconnect: disconnectDrive,
    },
    {
      id: 'dropbox', name: 'Dropbox',
      description: 'Sync generated files to your Dropbox folders automatically.',
      icon: <Icons.Dropbox />, gradient: 'from-[#0061FF] to-[#004BA0]', category: 'Storage',
      status: dropboxConnected ? 'connected' : 'disconnected',
      connectedInfo: dropboxUser || 'Dropbox account',
      onConnect: () => window.location.href = '/api/integrations/dropbox/auth',
      onDisconnect: disconnectDropbox,
    },
    // Dev
    {
      id: 'github', name: 'GitHub',
      description: 'Access your repos, commit files, and let HOLLY write and push code on your behalf.',
      icon: <Icons.GitHub />, gradient: 'from-[#333] to-[#111]', category: 'Dev',
      status: githubConnected ? 'connected' : 'disconnected',
      connectedInfo: githubUsername ? `@${githubUsername}` : undefined,
      onConnect: () => window.location.href = '/api/github/connect',
    },
    // Music
    {
      id: 'spotify', name: 'Spotify for Artists',
      description: 'Pull streaming stats, analyse your audience, and let HOLLY pitch to Spotify playlists.',
      icon: <Icons.Spotify />, gradient: 'from-[#1DB954] to-[#148040]', category: 'Music',
      status: spotifyConnected ? 'connected' : 'disconnected',
      connectedInfo: spotifyUser || 'Spotify account',
      onConnect: () => window.location.href = '/api/spotify/auth',
      onDisconnect: disconnectSpotify,
    },
    {
      id: 'soundcloud', name: 'SoundCloud',
      description: 'Upload tracks, manage playlists, and track plays — all from HOLLY.',
      icon: <Icons.SoundCloud />, gradient: 'from-[#FF5500] to-[#C43D00]', category: 'Music',
      status: soundcloudConnected ? 'connected' : 'disconnected',
      connectedInfo: soundcloudUser || 'SoundCloud account',
      onConnect: () => window.location.href = '/api/soundcloud/auth',
      onDisconnect: disconnectSoundCloud,
    },
    {
      id: 'apple-music', name: 'Apple Music',
      description: 'View Apple Music analytics and push releases through Music Connect.',
      icon: <Icons.AppleMusic />, gradient: 'from-[#FC3C44] to-[#B71C1C]', category: 'Music',
      status: appleMusicConnected ? 'connected' : 'disconnected',
      connectedInfo: 'Apple Music',
      onConnect: connectAppleMusic,
      onDisconnect: disconnectAppleMusic,
    },
    // Video
    {
      id: 'youtube', name: 'YouTube',
      description: 'Upload music videos, manage your channel, and get AI-generated titles, descriptions and tags.',
      icon: <Icons.YouTube />, gradient: 'from-[#FF0000] to-[#B00000]', category: 'Video',
      status: youtubeConnected ? 'connected' : 'disconnected',
      connectedInfo: youtubeChannel || 'YouTube channel',
      onConnect: () => window.location.href = '/api/youtube/auth',
      onDisconnect: disconnectYouTube,
    },
    // Social
    {
      id: 'instagram', name: 'Instagram',
      description: 'Post reels, stories, and images. HOLLY generates captions and hashtags automatically.',
      icon: <Icons.Instagram />, gradient: 'from-[#833AB4] via-[#FD1D1D] to-[#F77737]', category: 'Social',
      status: instagramConnected ? 'connected' : 'disconnected',
      connectedInfo: instagramUser ? `@${instagramUser}` : 'Instagram account',
      onConnect: connectInstagram,
      onDisconnect: disconnectInstagram,
    },
    {
      id: 'tiktok', name: 'TikTok',
      description: 'Post clips, manage your TikTok presence, and get trending sound recommendations.',
      icon: <Icons.TikTok />, gradient: 'from-[#010101] to-[#69C9D0]', category: 'Social',
      status: tiktokConnected ? 'connected' : 'disconnected',
      connectedInfo: tiktokUser || 'TikTok account',
      onConnect: connectTikTok,
      onDisconnect: disconnectTikTok,
    },
    // Productivity
    {
      id: 'notion', name: 'Notion',
      description: 'Save HOLLY conversations, song ideas, and project notes to Notion pages.',
      icon: <Icons.Notion />, gradient: 'from-[#2F2F2F] to-[#000]', category: 'Productivity',
      status: notionConnected ? 'connected' : 'disconnected',
      connectedInfo: notionWorkspace || 'Notion workspace',
      onConnect: () => window.location.href = '/api/notion/auth',
      onDisconnect: disconnectNotion,
    },
    // Community
    {
      id: 'slack', name: 'Slack',
      description: 'Get HOLLY notifications in Slack — new releases, milestones, and AI alerts.',
      icon: <Icons.Slack />, gradient: 'from-[#4A154B] to-[#611f69]', category: 'Community',
      status: slackConnected ? 'connected' : 'disconnected',
      connectedInfo: slackTeam || 'Slack workspace',
      onConnect: () => window.location.href = '/api/integrations/slack/auth',
      onDisconnect: disconnectSlack,
    },
    {
      id: 'discord', name: 'Discord',
      description: 'Send A&R reports, release announcements, and AI insights to your Discord server via webhook.',
      icon: <Icons.Discord />, gradient: 'from-[#5865F2] to-[#404EED]', category: 'Community',
      status: discordConnected ? 'connected' : 'disconnected',
      connectedInfo: discordChannel || 'Discord channel',
      onConnect: () => setShowDiscordModal(true),
      onDisconnect: disconnectDiscord,
    },
  ];

  const categories = ['All', ...Array.from(new Set(integrations.map(i => i.category)))];
  const filtered   = activeCategory === 'All' ? integrations : integrations.filter(i => i.category === activeCategory);
  const liveCount  = integrations.filter(i => i.status === 'connected' || i.status === 'disconnected').length;

  const loadingIds = new Set(['canva', 'google-drive', 'github', 'spotify', 'youtube', 'soundcloud', 'notion', 'discord', 'instagram', 'tiktok', 'dropbox', 'slack', 'apple-music']);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-[#F5F0E8] mb-1 uppercase tracking-widest">Neural Integrations</h2>
        <p className="text-[#8C8476] text-xs font-medium uppercase tracking-[0.15em]">
          Connect HOLLY to the external grid — {liveCount} ESTABLISHED, {integrations.length - liveCount} PENDING
        </p>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`flex items-center gap-3 p-4 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
              toast.type === 'success'
                ? 'bg-[#D4A853]/15 border-[#D4A853]/30 text-[#D4A853]'
                : 'bg-[#B84052]/15 border-[#B84052]/30 text-[#B84052]'
            }`}
          >
            {toast.type === 'success'
              ? <Check className="w-3.5 h-3.5 flex-shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
            <span className="flex-1">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-3">
        {categories.map(cat => ( cat !== 'All' && (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? 'All' : cat)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              activeCategory === cat
                ? 'bg-[#D4A853] text-[#0B0A08] shadow-[0_0_20px_rgba(212,168,83,0.3)]'
                : 'bg-[#1A1815] text-[#8C8476] hover:text-[#F5F0E8] border border-transparent hover:border-[#D4A853]/20'
            }`}
          >
            {cat}
          </button>
        )))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((svc, i) => (
          <IntegrationCard
            key={svc.id}
            integration={svc}
            index={i}
            loading={statusLoading && loadingIds.has(svc.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="p-5 bg-gray-800/30 border border-gray-700/40 rounded-xl text-center">
        <p className="text-gray-400 text-sm">
          Want a specific integration?{' '}
          <a href="mailto:support@nexamusicgroup.com" className="text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2">
            Let us know
          </a>
        </p>
      </div>

      {/* Discord modal */}
      <AnimatePresence>
        {showDiscordModal && (
          <DiscordModal
            onSave={saveDiscordWebhook}
            onClose={() => setShowDiscordModal(false)}
            saving={discordSaving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Card component ───────────────────────────────────────────────────────────

function IntegrationCard({
  integration: svc,
  index,
  loading,
}: {
  integration: Integration;
  index: number;
  loading: boolean;
}) {
  const isConnected    = svc.status === 'connected';
  const isDisconnected = svc.status === 'disconnected';
  const isComingSoon   = svc.status === 'coming-soon';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      className={`relative flex flex-col p-6 rounded-3xl border transition-all duration-500 ${
        isConnected
          ? 'bg-[#12110F] border-[#D4A853]/30 shadow-[0_0_30px_rgba(212,168,83,0.05)]'
          : isComingSoon
          ? 'bg-[#0B0A08] border-white/5 opacity-50'
          : 'bg-[#12110F] border-white/5 hover:border-[#D4A853]/20'
      }`}
    >
      {/* Category pill */}
      <span className={`absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${CATEGORY_COLORS[svc.category] ?? 'bg-gray-700/50 text-gray-400'}`}>
        {svc.category}
      </span>

      {/* Icon + name */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${svc.gradient} flex-shrink-0 text-white`}>
          {svc.icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white leading-tight">{svc.name}</h3>
          {isConnected && svc.connectedInfo && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{svc.connectedInfo}</p>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-4">
        {isConnected ? (
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A853]/10 text-[#D4A853] rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] shadow-[0_0_8px_#D4A853] animate-pulse" />
            Synchronized
          </span>
        ) : isComingSoon ? (
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 text-[#5C564D] rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            Protocol Pending
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 text-[#8C8476] rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            Severed Link
          </span>
        )}
      </div>

      {/* Description */}
      <p className={`text-xs font-medium leading-relaxed mb-6 flex-1 uppercase tracking-widest ${isComingSoon ? 'text-[#5C564D]' : 'text-[#8C8476]'}`}>
        {svc.description}
      </p>

      {/* Action button */}
      {loading ? (
        <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 text-[#5C564D] text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Probing…
        </button>
      ) : isConnected ? (
        <button
          onClick={svc.onDisconnect}
          className="w-full px-4 py-3 rounded-xl bg-[#1A1815] hover:bg-[#B84052]/10 border border-transparent hover:border-[#B84052]/30 text-[10px] text-[#8C8476] hover:text-[#B84052] font-black uppercase tracking-widest transition-all duration-300"
        >
          Sever Connection
        </button>
      ) : isDisconnected ? (
        <button
          onClick={svc.onConnect}
          className={`w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#D4A853] to-[#B84052] hover:opacity-90 active:scale-[0.98] text-white text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(212,168,83,0.15)]`}
        >
          Initialize {svc.name}
        </button>
      ) : (
        <button disabled className="w-full px-4 py-3 rounded-xl bg-white/5 text-[#5C564D] text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
          Protocol Offline
        </button>
      )}
    </motion.div>
  );
}
