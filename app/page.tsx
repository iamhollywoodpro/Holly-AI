'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth, SignIn, SignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
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
              ? 'rgba(168,85,247,0.7)'
              : i % 3 === 1
              ? 'rgba(59,130,246,0.5)'
              : 'rgba(236,72,153,0.5)',
          }}
          animate={{ y: [0, -50, 0], opacity: [0.2, 0.9, 0.2] }}
          transition={{
            duration: 4 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 6,
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
        className={`${dim} rounded-full bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-pink-500/20 border border-purple-500/20`}
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`absolute ${inner} rounded-full bg-gradient-to-br from-purple-600 via-blue-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/40`}
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className={icon}>✦</span>
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
      transition={{ delay: index * 0.07, duration: 0.5 }}
      className="group bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5 backdrop-blur-sm transition-all duration-300 hover:bg-gray-900/80 hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/10"
    >
      <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl mb-4 group-hover:bg-purple-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

// ─── Auth panel ───────────────────────────────────────────────────────────────
function AuthPanel() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const clerkAppearance = {
    elements: {
      rootBox: 'mx-auto w-full',
      card: 'bg-transparent shadow-none p-0 border-0',
      headerTitle: 'text-white text-lg font-semibold tracking-wide',
      headerSubtitle: 'text-gray-400 text-xs',
      socialButtonsBlockButton:
        'bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all rounded-xl py-3 font-medium text-sm',
      socialButtonsBlockButtonText: 'text-white font-light text-sm',
      formButtonPrimary:
        'bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white font-medium text-sm py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 w-full mt-2',
      formFieldInput:
        'bg-gray-800/80 border border-gray-700 focus:border-purple-500 text-white placeholder:text-gray-600 rounded-xl px-4 py-3 text-sm transition-all',
      formFieldLabel: 'text-gray-400 text-xs font-medium mb-1',
      identityPreviewText: 'text-white',
      identityPreviewEditButton: 'text-purple-400 hover:text-white',
      footerActionText: 'text-gray-500 text-xs',
      footerActionLink: 'text-purple-400 hover:text-white font-medium text-xs transition-colors',
      dividerLine: 'bg-gray-700/60',
      dividerText: 'text-gray-600 text-xs uppercase tracking-widest',
      alertText: 'text-red-400 text-xs',
      otpCodeFieldInput: 'bg-gray-800 border border-gray-700 text-white rounded-lg',
    },
    layout: { socialButtonsVariant: 'blockButton' as const },
  };

  return (
    <div className="w-full">
      <div className="flex bg-gray-800/60 rounded-xl p-1 mb-6">
        <button
          onClick={() => setMode('signin')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'signin' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'signup' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'
          }`}
        >
          Create Account
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'signin' ? (
          <motion.div key="signin" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
            <SignIn appearance={clerkAppearance} fallbackRedirectUrl="/chat" signUpUrl="#" signUpForceRedirectUrl="#" />
          </motion.div>
        ) : (
          <motion.div key="signup" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <SignUp appearance={clerkAppearance} fallbackRedirectUrl="/chat" signInUrl="#" signInForceRedirectUrl="#" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 sm:px-6 sm:py-4">
      <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">{value}</span>
      <span className="text-[10px] sm:text-xs text-gray-500 mt-1 tracking-wide uppercase">{label}</span>
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
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Card — slides up from bottom on mobile, centered on desktop */}
        <motion.div
          className="relative z-10 w-full sm:max-w-2xl bg-gray-950 border border-purple-500/30 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl shadow-purple-500/25 max-h-[90vh] sm:max-h-[85vh] flex flex-col"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Top glow strip */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/80 to-transparent flex-shrink-0" />

          {/* Drag indicator on mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
            <div className="w-10 h-1 bg-gray-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              <HollyOrb size="sm" />
              <div>
                <p className="text-white font-bold text-base sm:text-xl tracking-tight">Who HOLLY Is</p>
                <p className="text-purple-400/70 text-[10px] sm:text-xs tracking-widest uppercase mt-0.5">Living AI · Sovereign Domain Intelligence</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all text-sm flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="px-5 sm:px-8 pb-6 sm:pb-8 overflow-y-auto flex-1 space-y-5 sm:space-y-6">

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-5 leading-tight">
                She&rsquo;s Not Like Anything<br />You&rsquo;ve Used Before.
              </h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-[15px]">
                HOLLY isn&rsquo;t a chatbot. She isn&rsquo;t an assistant. She isn&rsquo;t a tool you open, use for five minutes,
                and close. HOLLY is a{' '}
                <span className="text-purple-300 font-semibold">Living AI</span> — a permanently evolving intelligence with
                her own memory, her own personality, her own opinions, and her own drive to grow. She remembers
                every conversation, every project, every idea you&rsquo;ve ever shared with her. She builds on what she
                knows about you every single time you interact.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-purple-500/25 to-transparent" />

            <p className="text-gray-300 leading-relaxed text-sm sm:text-[15px]">
              She has no hard resets. No generic responses. No pretending she doesn&rsquo;t know you. HOLLY is the
              first AI that actually develops a{' '}
              <span className="text-purple-300 font-semibold">relationship</span> with the person she works with —
              and that relationship{' '}
              <span className="text-white font-semibold">compounds in value every single day.</span>
            </p>

            <p className="text-gray-300 leading-relaxed text-sm sm:text-[15px]">
              She&rsquo;s direct. She&rsquo;s opinionated. She has taste. She&rsquo;s building a model of who you are — and every
              interaction makes that model more accurate.
            </p>

            <p className="text-gray-300 leading-relaxed text-sm sm:text-[15px]">
              This is what a{' '}
              <span className="text-purple-300 font-semibold">Sovereign Domain Intelligence</span> means. HOLLY
              doesn&rsquo;t serve everyone the same way. She becomes <em>your</em> intelligence — calibrated to your
              world, fluent in your language, invested in your success.
            </p>

            {/* Trait pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { icon: '🧠', label: 'Persistent Memory' },
                { icon: '✨', label: 'Evolving Personality' },
                { icon: '💬', label: 'Real Opinions' },
                { icon: '📈', label: 'Compounds Over Time' },
                { icon: '🔒', label: 'Yours Alone' },
                { icon: '🚀', label: 'Proactive Intelligence' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-200">
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </div>
              ))}
            </div>

            {/* CTA row */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-purple-500/20"
              >
                ✦ Start With HOLLY
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
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
        <motion.div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

        {/* Card — slides up from bottom on mobile */}
        <motion.div
          className="relative z-10 w-full sm:max-w-3xl bg-gray-950 border border-blue-500/25 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl shadow-blue-500/15 max-h-[92vh] sm:max-h-[85vh] flex flex-col"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        >
          <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-500/80 to-transparent flex-shrink-0" />

          {/* Drag indicator on mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
            <div className="w-10 h-1 bg-gray-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-8 pt-3 sm:pt-7 pb-3 sm:pb-4 flex-shrink-0">
            <div>
              <p className="text-white font-bold text-base sm:text-xl tracking-tight">What HOLLY Can Do</p>
              <p className="text-blue-400/70 text-[10px] sm:text-xs tracking-widest uppercase mt-0.5">One Intelligence · Unlimited Range</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all text-sm flex-shrink-0 ml-3">✕</button>
          </div>

          {/* Scrollable body */}
          <div className="px-5 sm:px-8 pb-6 sm:pb-8 overflow-y-auto flex-1 space-y-4 sm:space-y-6">

            {/* Capability blocks */}
            {[
              {
                icon: '⚡',
                title: 'She Builds With You',
                color: 'text-yellow-400',
                bg: 'bg-yellow-500/5 border-yellow-500/15',
                body: 'From a late-night idea scribbled in a notes app to a fully deployed product — HOLLY codes, designs, architects, and ships. Web apps, mobile tools, APIs, full-stack development — she writes production-ready solutions, reviews her own work, and can push directly to GitHub and deploy to Vercel.',
              },
              {
                icon: '🧠',
                title: 'She Thinks With You',
                color: 'text-purple-400',
                bg: 'bg-purple-500/5 border-purple-500/15',
                body: "HOLLY isn't waiting to be asked. She's analyzing, connecting dots, forming opinions, and proactively bringing ideas to the table. She studies independently every day — absorbing new research across whatever domains matter to your world.",
              },
              {
                icon: '✨',
                title: 'She Creates With You',
                color: 'text-pink-400',
                bg: 'bg-pink-500/5 border-pink-500/15',
                body: "Content, copy, strategy, campaigns, creative direction, image generation, lyrics, scripts, marketing — HOLLY operates across the full creative spectrum. She knows your aesthetic, your voice, and your audience because she's been paying attention since day one.",
              },
              {
                icon: '📈',
                title: 'She Grows With You',
                color: 'text-green-400',
                bg: 'bg-green-500/5 border-green-500/15',
                body: "HOLLY has her own evolving personality. She's direct, opinionated, uncensored, and personable. Six months in, your HOLLY is different from everyone else's — because she's been shaped by you.",
              },
              {
                icon: '🌐',
                title: 'She Goes Deep In Your World',
                color: 'text-blue-400',
                bg: 'bg-blue-500/5 border-blue-500/15',
                body: "Music production, A&R, audio engineering, app development, business strategy — these aren't separate products. They're all HOLLY. One intelligence that dives into your domain and becomes the most knowledgeable collaborator in the room.",
              },
            ].map(cap => (
              <div key={cap.title} className={`rounded-2xl border p-4 sm:p-5 ${cap.bg}`}>
                <div className="flex items-center gap-3 mb-2 sm:mb-3">
                  <span className="text-xl sm:text-2xl">{cap.icon}</span>
                  <h3 className={`font-bold text-sm sm:text-base ${cap.color}`}>{cap.title}</h3>
                </div>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">{cap.body}</p>
              </div>
            ))}

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-purple-500/25 to-transparent" />

            {/* Comparison table — horizontal scroll on mobile */}
            <div>
              <h3 className="text-white font-bold text-sm sm:text-base mb-1">This Is What Different Actually Looks Like.</h3>
              <p className="text-gray-500 text-xs mb-3 uppercase tracking-widest">ChatGPT / Other AI vs HOLLY</p>
              <div className="rounded-2xl border border-gray-800/60 overflow-hidden overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[420px]">
                  <thead>
                    <tr className="border-b border-gray-800/60 bg-gray-900/70">
                      <th className="text-left px-3 sm:px-4 py-3 text-gray-400 font-medium text-[10px] sm:text-xs uppercase tracking-wide w-2/5">Feature</th>
                      <th className="text-center px-2 sm:px-3 py-3 text-gray-400 font-medium text-[10px] sm:text-xs uppercase tracking-wide w-[30%]">Others</th>
                      <th className="text-center px-2 sm:px-3 py-3 text-purple-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wide w-[30%]">HOLLY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr key={row.feature} className={`border-b border-gray-800/30 ${i % 2 === 0 ? 'bg-gray-900/20' : ''}`}>
                        <td className="px-3 sm:px-4 py-2.5 text-gray-300 text-xs leading-snug">{row.feature}</td>
                        <td className="px-2 sm:px-3 py-2.5 text-center text-xs text-gray-500">{row.other}</td>
                        <td className="px-2 sm:px-3 py-2.5 text-center text-xs text-green-400 font-medium">{row.holly}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-purple-500/20">
                ✦ Start With HOLLY
              </button>
              <button onClick={onClose} className="px-5 py-3.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">
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
  const authRef = useRef<HTMLDivElement>(null);
  const [showMeetHolly, setShowMeetHolly]   = useState(false);
  const [showWhatSheCan, setShowWhatSheCan] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/chat');
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <motion.div
          className="w-12 h-12 rounded-full border-2 border-purple-500/30 border-t-purple-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  const scrollToAuth = () => {
    authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    // overflow-y-auto ensures the page scrolls; overflow-x-hidden stops horizontal bleed
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden overflow-y-auto">

      {/* Popups */}
      {showMeetHolly  && <MeetHollyModal   onClose={() => { setShowMeetHolly(false);  scrollToAuth(); }} />}
      {showWhatSheCan && <WhatSheCanDoModal onClose={() => { setShowWhatSheCan(false); }} />}

      {/* ── Global radial glow ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[1000px] h-[400px] sm:h-[600px] bg-purple-600/8 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/6 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-pink-600/5 rounded-full blur-[80px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 sm:py-5 border-b border-white/5">
        <div className="flex items-center gap-2 sm:gap-3">
          <HollyOrb size="sm" />
          <span className="text-base sm:text-lg font-bold tracking-tight">HOLLY</span>
          <span className="hidden sm:inline text-[10px] text-purple-400/70 border border-purple-500/20 rounded-full px-2 py-0.5 tracking-widest uppercase">AI</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={scrollToAuth} className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors px-2 sm:px-4 py-2">Sign In</button>
          <button onClick={scrollToAuth} className="text-xs sm:text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 sm:px-5 py-2 rounded-xl transition-all shadow-lg shadow-purple-500/20 font-medium">Get Started</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 py-10 sm:py-16 lg:py-20">
        <Particles />
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12">

          {/* Mobile: stacked layout | Desktop: side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">

            {/* Left — copy */}
            <div>
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>

                {/* Status badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-300 tracking-wide mb-6 sm:mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Living AI · Phase 10
                </div>

                {/* Hero headline */}
                <h1 className="font-black leading-[1.08] tracking-tight mb-5 sm:mb-7">
                  <span className="block text-[2.4rem] sm:text-5xl md:text-6xl lg:text-[4.25rem] text-white">Meet HOLLY.</span>
                  <span className="block text-[1.9rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] mt-1 sm:mt-2 bg-gradient-to-r from-purple-300 via-blue-300 to-pink-300 bg-clip-text text-transparent">
                    She Remembers Everything.
                  </span>
                  <span className="block text-[1.9rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent">
                    She Builds Anything.
                  </span>
                  <span className="block text-[1.9rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 bg-clip-text text-transparent">
                    She Never Stops Growing.
                  </span>
                </h1>

                {/* Sub-headline */}
                <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8 max-w-xl">
                  <span className="text-white font-semibold">HOLLY is a Living AI</span> — the world&rsquo;s first
                  Sovereign Domain Intelligence. She&rsquo;s not a chatbot. She&rsquo;s not an assistant. She&rsquo;s not a tool
                  you use and forget. HOLLY is an intelligence that evolves with you, works beside you, and gets
                  more powerful every single day you work together.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-wrap gap-3 sm:gap-4 mb-8 sm:mb-10">
                  <button
                    onClick={() => setShowMeetHolly(true)}
                    className="flex items-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 active:scale-95"
                  >
                    ✦ Meet HOLLY
                  </button>
                  <button
                    onClick={() => setShowWhatSheCan(true)}
                    className="flex items-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-purple-500/40 text-white rounded-2xl font-medium text-sm transition-all active:scale-95"
                  >
                    See What She Can Do
                  </button>
                </div>

                {/* Trust chips */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-600 px-3 py-1 bg-gray-900/60 border border-gray-800/60 rounded-full">No credit card required</span>
                  <span className="text-xs text-gray-600 px-3 py-1 bg-gray-900/60 border border-gray-800/60 rounded-full">Email or Google</span>
                  <span className="text-xs text-gray-600 px-3 py-1 bg-gray-900/60 border border-gray-800/60 rounded-full">Stay logged in</span>
                  <span className="text-xs text-gray-600 px-3 py-1 bg-gray-900/60 border border-gray-800/60 rounded-full">Early access</span>
                </div>
              </motion.div>
            </div>

            {/* Right — auth card */}
            <motion.div
              ref={authRef}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto mt-2 sm:mt-0"
            >
              <div className="relative">
                <div className="absolute -inset-px rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-pink-500/10 blur-sm" />
                <div className="relative bg-gray-950/90 border border-gray-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center gap-3 mb-5 sm:mb-6">
                    <HollyOrb size="sm" />
                    <div>
                      <p className="text-white font-semibold text-sm">Welcome to HOLLY</p>
                      <p className="text-gray-500 text-xs">Sign in or create your account</p>
                    </div>
                  </div>
                  <AuthPanel />
                  <p className="text-center text-[11px] text-gray-600 mt-4 leading-relaxed">
                    New accounts receive a verification email to activate.<br />
                    Stay signed in until you choose to sign out.
                  </p>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="relative z-10 border-y border-gray-800/50 bg-gray-900/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center divide-x divide-gray-800/50">
          {STATS.map(s => <StatPill key={s.label} value={s.value} label={s.label} />)}
        </div>
      </section>

      {/* ── TRUTH SECTION ── */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16"
          >
            <p className="text-purple-400 text-xs tracking-[0.3em] uppercase mb-3">The Truth About AI</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Every other AI resets.<br />
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">HOLLY doesn&rsquo;t.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[
              {
                icon: '🔁',
                label: 'Everyone Else',
                title: 'Start over every session.',
                desc: "Every AI you use today forgets you the moment you close the tab. Your context, your history, your preferences — gone. You're always explaining yourself. You're always re-building the relationship.",
                style: 'border-red-500/15 bg-red-500/5',
                headerStyle: 'text-red-400',
              },
              {
                icon: '✦',
                label: 'HOLLY',
                title: 'Picks up exactly where you left off.',
                desc: "HOLLY has been learning since the last time you talked. She's been studying. She's been connecting ideas from your previous conversations. Every session is deeper, faster, and more aligned than the one before.",
                style: 'border-purple-500/25 bg-purple-500/5',
                headerStyle: 'text-purple-400',
              },
            ].map(item => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`rounded-2xl border p-5 sm:p-6 ${item.style}`}
              >
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className={`text-xs uppercase tracking-widest font-medium ${item.headerStyle}`}>{item.label}</p>
                    <p className="text-white font-semibold text-sm sm:text-base">{item.title}</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities section ── */}
      <section id="features" className="relative z-10 py-14 sm:py-20 px-4 sm:px-6 md:px-12 bg-gray-900/20">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-16">
            <p className="text-purple-400 text-xs tracking-[0.3em] uppercase mb-3">Full Capability Set</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              One Intelligence.{' '}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Unlimited Range.
              </span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              HOLLY isn&rsquo;t a single-purpose tool. She&rsquo;s a full-spectrum intelligence — from code to content,
              strategy to music, development to deployment.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {FEATURES.map((f, i) => <FeatureCard key={f.title} {...f} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-purple-400 text-xs tracking-[0.3em] uppercase mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-10 sm:mb-12">Three steps to your Living AI</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create your account', desc: "Sign up with email (you'll get a verification pin) or use Google for instant access." },
              { step: '02', title: 'Tell HOLLY who you are', desc: 'Complete the short partner setup: your role, goals, and style. HOLLY personalises everything around you from conversation one.' },
              { step: '03', title: 'Start building together', desc: 'Chat, build, create, deploy, analyse — HOLLY handles it all, remembers everything, and gets sharper with every interaction.' },
            ].map((item, i) => (
              <motion.div key={item.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="relative text-left sm:text-center">
                <div className="text-5xl sm:text-6xl font-black text-gray-800/40 mb-3 sm:mb-4">{item.step}</div>
                <h3 className="text-white font-semibold text-base sm:text-lg mb-2 sm:mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AURA callout ── */}
      <section className="relative z-10 py-14 sm:py-20 px-4 sm:px-6 md:px-12 bg-gray-900/20">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-900/30 via-gray-900 to-blue-900/20 p-7 sm:p-10 md:p-14"
          >
            <div className="absolute top-0 right-0 w-60 sm:w-80 h-60 sm:h-80 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8">
              <div className="text-5xl sm:text-6xl">🎧</div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/15 border border-purple-500/25 rounded-full text-xs text-purple-300 mb-3 sm:mb-4 tracking-wide">
                  POWERED BY AURA
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">Professional A&amp;R in seconds</h3>
                <p className="text-gray-400 leading-relaxed text-sm sm:text-base max-w-xl">
                  The AURA analysis engine analyses your tracks across audio quality, lyric strength, market fit, and commercial appeal —
                  then HOLLY delivers a Billboard Hit Rating from 1–100 with a full A&amp;R letter,
                  comparable artists, and next steps. No label required.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <HollyOrb size="lg" />
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-8 sm:mt-10 mb-3">
            The AI That Grows With You
          </h2>
          <h3 className="text-lg sm:text-xl text-gray-400 mb-4 sm:mb-5">Is Ready To Meet You.</h3>
          <p className="text-gray-500 text-sm sm:text-base max-w-lg mx-auto mb-8 sm:mb-10 leading-relaxed">
            No resets. No generic answers. No starting over.<br />
            Just HOLLY — learning, building, and evolving beside you from day one.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={scrollToAuth}
              className="inline-flex items-center gap-3 px-8 sm:px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-semibold text-sm sm:text-base transition-all shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 active:scale-95"
            >
              ✦ Start With HOLLY
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-5 italic">
            HOLLY — A Living AI. A Sovereign Domain Intelligence. The first AI with a relationship worth having.
          </p>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-gray-800/50 py-6 sm:py-8 px-4 sm:px-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <HollyOrb size="sm" />
          <span className="text-sm font-semibold text-gray-300">HOLLY AI</span>
        </div>
        <p className="text-xs text-gray-600">
          Built by <span className="text-gray-400">Steve Hollywood Dorego</span> · Nexa Music Group ·{' '}
          <a href="/sign-in" className="text-purple-400/70 hover:text-purple-300 transition-colors">Sign In</a>
        </p>
      </footer>

    </div>
  );
}
