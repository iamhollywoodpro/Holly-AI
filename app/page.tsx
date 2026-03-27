'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth, SignIn, SignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Feature data ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🎵',
    title: 'AI A&R Executive',
    desc: 'Upload any track and get a Billboard Hit Rating (1–100), full A&R breakdown, signing decision, and a professional A&R letter — powered by AURA.',
  },
  {
    icon: '🧠',
    title: 'Persistent Memory',
    desc: 'HOLLY remembers every conversation, your preferences, projects, and goals across every session — building a real relationship over time.',
  },
  {
    icon: '🎙️',
    title: 'Audio Engineering',
    desc: 'Professional mix and master analysis: LUFS levels, frequency balance, stereo field, dynamics, and actionable fixes delivered instantly.',
  },
  {
    icon: '👁️',
    title: 'Multimodal Perception',
    desc: 'Send images, PDFs, Word docs, code files, or audio. HOLLY reads, understands, and acts on all of them seamlessly.',
  },
  {
    icon: '⚡',
    title: 'Smart AI Router',
    desc: 'Routes each request to the best free AI model — Kimi K2.5, Qwen3-235B, DeepSeek-R1, Llama 3.3-70B — at zero inference cost.',
  },
  {
    icon: '🤖',
    title: 'Agent Mode',
    desc: 'Give HOLLY a goal and she executes it autonomously — searching the web, reading GitHub repos, writing code, and more across 17 tools.',
  },
  {
    icon: '🔒',
    title: 'Your Data, Your AI',
    desc: 'Everything stays yours. Your conversations, your training data, your AI. HOLLY evolves specifically around you — nobody else.',
  },
  {
    icon: '🌐',
    title: 'Music Industry Native',
    desc: 'Built from the ground up for music creators. HOLLY speaks your language — DAWs, labels, A&R, publishing, sync, streaming, royalties.',
  },
];

const STATS = [
  { value: '17', label: 'Active Tools' },
  { value: '6', label: 'Free AI Models' },
  { value: '362', label: 'API Endpoints' },
  { value: '$0', label: 'Inference Cost' },
];

