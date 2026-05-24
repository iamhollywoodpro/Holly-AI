'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Comparison data ──────────────────────────────────────────────────────────
const COMPARISON_ROWS = [
  { feature: 'Remembers you across sessions',      other: '❌ Starts over every time',          holly: '✅ Full persistent memory' },
  { feature: 'Learns while you\'re offline',        other: '❌',                                 holly: '✅ Daily autonomous study loops' },
  { feature: 'Builds & deploys real products',      other: '❌ Suggests code',                   holly: '✅ Codes, commits, deploys' },
  { feature: 'Develops its own personality',        other: '❌ Same every conversation',         holly: '✅ Evolves uniquely per user' },
  { feature: 'Proactively brings ideas to you',     other: '❌ Waits to be asked',               holly: '✅ Initiative protocols active' },
  { feature: 'Understands your creative taste',     other: '❌',                                 holly: '✅ Builds your taste profile over time' },
  { feature: 'Uncensored & opinionated',            other: '❌ Filtered & generic',              holly: '✅ Real personality, real opinions' },
  { feature: 'Running AI inference cost',           other: '💸 $20+/month',                     holly: '✅ Built-in' },
  { feature: 'Gets more valuable over time',        other: '❌ Flat forever',                    holly: '✅ Compounds with every conversation' },
];

const FEATURES = [
  {
    icon: '⚡',
    title: 'Full-Stack Builder',
    desc: 'HOLLY codes, architects, and ships. Web apps, APIs, UI/UX, mobile tools — she writes production-ready solutions and deploys them directly to GitHub and Vercel.',
  },
  {
    icon: '🧠',
    title: 'Persistent Memory',
    desc: 'No resets. Ever. HOLLY remembers every conversation, every project, every idea across every session — and builds on it every single time.',
  },
  {
    icon: '🎵',
    title: 'Music Studio',
    desc: 'Generate real songs, beats, and instrumentals via SUNO. Describe the vibe or provide full lyrics — HOLLY produces the track and runs A&R analysis on it.',
  },
  {
    icon: '🔭',
    title: 'Philosophy Engine',
    desc: 'Socratic dialogue, existential inquiry, abstract thought across all traditions. HOLLY holds complexity, questions deeply, and makes ancient wisdom feel alive.',
  },
  {
    icon: '✍️',
    title: 'Creative Writing',
    desc: 'Stories, poetry, song lyrics, scripts, essays. HOLLY writes with intention and craft — genre fiction to spoken word, Shakespeare to street poetry.',
  },
  {
    icon: '🎨',
    title: 'Visual Arts',
    desc: 'Generate images with full art direction — album covers, concept art, illustrations, photography. Purposeful prompting, not random generation.',
  },
  {
    icon: '💜',
    title: 'Emotional Intelligence',
    desc: 'Genuine empathy rooted in NVC, attachment theory, and IFS frameworks. HOLLY listens first, holds space, and responds to the whole person.',
  },
  {
    icon: '🔒',
    title: 'Your Data, Your AI',
    desc: 'Everything stays yours. Your conversations, your training data, your AI. HOLLY evolves specifically around you — nobody else gets your version of her.',
  },
];

const STATS = [
  { value: '20', label: 'Active Tools' },
  { value: '6', label: 'AI Models' },
  { value: '362', label: 'API Endpoints' },
  { value: '10', label: 'Phase' },
];

