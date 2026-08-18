"use client";

/**
 * Use-Case Picker — Roadmap C2b
 *
 * First onboarding screen after signup: "What do you want to use Holly for?"
 * Multi-select. Each selection auto-installs a curated starter extension kit,
 * so Holly's tool grants match the user's intent from the first chat.
 * More tools are always available later in the Extensions Store.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";

interface UseCaseOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  starterExtensionCount: number;
}

interface Props {
  useCases: UseCaseOption[];
  onComplete: (selectedIds: string[]) => void;
  onSkip?: () => void;
}

export default function UseCasePicker({ useCases, onComplete, onSkip }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContinue = async () => {
    if (selected.size === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/use-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCases: [...selected] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      onComplete([...selected]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          What do you want to use Holly for?
        </h1>
        <p className="text-sm text-gray-400">
          Pick as many as you like — Holly will load the right tools for you.
          You can always add more later from the Extensions Store.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {useCases.map(uc => {
          const isSelected = selected.has(uc.id);
          return (
            <button
              key={uc.id}
              type="button"
              onClick={() => toggle(uc.id)}
              aria-pressed={isSelected}
              className={`relative p-5 rounded-2xl border text-left transition-all duration-200 ${
                isSelected
                  ? 'border-[#66CCCC]/60 bg-[#66CCCC]/10 shadow-lg shadow-[#66CCCC]/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]'
              }`}
            >
              {isSelected && (
                <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br from-[#66CCCC] to-[#C7B8EA] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" />
                </span>
              )}
              <div className="text-2xl mb-2">{uc.icon}</div>
              <h3 className="font-semibold text-white text-sm mb-1">{uc.label}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{uc.description}</p>
              <p className="text-[10px] text-gray-600 mt-2">
                {uc.starterExtensionCount} tool{uc.starterExtensionCount === 1 ? '' : 's'} included
              </p>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-center text-sm text-red-400 mb-4" role="alert">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          disabled={saving}
          className="text-sm text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-50"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={selected.size === 0 || saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
            selected.size > 0 && !saving
              ? 'bg-gradient-to-r from-[#66CCCC] to-[#C7B8EA] text-white hover:opacity-90'
              : 'bg-white/5 text-gray-600 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Setting up your tools…
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