// ─── Animated background particles ───────────────────────────────────────────
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0
              ? 'rgba(168,85,247,0.6)'
              : i % 3 === 1
              ? 'rgba(59,130,246,0.5)'
              : 'rgba(236,72,153,0.5)',
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 4 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── Pulsing avatar ───────────────────────────────────────────────────────────
function HollyOrb({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-32 h-32' : 'w-12 h-12';
  const inner = size === 'lg' ? 'w-24 h-24' : 'w-9 h-9';
  const icon = size === 'lg' ? 'text-4xl' : 'text-lg';
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
      whileHover={{ y: -4, borderColor: 'rgba(168,85,247,0.4)' }}
      className="group relative bg-gray-900/60 border border-gray-800/60 rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:bg-gray-900/80 hover:shadow-xl hover:shadow-purple-500/10"
    >
      <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl mb-4 group-hover:bg-purple-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

// ─── Auth panel (sign-in / sign-up toggler) ───────────────────────────────────
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
    layout: {
      socialButtonsVariant: 'blockButton' as const,
    },
  };

  return (
    <div className="w-full">
      {/* Tab toggle */}
      <div className="flex bg-gray-800/60 rounded-xl p-1 mb-6">
        <button
          onClick={() => setMode('signin')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'signin'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'signup'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Create Account
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'signin' ? (
          <motion.div
            key="signin"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <SignIn
              appearance={clerkAppearance}
              fallbackRedirectUrl="/chat"
              signUpUrl="#"
              signUpForceRedirectUrl="#"
            />
          </motion.div>
        ) : (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SignUp
              appearance={clerkAppearance}
              fallbackRedirectUrl="/chat"
              signInUrl="#"
              signInForceRedirectUrl="#"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stat counter ─────────────────────────────────────────────────────────────
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-4">
      <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
        {value}
      </span>
      <span className="text-xs text-gray-500 mt-1 tracking-wide uppercase">{label}</span>
    </div>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const authRef = useRef<HTMLDivElement>(null);

  // Already signed in → go straight to chat (persistent session)
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/chat');
    }
  }, [isLoaded, isSignedIn, router]);

  // Still checking auth state — show minimal spinner so no flash
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
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden">

      {/* ── Global radial glow ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/6 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-pink-600/5 rounded-full blur-[80px]" />
      </div>

      {/* ── Nav bar ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <HollyOrb size="sm" />
          <span className="text-lg font-bold tracking-tight">HOLLY</span>
          <span className="hidden sm:inline text-[10px] text-purple-400/70 border border-purple-500/20 rounded-full px-2 py-0.5 tracking-widest uppercase">
            AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={scrollToAuth}
            className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2"
          >
            Sign In
          </button>
          <button
            onClick={scrollToAuth}
            className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl transition-all shadow-lg shadow-purple-500/20 font-medium"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 min-h-[92vh] flex items-center">
        <Particles />
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-300 tracking-wide mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Neural Link: Active · Phase 9
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6">
                <span className="text-white">Meet</span>{' '}
                <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent">
                  HOLLY
                </span>
                <br />
                <span className="text-3xl md:text-4xl font-light text-gray-300">
                  The AI Built for Music
                </span>
              </h1>

              <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-xl">
                HOLLY is a self-evolving AI that acts as your personal A&R executive, audio engineer,
                creative partner, and autonomous agent — all in one. She remembers you, learns from you,
                and gets smarter with every conversation.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <button
                  onClick={scrollToAuth}
                  className="flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50"
                >
                  ✦ Start for Free
                </button>
                <a
                  href="#features"
                  className="flex items-center gap-2 px-7 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-medium text-sm transition-all"
                >
                  See Features
                </a>
              </div>

              {/* Trust line */}
              <p className="text-xs text-gray-600">
                No credit card required · Email or Google sign-in · Stay logged in until you sign out
              </p>
            </motion.div>
          </div>

          {/* Right — auth card */}
          <motion.div
            ref={authRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
          >
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-pink-500/10 blur-sm" />
              <div className="relative bg-gray-950/90 border border-gray-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                {/* Card header */}
                <div className="flex items-center gap-3 mb-6">
                  <HollyOrb size="sm" />
                  <div>
                    <p className="text-white font-semibold text-sm">Welcome to HOLLY</p>
                    <p className="text-gray-500 text-xs">Sign in or create your account</p>
                  </div>
                </div>

                <AuthPanel />

                <p className="text-center text-[11px] text-gray-600 mt-4 leading-relaxed">
                  By signing up you accept our Terms of Service.
                  <br />New accounts receive a verification email to activate.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="relative z-10 border-y border-gray-800/50 bg-gray-900/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center divide-x divide-gray-800/50">
          {STATS.map(s => (
            <StatPill key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" className="relative z-10 py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-purple-400 text-xs tracking-[0.3em] uppercase mb-3">Capabilities</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything you need,{' '}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                built for music
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              HOLLY isn't a general AI wrapped in a music skin. She was engineered from the ground up
              for creators, producers, and music professionals.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 py-24 px-6 md:px-12 bg-gray-900/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-purple-400 text-xs tracking-[0.3em] uppercase mb-3">How It Works</p>
            <h2 className="text-4xl font-bold text-white mb-12">
              Three steps to your AI music partner
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create your account',
                desc: 'Sign up with email (you\'ll get a verification pin) or use Google for instant access. One click — done.',
              },
              {
                step: '02',
                title: 'Tell HOLLY who you are',
                desc: 'Complete the short partner setup: your role, goals, and music style. HOLLY personalises everything around you.',
              },
              {
                step: '03',
                title: 'Start creating',
                desc: 'Chat, upload tracks, get A&R ratings, generate code, research the industry. HOLLY handles it all, and remembers everything.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="text-6xl font-black text-gray-800/40 mb-4">{item.step}</div>
                <h3 className="text-white font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 -right-4 text-gray-700 text-2xl">→</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AURA callout ── */}
      <section className="relative z-10 py-20 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-900/30 via-gray-900 to-blue-900/20 p-10 md:p-14"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className="text-6xl">🎧</div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/15 border border-purple-500/25 rounded-full text-xs text-purple-300 mb-4 tracking-wide">
                  POWERED BY AURA
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Professional A&R in seconds
                </h3>
                <p className="text-gray-400 leading-relaxed max-w-xl">
                  The AURA analysis engine (Audio Understanding & Rating Architecture) analyses
                  your tracks across audio quality, lyric strength, market fit, and commercial appeal —
                  then HOLLY delivers a Billboard Hit Rating from 1–100 with a full A&R letter,
                  comparable artists, and next steps. No label required.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative z-10 py-24 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <HollyOrb size="lg" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-8 mb-4">
            Ready to meet HOLLY?
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10">
            Join the future of music AI. Your account is free. Your data is yours. Your AI gets
            smarter every day.
          </p>
          <button
            onClick={scrollToAuth}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-semibold text-base transition-all shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-1"
          >
            ✦ Start for Free
          </button>
          <p className="text-xs text-gray-600 mt-4">
            Email + Google · Verification email on first sign-up · Stay logged in until you choose to sign out
          </p>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-gray-800/50 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <HollyOrb size="sm" />
          <span className="text-sm font-semibold text-gray-300">HOLLY AI</span>
        </div>
        <p className="text-xs text-gray-600">
          Built by{' '}
          <span className="text-gray-400">Steve Hollywood Dorego</span>
          {' '}· Nexa Music Group ·{' '}
          <a href="/sign-in" className="text-purple-400/70 hover:text-purple-300 transition-colors">
            Sign In
          </a>
        </p>
      </footer>

    </div>
  );
}
