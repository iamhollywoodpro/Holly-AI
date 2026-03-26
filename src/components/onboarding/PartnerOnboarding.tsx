"use client";

/**
 * HOLLY Partner Onboarding — Phase 5C
 *
 * 3-tier partner selection:
 *   1. Dev Partner   — code, GitHub, deployment, architecture
 *   2. Life Partner  — goals, health, scheduling, journaling
 *   3. Creative Partner — music, art, writing, ideas
 *
 * Flow:
 *   Step 1 → Choose partner tier
 *   Step 2 → Customise preferences for that tier
 *   Step 3 → HOLLY says hi with a tailored welcome
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2, Heart, Palette, ArrowRight, ArrowLeft,
  Check, Loader2, Sparkles, Zap,
  Music, Pen, Camera, Terminal, Globe, Cpu,
  BookOpen, Dumbbell, Calendar, Target,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartnerTier = "dev" | "life" | "creative";

export interface PartnerPreferences {
  tier: PartnerTier;
  // Dev
  devStack?: string[];
  devFocus?: string[];
  // Life
  lifeGoals?: string[];
  lifeHabits?: string[];
  // Creative
  creativeMedia?: string[];
  creativeStyle?: string[];
}

interface Props {
  onComplete: (prefs: PartnerPreferences) => void;
  onSkip?: () => void;
}

// ─── Partner tiers ────────────────────────────────────────────────────────────

const TIERS = [
  {
    id: "dev" as const,
    icon: Code2,
    emoji: "🛠️",
    title: "Dev Partner",
    subtitle: "Code · GitHub · Deployment · Architecture",
    description:
      "HOLLY becomes your full-stack co-pilot — writing, reviewing, and shipping code alongside you. She learns your stack, style, and habits.",
    gradient: "from-emerald-500 to-cyan-500",
    glow: "shadow-emerald-500/20",
    border: "border-emerald-500/40",
    ring: "ring-emerald-400/60",
    features: [
      { icon: Terminal, text: "Code generation & review" },
      { icon: Globe, text: "GitHub + deployment automation" },
      { icon: Cpu, text: "Architecture decisions" },
      { icon: Zap, text: "Bug hunting & performance" },
    ],
  },
  {
    id: "life" as const,
    icon: Heart,
    emoji: "💜",
    title: "Life Partner",
    subtitle: "Goals · Health · Scheduling · Journaling",
    description:
      "HOLLY becomes your personal strategist — tracking goals, building habits, and keeping you focused on what actually matters.",
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
    border: "border-violet-500/40",
    ring: "ring-violet-400/60",
    features: [
      { icon: Target, text: "Goal setting & accountability" },
      { icon: Calendar, text: "Smart scheduling & planning" },
      { icon: Dumbbell, text: "Health & habit tracking" },
      { icon: BookOpen, text: "Journaling & reflection" },
    ],
  },
  {
    id: "creative" as const,
    icon: Palette,
    emoji: "🎨",
    title: "Creative Partner",
    subtitle: "Music · Art · Writing · Ideas",
    description:
      "HOLLY becomes your creative collaborator — brainstorming, writing, producing, and helping you turn ideas into finished work.",
    gradient: "from-pink-500 to-rose-500",
    glow: "shadow-pink-500/20",
    border: "border-pink-500/40",
    ring: "ring-pink-400/60",
    features: [
      { icon: Music, text: "Songwriting & music production" },
      { icon: Pen, text: "Writing & storytelling" },
      { icon: Camera, text: "Visual concepts & direction" },
      { icon: Sparkles, text: "Ideation & creative flow" },
    ],
  },
];

// ─── Preference options ────────────────────────────────────────────────────────

const DEV_STACK = [
  "TypeScript", "JavaScript", "Python", "React", "Next.js",
  "Node.js", "Go", "Rust", "Swift", "Kotlin", "Java", "Other",
];
const DEV_FOCUS = [
  "Frontend UI", "Backend APIs", "Full-Stack", "DevOps / CI-CD",
  "Mobile", "AI / ML", "Open Source", "Startup / Solo",
];

const LIFE_GOALS = [
  "Health & Fitness", "Career Growth", "Financial Freedom",
  "Relationships", "Learning & Skills", "Mindfulness", "Side Projects", "Travel",
];
const LIFE_HABITS = [
  "Morning routine", "Daily journaling", "Weekly review",
  "Workout tracking", "Reading goals", "Sleep schedule", "Focus blocks",
];

const CREATIVE_MEDIA = [
  "Music Production", "Songwriting", "Fiction Writing", "Screenwriting",
  "Poetry", "Visual Art", "Photography", "Video / Film",
];
const CREATIVE_STYLE = [
  "Structured & planned", "Free-flowing & spontaneous",
  "Collaborative", "Solo deep work", "Fast iteration", "Long-form craft",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
  color,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        selected
          ? `${color} text-white border-transparent shadow-sm`
          : "bg-gray-800/60 text-gray-400 border-gray-700/50 hover:border-gray-500/60 hover:text-gray-300"
      }`}
    >
      {selected && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
      {label}
    </motion.button>
  );
}

function ChipGroup({
  items,
  selected,
  onToggle,
  color,
  label,
}: {
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
  color: string;
  label: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <Chip
            key={item}
            label={item}
            selected={selected.includes(item)}
            onClick={() => onToggle(item)}
            color={color}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PartnerOnboarding({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState<"tier" | "prefs" | "done">("tier");
  const [selectedTier, setSelectedTier] = useState<PartnerTier | null>(null);
  const [prefs, setPrefs] = useState<PartnerPreferences>({
    tier: "dev",
    devStack: [], devFocus: [],
    lifeGoals: [], lifeHabits: [],
    creativeMedia: [], creativeStyle: [],
  });
  const [saving, setSaving] = useState(false);

  const tier = TIERS.find(t => t.id === selectedTier);

  const toggle = (key: keyof PartnerPreferences, item: string) => {
    setPrefs(p => {
      const arr = (p[key] as string[]) || [];
      return {
        ...p,
        [key]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
      };
    });
  };

  const handleTierSelect = (id: PartnerTier) => {
    setSelectedTier(id);
    setPrefs(p => ({ ...p, tier: id }));
  };

  const handleContinue = async () => {
    if (step === "tier") {
      if (!selectedTier) return;
      setStep("prefs");
    } else if (step === "prefs") {
      setSaving(true);
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partnerTier: selectedTier, partnerPreferences: prefs }),
        });
      } catch (e) {
        console.error("Save prefs error:", e);
      } finally {
        setSaving(false);
      }
      setStep("done");
      setTimeout(() => onComplete(prefs), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">

        {/* ── Step 1: Choose tier ── */}
        {step === "tier" && (
          <motion.div
            key="tier"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className="w-full max-w-3xl"
          >
            {/* Header */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg shadow-purple-500/30"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-2">
                How should HOLLY partner with you?
              </h1>
              <p className="text-gray-400 text-base max-w-lg mx-auto">
                Choose your primary mode. You can always switch or combine later.
              </p>
            </div>

            {/* Tier cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {TIERS.map((t, i) => {
                const Icon = t.icon;
                const isSelected = selectedTier === t.id;
                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTierSelect(t.id)}
                    className={`relative p-5 rounded-2xl border text-left transition-all duration-200 ${
                      isSelected
                        ? `bg-gray-800/80 ${t.border} ring-2 ${t.ring} shadow-xl ${t.glow}`
                        : "bg-gray-900/60 border-gray-800/60 hover:border-gray-700/60 hover:bg-gray-800/40"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="tier-check"
                        className="absolute top-3 right-3"
                      >
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      </motion.div>
                    )}

                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center mb-3 shadow-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    <div className="text-xl mb-0.5">{t.emoji}</div>
                    <h3 className="font-bold text-white text-base mb-0.5">{t.title}</h3>
                    <p className="text-[11px] text-gray-400 mb-3 leading-tight">{t.subtitle}</p>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">{t.description}</p>

                    <ul className="space-y-1.5">
                      {t.features.map(f => {
                        const FIcon = f.icon;
                        return (
                          <li key={f.text} className="flex items-center gap-1.5">
                            <FIcon className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <span className="text-[11px] text-gray-400">{f.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </motion.button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={onSkip}
                className="text-sm text-gray-600 hover:text-gray-400 transition-colors"
              >
                Skip setup
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleContinue}
                disabled={!selectedTier}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedTier && tier
                    ? `bg-gradient-to-r ${tier.gradient} text-white shadow-lg hover:opacity-90`
                    : "bg-gray-800 text-gray-600 cursor-not-allowed"
                }`}
              >
                Customise HOLLY
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Preferences ── */}
        {step === "prefs" && tier && (
          <motion.div
            key="prefs"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="w-full max-w-2xl"
          >
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.gradient} mb-3 shadow-lg`}>
                <tier.icon className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Tune your {tier.title}
              </h2>
              <p className="text-gray-400 text-sm">
                HOLLY will use these to personalise every response.
              </p>
            </div>

            <div className="bg-gray-900/70 border border-gray-800/60 rounded-2xl p-6 space-y-6 mb-8">
              {/* Dev prefs */}
              {selectedTier === "dev" && (
                <>
                  <ChipGroup
                    label="Your stack"
                    items={DEV_STACK}
                    selected={prefs.devStack || []}
                    onToggle={item => toggle("devStack", item)}
                    color="bg-emerald-600"
                  />
                  <ChipGroup
                    label="Focus area"
                    items={DEV_FOCUS}
                    selected={prefs.devFocus || []}
                    onToggle={item => toggle("devFocus", item)}
                    color="bg-cyan-600"
                  />
                </>
              )}

              {/* Life prefs */}
              {selectedTier === "life" && (
                <>
                  <ChipGroup
                    label="Life goals"
                    items={LIFE_GOALS}
                    selected={prefs.lifeGoals || []}
                    onToggle={item => toggle("lifeGoals", item)}
                    color="bg-violet-600"
                  />
                  <ChipGroup
                    label="Habits to build"
                    items={LIFE_HABITS}
                    selected={prefs.lifeHabits || []}
                    onToggle={item => toggle("lifeHabits", item)}
                    color="bg-purple-600"
                  />
                </>
              )}

              {/* Creative prefs */}
              {selectedTier === "creative" && (
                <>
                  <ChipGroup
                    label="Creative medium"
                    items={CREATIVE_MEDIA}
                    selected={prefs.creativeMedia || []}
                    onToggle={item => toggle("creativeMedia", item)}
                    color="bg-pink-600"
                  />
                  <ChipGroup
                    label="Your style"
                    items={CREATIVE_STYLE}
                    selected={prefs.creativeStyle || []}
                    onToggle={item => toggle("creativeStyle", item)}
                    color="bg-rose-600"
                  />
                </>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep("tier")}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleContinue}
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r ${tier.gradient} text-white shadow-lg hover:opacity-90 disabled:opacity-60`}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  <>Meet HOLLY <Sparkles className="w-4 h-4" /></>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Done ── */}
        {step === "done" && tier && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-7xl mb-6"
            >
              {tier.emoji}
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-3">
              HOLLY is ready.
            </h2>
            <p className="text-gray-400 mb-2">
              Your <span className="text-white font-semibold">{tier.title}</span> is online.
            </p>
            <p className="text-gray-500 text-sm">
              She's already learning your preferences…
            </p>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className={`h-1 rounded-full bg-gradient-to-r ${tier.gradient} mt-8 mx-auto max-w-xs`}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