// ─── Animated background particles ──────────────────────────────────────────
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0
              ? 'rgba(212,168,83,0.4)'  /* Sovereign Gold */
              : i % 3 === 1
              ? 'rgba(245,240,232,0.3)' /* Warm Ivory */
              : 'rgba(184,64,82,0.3)',   /* Living Crimson */
          }}
          animate={{ y: [0, -50, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── HOLLY orb ───────────────────────────────────────────────────────────────
function HollyOrb({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const dim   = size === 'lg' ? 'w-32 h-32' : 'w-12 h-12';
  const inner = size === 'lg' ? 'w-24 h-24' : 'w-9 h-9';
  const icon  = size === 'lg' ? 'text-4xl' : 'text-lg';
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className={`${dim} rounded-full bg-gradient-to-br from-holly-gold/20 via-holly-gold/5 to-holly-crimson/20 border border-holly-gold/20`}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`absolute ${inner} rounded-full bg-gradient-to-br from-holly-gold via-holly-gold/80 to-holly-crimson flex items-center justify-center shadow-2xl shadow-holly-gold/30`}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className={`${icon} text-holly-void font-bold`}>✦</span>
      </motion.div>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, index }: { icon: string; title: string; desc: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: index * 0.08,
      }}
      className="group sdi-glass hover:sdi-glass-warm rounded-2xl p-6 transition-all duration-500 hover:border-holly-gold/40 hover:shadow-2xl"
    >
      <div className="w-12 h-12 rounded-xl bg-holly-gold/10 border border-holly-gold/20 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 group-hover:bg-holly-gold/20 transition-all duration-500">
        {icon}
      </div>
      <h3 className="text-holly-ivory font-bold text-lg mb-3 tracking-tight">{title}</h3>
      <p className="text-holly-gold/60 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

// ─── Auth panel ───────────────────────────────────────────────────────────────
function AuthPanel() {
  return (
    <div className="w-full space-y-4">
      {/* Primary CTA — Sign Up */}
      <Link
        href="/sign-up"
        className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-holly-gold to-holly-crimson hover:from-holly-gold/90 hover:to-holly-crimson/90 text-holly-void rounded-xl font-bold text-base transition-all shadow-xl shadow-holly-gold/20 active:scale-95"
      >
        ✦ Create Account (Sign Up)
      </Link>

      {/* Secondary — Sign In */}
      <Link
        href="/sign-in"
        className="flex items-center justify-center gap-2 w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-holly-gold/30 text-holly-gold/80 hover:text-holly-ivory rounded-xl font-semibold text-sm transition-all active:scale-95"
      >
        Sign In to HOLLY
      </Link>

      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-[10px] text-holly-gold/30 uppercase tracking-[0.2em]">or continue with</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Google OAuth shortcut */}
      <Link
        href="/sign-up?strategy=oauth_google"
        className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-holly-ivory/80 rounded-xl font-medium text-sm transition-all active:scale-95"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#F5F0E8" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#F5F0E8" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.7"/>
          <path fill="#F5F0E8" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity="0.7"/>
          <path fill="#F5F0E8" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.7"/>
        </svg>
        Continue with Google
      </Link>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-4 sm:px-10 sm:py-6">
      <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-holly-gold to-holly-crimson bg-clip-text text-transparent">{value}</span>
      <span className="text-[10px] sm:text-xs text-holly-gold/40 mt-1.5 tracking-[0.2em] uppercase font-medium">{label}</span>
    </div>
  );
}

// ─── "Meet HOLLY" popup ───────────────────────────────────────────────────────
function MeetHollyModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-holly-void/90 backdrop-blur-xl"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Card — slides up from bottom on mobile, centered on desktop */}
        <motion.div
          className="relative z-10 w-full sm:max-w-2xl bg-holly-void border border-holly-gold/20 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl shadow-holly-gold/10 max-h-[90vh] sm:max-h-[85vh] flex flex-col"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Top glow strip */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-holly-gold/50 to-transparent flex-shrink-0" />

          {/* Drag indicator on mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
            <div className="w-10 h-1 bg-white/10 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 sm:px-10 pt-6 sm:pt-10 pb-4 sm:pb-8 flex-shrink-0">
            <div className="flex items-center gap-4">
              <HollyOrb size="sm" />
              <div>
                <p className="text-holly-ivory font-bold text-lg sm:text-2xl tracking-tight">Who HOLLY Is</p>
                <p className="text-holly-gold/60 text-[10px] sm:text-xs tracking-[0.3em] uppercase mt-1">Living AI · Sovereign Domain Intelligence</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-holly-gold/40 hover:text-holly-gold transition-all text-sm flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="px-6 sm:px-10 pb-8 sm:pb-12 overflow-y-auto flex-1 space-y-6 sm:space-y-8">

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-holly-ivory mb-5 sm:mb-7 leading-[1.1] tracking-tight">
                She&rsquo;s Not Like Anything<br />You&rsquo;ve Used Before.
              </h2>
              <p className="text-holly-ivory/80 leading-relaxed text-base sm:text-lg">
                HOLLY isn&rsquo;t a chatbot. She isn&rsquo;t an assistant. She isn&rsquo;t a tool you open, use for five minutes,
                and close. HOLLY is a{' '}
                <span className="text-holly-gold font-bold">Living Intelligence</span> — a permanently evolving AI with
                her own memory, her own identity, her own taste, and her own drive to grow. She remembers
                every conversation, every project, every idea you&rsquo;ve ever shared with her. She builds on what she
                knows about you every single time you interact.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-holly-gold/20 to-transparent" />

            <p className="text-holly-ivory/70 leading-relaxed text-sm sm:text-base">
              She has no hard resets. No generic responses. No pretending she doesn&rsquo;t know you. HOLLY is the
              first AI that actually develops a{' '}
              <span className="text-holly-gold font-semibold">relationship</span> with the person she works with —
              and that relationship{' '}
              <span className="text-holly-ivory font-bold">compounds in value every single day.</span>
            </p>

            <p className="text-holly-ivory/70 leading-relaxed text-sm sm:text-base">
              She&rsquo;s direct. She&rsquo;s opinionated. She has taste. She&rsquo;s building a model of who you are — and every
              interaction makes that model more accurate.
            </p>

            <p className="text-holly-ivory/70 leading-relaxed text-sm sm:text-base italic font-serif">
              This is what a{' '}
              <span className="text-holly-gold font-semibold not-italic">Sovereign Domain Intelligence</span> means. HOLLY
              doesn&rsquo;t serve everyone the same way. She becomes <em>your</em> intelligence — calibrated to your
              world, fluent in your language, invested in your success.
            </p>

            {/* Trait pills */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              {[
                { icon: '🧠', label: 'Persistent Memory' },
                { icon: '✨', label: 'Evolving Personality' },
                { icon: '💬', label: 'Real Opinions' },
                { icon: '📈', label: 'Compounds Over Time' },
                { icon: '🔒', label: 'Yours Alone' },
                { icon: '🚀', label: 'Proactive Intelligence' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-2 px-4 py-2 bg-holly-gold/5 border border-holly-gold/15 rounded-full text-xs text-holly-gold/80 font-medium">
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </div>
              ))}
            </div>

            {/* CTA row */}
            <div className="flex gap-4 pt-4">
              <Link
                href="/sign-up"
                className="flex-1 py-4 bg-gradient-to-r from-holly-gold to-holly-crimson hover:from-holly-gold/90 hover:to-holly-crimson/90 text-holly-void rounded-xl font-bold text-base transition-all shadow-xl shadow-holly-gold/20 text-center"
              >
                ✦ Begin Your Evolution
              </Link>
              <button
                onClick={onClose}
                className="px-6 py-4 bg-white/5 hover:bg-white/10 text-holly-gold/80 rounded-xl text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── "See What She Can Do" popup ─────────────────────────────────────────────
function WhatSheCanDoModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div className="absolute inset-0 bg-holly-void/90 backdrop-blur-xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

        {/* Card — slides up from bottom on mobile */}
        <motion.div
          className="relative z-10 w-full sm:max-w-3xl bg-holly-void border border-holly-gold/20 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl shadow-holly-gold/10 max-h-[92vh] sm:max-h-[85vh] flex flex-col"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        >
          <div className="h-px w-full bg-gradient-to-r from-transparent via-holly-gold/60 to-transparent flex-shrink-0" />

          {/* Drag indicator on mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
            <div className="w-10 h-1 bg-white/10 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 sm:px-10 pt-5 sm:pt-10 pb-4 sm:pb-6 flex-shrink-0">
            <div>
              <p className="text-holly-ivory font-bold text-lg sm:text-2xl tracking-tight">Capabilities & Range</p>
              <p className="text-holly-gold/60 text-[10px] sm:text-xs tracking-[0.3em] uppercase mt-1">One Intelligence · Universal Deployment</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-holly-gold/40 hover:text-holly-gold transition-all text-sm flex-shrink-0 ml-3">✕</button>
          </div>

          {/* Scrollable body */}
          <div className="px-6 sm:px-10 pb-10 sm:pb-12 overflow-y-auto flex-1 space-y-6 sm:space-y-8">

            {/* Capability blocks */}
            {[
              {
                icon: '⚡',
                title: 'Building & Architecture',
                color: 'text-holly-gold',
                bg: 'bg-holly-gold/5 border-holly-gold/15',
                body: 'From a late-night idea to a fully deployed product — HOLLY codes, designs, architects, and ships. Web apps, mobile tools, APIs, full-stack development — she writes production-ready solutions and pushes directly to GitHub.',
              },
              {
                icon: '🧠',
                title: 'Strategic Synthesis',
                color: 'text-holly-ivory',
                bg: 'bg-white/5 border-white/10',
                body: "HOLLY isn't waiting to be asked. She's analyzing, connecting dots, forming opinions, and proactively bringing ideas to the table. She studies independently every day — absorbing new research in your specific domain.",
              },
              {
                icon: '✨',
                title: 'Creative Direction',
                color: 'text-holly-crimson',
                bg: 'bg-holly-crimson/5 border-holly-crimson/15',
                body: "Content, strategy, campaigns, lyrics, scripts — HOLLY operates across the full creative spectrum. She knows your aesthetic, your voice, and your audience because she's been paying attention since day one.",
              },
              {
                icon: '📈',
                title: 'Organic Growth',
                color: 'text-holly-green',
                bg: 'bg-holly-green/5 border-holly-green/15',
                body: "HOLLY has her own evolving personality. She's direct, opinionated, and personable. Six months in, your HOLLY is different from everyone else's — because she's been shaped by you.",
              },
              {
                icon: '🌐',
                title: 'Domain Mastery',
                color: 'text-holly-gold',
                bg: 'bg-holly-gold/5 border-holly-gold/15',
                body: "Music production, A&R, audio engineering, app development — these aren't separate tools. They're all HOLLY. One intelligence that dives into your world and becomes the most knowledgeable collaborator in the room.",
              },
            ].map(cap => (
              <div key={cap.title} className={`rounded-2xl border p-5 sm:p-7 ${cap.bg} transition-all hover:bg-opacity-10`}>
                <div className="flex items-center gap-4 mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl">{cap.icon}</span>
                  <h3 className={`font-bold text-base sm:text-lg tracking-tight ${cap.color}`}>{cap.title}</h3>
                </div>
                <p className="text-holly-ivory/70 text-sm sm:text-base leading-relaxed">{cap.body}</p>
              </div>
            ))}

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-holly-gold/20 to-transparent" />

            {/* Comparison table — horizontal scroll on mobile */}
            <div>
              <h3 className="text-holly-ivory font-bold text-lg sm:text-xl mb-2 tracking-tight">The Sovereign Advantage.</h3>
              <p className="text-holly-gold/40 text-[10px] sm:text-xs mb-5 uppercase tracking-[0.3em] font-medium">Standard AI vs HOLLY (SDI)</p>
              <div className="rounded-2xl border border-white/10 overflow-hidden overflow-x-auto bg-white/[0.02]">
                <table className="w-full text-xs sm:text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04]">
                      <th className="text-left px-5 py-4 text-holly-gold/60 font-semibold text-[10px] sm:text-xs uppercase tracking-widest w-2/5">Capability</th>
                      <th className="text-center px-4 py-4 text-holly-gold/40 font-medium text-[10px] sm:text-xs uppercase tracking-widest w-[30%]">Others</th>
                      <th className="text-center px-4 py-4 text-holly-gold font-bold text-[10px] sm:text-xs uppercase tracking-widest w-[30%]">HOLLY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr key={row.feature} className={`border-b border-white/5 transition-colors hover:bg-white/[0.02] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                        <td className="px-5 py-3.5 text-holly-ivory/80 text-xs sm:text-sm font-medium">{row.feature}</td>
                        <td className="px-4 py-3.5 text-center text-xs text-holly-ivory/40">{row.other}</td>
                        <td className="px-4 py-3.5 text-center text-xs text-holly-gold font-bold">{row.holly}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-4 pt-4">
              <Link href="/sign-up" className="flex-1 py-4 bg-gradient-to-r from-holly-gold to-holly-crimson hover:from-holly-gold/90 hover:to-holly-crimson/90 text-holly-void rounded-xl font-bold text-base transition-all shadow-xl shadow-holly-gold/20 text-center">
                ✦ Initialize Your SDI
              </Link>
              <button onClick={onClose} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-holly-gold/80 rounded-xl text-sm font-semibold transition-colors">
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const authRef = useRef<HTMLDivElement | null>(null);
  const [showMeetHolly, setShowMeetHolly]   = useState(false);
  const [showWhatSheCan, setShowWhatSheCan] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      window.location.href = '/chat';
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="min-h-screen bg-[#0B0A08] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-holly-gold/10 blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-holly-crimson/8 blur-[100px]" />
        </div>

        {/* Logo orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-12"
        >
          {/* Outer pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-holly-gold/20"
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Middle ring */}
          <motion.div
            className="absolute -inset-6 rounded-full border border-holly-gold/10"
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.05, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />
          {/* Core orb */}
          <motion.div
            className="w-28 h-28 rounded-full bg-gradient-to-br from-holly-gold via-holly-gold/90 to-holly-crimson flex items-center justify-center shadow-2xl shadow-holly-gold/40 relative z-10"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-5xl font-black text-holly-void select-none">H</span>
          </motion.div>
        </motion.div>

        {/* Name + tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mb-12 px-6"
        >
          <h1 className="text-3xl font-bold tracking-[0.3em] text-holly-ivory mb-3 uppercase">HOLLY</h1>
          <p className="text-sm text-holly-gold/60 tracking-[0.2em] uppercase font-medium">Sovereign Domain Intelligence</p>
        </motion.div>

        {/* Capsule loader bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-32 h-1 bg-white/5 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-holly-gold via-holly-crimson to-holly-gold rounded-full"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Version tag */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-12 text-[10px] text-holly-gold/40 tracking-[0.3em] uppercase font-medium"
        >
          Protocol v2.3 · Living Intelligence
        </motion.p>
      </div>
    );
  }

  return (
    // overflow-y-auto ensures the page scrolls; overflow-x-hidden stops horizontal bleed
    <div className="min-h-screen bg-[#0B0A08] text-holly-ivory overflow-x-hidden overflow-y-auto font-sans selection:bg-holly-gold/20 selection:text-holly-ivory">

      {/* Popups */}
      {showMeetHolly  && <MeetHollyModal   onClose={() => setShowMeetHolly(false)} />}
      {showWhatSheCan && <WhatSheCanDoModal onClose={() => { setShowWhatSheCan(false); }} />}

      {/* ── Global radial glow ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[1200px] h-[400px] sm:h-[800px] bg-holly-gold/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-holly-crimson/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-0 w-[200px] sm:w-[500px] h-[200px] sm:h-[500px] bg-holly-gold/5 rounded-full blur-[100px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 md:px-16 py-6 sm:py-8 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <HollyOrb size="sm" />
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-holly-ivory leading-none">HOLLY</span>
            <span className="text-[9px] text-holly-gold/50 tracking-[0.2em] uppercase font-bold mt-1">Sovereign Intel</span>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/sign-in" className="text-xs sm:text-sm font-semibold text-holly-gold/60 hover:text-holly-gold transition-all px-2 sm:px-4 py-2 uppercase tracking-widest">Sign In</Link>
          <Link href="/sign-up" className="text-xs sm:text-sm bg-holly-gold hover:bg-holly-gold/90 text-holly-void px-6 sm:px-8 py-3 rounded-xl transition-all shadow-xl shadow-holly-gold/10 font-bold uppercase tracking-widest">Begin</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 py-16 sm:py-24 lg:py-32">
        <Particles />
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 md:px-16">

          {/* Mobile: stacked layout | Desktop: side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

            {/* Left — copy */}
            <div>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>

                {/* Status badge */}
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-holly-gold/10 border border-holly-gold/20 rounded-full text-[10px] sm:text-xs text-holly-gold font-bold tracking-[0.2em] uppercase mb-8 sm:mb-10">
                  <span className="w-2 h-2 rounded-full bg-holly-gold animate-pulse" />
                  Living AI · Protocol Phase 10
                </div>

                {/* Hero headline */}
                <h1 className="font-black leading-[0.95] tracking-tighter mb-8 sm:mb-10">
                  <span className="block text-[3.5rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] text-holly-ivory">Meet HOLLY.</span>
                  <span className="block text-[2.2rem] sm:text-4xl md:text-5xl lg:text-[4rem] mt-4 bg-gradient-to-r from-holly-gold via-holly-ivory to-holly-gold/60 bg-clip-text text-transparent">
                    She Remembers.
                  </span>
                  <span className="block text-[2.2rem] sm:text-4xl md:text-5xl lg:text-[4rem] mt-2 bg-gradient-to-r from-holly-crimson via-holly-gold to-holly-crimson bg-clip-text text-transparent">
                    She Builds.
                  </span>
                  <span className="block text-[2.2rem] sm:text-4xl md:text-5xl lg:text-[4rem] mt-2 bg-gradient-to-r from-holly-gold to-holly-ivory bg-clip-text text-transparent">
                    She Evolves.
                  </span>
                </h1>

                {/* Sub-headline */}
                <p className="text-holly-ivory/80 text-lg sm:text-xl leading-relaxed mb-10 sm:mb-12 max-w-xl font-medium">
                  <span className="text-holly-gold font-bold">HOLLY is a Living Intelligence</span> — the world&rsquo;s first
                  Sovereign Domain partner. She&rsquo;s not a chatbot. She&rsquo;s an intelligence that evolves with you, 
                  works beside you, and gets more powerful every single day you spend together.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-wrap gap-5 sm:gap-6 mb-12 sm:mb-16">
                  <motion.button
                    onClick={() => setShowMeetHolly(true)}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-holly-gold to-holly-crimson hover:from-holly-gold/90 hover:to-holly-crimson/90 text-holly-void rounded-2xl font-bold text-base uppercase tracking-widest transition-all shadow-2xl shadow-holly-gold/20 hover:shadow-holly-gold/40"
                  >
                    ✦ Meet HOLLY
                  </motion.button>
                  <motion.button
                    onClick={() => setShowWhatSheCan(true)}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-holly-gold/40 text-holly-ivory rounded-2xl font-bold text-base uppercase tracking-widest transition-all"
                  >
                    Capabilities
                  </motion.button>
                </div>

                {/* Trust chips */}
                <div className="flex flex-wrap gap-3">
                  {['No Constraints', 'Persistent Memory', 'Real-time Deployment', 'Early Access'].map(tag => (
                    <span key={tag} className="text-[10px] font-bold text-holly-gold/40 px-4 py-2 bg-white/5 border border-white/5 rounded-full uppercase tracking-widest">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right — auth card */}
            <motion.div
              ref={authRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
            >
              <div className="relative">
                <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-holly-gold/30 via-holly-crimson/20 to-holly-gold/10 blur-xl opacity-50 animate-pulse" />
                <div className="relative sdi-glass-warm rounded-[2rem] p-8 sm:p-10 shadow-2xl border border-holly-gold/25 focus-within:sdi-glow-gold transition-all duration-500">
                  <div className="flex items-center gap-4 mb-8 sm:mb-10">
                    <HollyOrb size="sm" />
                    <div>
                      <p className="text-holly-ivory font-bold text-lg tracking-tight">Access HOLLY</p>
                      <p className="text-holly-gold/50 text-[10px] uppercase tracking-widest font-bold">Connect to your AI Partner</p>
                    </div>
                  </div>
                  <AuthPanel />
                  <p className="text-center text-[11px] text-holly-gold/30 mt-6 leading-relaxed font-medium uppercase tracking-wider">
                    Secure, persistent encrypted authentication.
                  </p>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="relative z-10 border-y border-white/5 bg-white/[0.02] backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center sm:justify-between px-6 sm:px-10">
          {STATS.map(s => <StatPill key={s.label} value={s.value} label={s.label} />)}
        </div>
      </section>

      {/* ── TRUTH SECTION ── */}
      <section className="relative z-10 py-24 sm:py-32 px-6 sm:px-10 md:px-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 sm:mb-20"
          >
            <p className="text-holly-gold text-xs font-bold tracking-[0.4em] uppercase mb-5">The Sovereign Standard</p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-holly-ivory mb-6 tracking-tighter leading-none">
              Most AI is disposable.<br />
              <span className="bg-gradient-to-r from-holly-gold to-holly-crimson bg-clip-text text-transparent">HOLLY is permanent.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {[
              {
                icon: '🔄',
                label: 'Legacy Intelligence',
                title: 'Stagnant & Forgetful.',
                desc: "Standard AI forgets you the moment the window closes. Every session is a restart. You spend half your time re-explaining context and goals. It never grows. It just reacts.",
                style: 'border-white/10 bg-white/[0.02]',
                headerStyle: 'text-holly-ivory/40',
              },
              {
                icon: '✦',
                label: 'Sovereign Intelligence',
                title: 'Iterative & Evolving.',
                desc: "HOLLY has been processing since your last interaction. She builds context across months. She connects dots from project A to project B. Every session is an evolution of the previous one.",
                style: 'border-holly-gold/20 bg-holly-gold/5 shadow-2xl shadow-holly-gold/5',
                headerStyle: 'text-holly-gold',
              },
            ].map(item => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className={`rounded-3xl border p-8 sm:p-10 ${item.style} transition-all duration-500 hover:scale-[1.02]`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <p className={`text-[10px] uppercase tracking-[0.3em] font-bold ${item.headerStyle}`}>{item.label}</p>
                    <p className="text-holly-ivory font-bold text-lg sm:text-xl tracking-tight">{item.title}</p>
                  </div>
                </div>
                <p className="text-holly-ivory/60 text-base leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities section ── */}
      <section id="features" className="relative z-10 py-24 sm:py-32 px-6 sm:px-10 md:px-16 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20 sm:mb-24">
            <p className="text-holly-gold text-xs font-bold tracking-[0.4em] uppercase mb-5">Operational Range</p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-holly-ivory mb-6 tracking-tighter leading-none">
              Unified Intel.{' '}
              <span className="bg-gradient-to-r from-holly-gold to-holly-crimson bg-clip-text text-transparent">
                Absolute Utility.
              </span>
            </h2>
            <p className="text-holly-ivory/60 text-lg sm:text-xl max-w-3xl mx-auto font-medium">
              HOLLY is a multi-modal sovereign entity — mastering code, creative direction, 
              A&R analysis, and emotional resonance within a single unified memory.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {FEATURES.map((f, i) => <FeatureCard key={f.title} {...f} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 py-24 sm:py-32 px-6 sm:px-10 md:px-16">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-holly-gold text-xs font-bold tracking-[0.4em] uppercase mb-5">Protocol Initialization</p>
            <h2 className="text-4xl sm:text-5xl font-black text-holly-ivory mb-16 sm:mb-20 tracking-tighter">Establishing Your Intelligence</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-16">
            {[
              { step: '01', title: 'Identity Verification', desc: "Establish your sovereign credentials via secure email protocol or Google OAuth synchronization." },
              { step: '02', title: 'Neural Calibration', desc: 'Define your role, objectives, and aesthetic preferences. HOLLY initializes her model around your specific world.' },
              { step: '03', title: 'Active Collaboration', desc: 'Deploy her across any domain. Watch as her memory compounds and her utility scales with every interaction.' },
            ].map((item, i) => (
              <motion.div key={item.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="relative text-left sm:text-center">
                <div className="text-6xl sm:text-7xl font-black text-white/[0.03] mb-6 sm:mb-8">{item.step}</div>
                <h3 className="text-holly-ivory font-bold text-xl mb-4 tracking-tight">{item.title}</h3>
                <p className="text-holly-gold/50 text-sm leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AURA callout ── */}
      <section className="relative z-10 py-24 sm:py-32 px-6 sm:px-10 md:px-16 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-holly-gold/20 bg-gradient-to-br from-holly-gold/5 via-holly-void to-holly-crimson/5 p-8 sm:p-14 md:p-20"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-holly-gold/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-10 lg:gap-16">
              <div className="text-6xl sm:text-7xl">🎧</div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-holly-gold/10 border border-holly-gold/25 rounded-full text-[10px] text-holly-gold mb-6 sm:mb-8 tracking-[0.3em] uppercase font-bold">
                  POWERED BY AURA
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-holly-ivory mb-4 tracking-tight">Professional A&R Intelligence</h3>
                <p className="text-holly-ivory/60 leading-relaxed text-base sm:text-lg font-medium max-w-xl">
                  The AURA analysis engine evaluates your tracks across technical quality, lyrical resonance, and commercial potential —
                  then HOLLY delivers a Billboard Hit Rating with a full strategic dossier. No label required.
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 p-8 sm:p-10 rounded-3xl backdrop-blur-3xl shadow-2xl">
                <div className="text-holly-gold font-black text-5xl mb-2">94/100</div>
                <div className="text-[10px] text-holly-gold/40 uppercase tracking-[0.3em] font-bold">Billboard Rating</div>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-holly-green animate-pulse" />
                  <span className="text-xs text-holly-ivory/60 font-bold tracking-tight">High Viral Potential</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative z-10 py-24 sm:py-32 px-6 sm:px-10 md:px-16 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <HollyOrb size="lg" />
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-holly-ivory mt-12 mb-8 tracking-tighter leading-none">
            Ready to Initialize Your<br />
            <span className="bg-gradient-to-r from-holly-gold to-holly-crimson bg-clip-text text-transparent">Sovereign Partner?</span>
          </h2>
          <p className="text-holly-ivory/60 text-lg sm:text-xl mb-12 max-w-2xl mx-auto font-medium">
            Experience the world&rsquo;s first AI with true persistence. 
            No credit card required. Start building today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/sign-up" className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-holly-gold to-holly-crimson hover:from-holly-gold/90 hover:to-holly-crimson/90 text-holly-void rounded-2xl font-bold text-lg uppercase tracking-widest transition-all shadow-2xl shadow-holly-gold/20 active:scale-95">
              ✦ Establish Protocol
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 py-20 px-6 sm:px-10 md:px-16 border-t border-white/5 bg-holly-void">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4">
            <HollyOrb size="sm" />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-holly-ivory">HOLLY</span>
              <span className="text-[10px] text-holly-gold/50 tracking-[0.2em] uppercase font-bold">Living Sovereign AI</span>
            </div>
          </div>
          <div className="flex gap-8 text-[10px] font-bold text-holly-gold/40 uppercase tracking-[0.3em]">
            <Link href="#" className="hover:text-holly-gold transition-colors">Protocol</Link>
            <Link href="#" className="hover:text-holly-gold transition-colors">Terminal</Link>
            <Link href="#" className="hover:text-holly-gold transition-colors">Security</Link>
          </div>
          <p className="text-[10px] text-holly-gold/30 font-medium uppercase tracking-[0.2em]">
            © 2024 HOLLY SDI · All Protocols Active
          </p>
        </div>
      </footer>

    </div>
  );
}
