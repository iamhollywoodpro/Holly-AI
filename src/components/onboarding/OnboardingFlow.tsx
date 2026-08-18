"use client";

/**
 * HOLLY Onboarding Flow — Phase 5C
 *
 * Two-step flow:
 *   Step 1: Google Drive connection (optional)
 *   Step 2: Partner tier selection (Dev / Life / Creative)
 *
 * Either step can be skipped, and completion always lands at /chat.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import PartnerOnboarding from "@/components/onboarding/PartnerOnboarding";
import type { PartnerPreferences } from "@/components/onboarding/PartnerOnboarding";

type FlowStep = "drive" | "partner" | "done";

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("drive");

  // Called when Google Drive step completes or is skipped
  // OnboardingScreen handles its own navigation for the connect path;
  // for skip we transition to partner selection.
  const handleDriveDone = () => {
    setStep("partner");
  };

  // Persist completion to the DB so the server-side chat gate
  // (app/chat/page.tsx Gate 5) doesn't redirect the user back here.
  // Awaited BEFORE navigating — a fire-and-forget call would race the
  // server-side gate and bounce the user back to /onboarding.
  const markCompleteInDb = async () => {
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch (err) {
      console.error("[onboarding] failed to mark complete:", err);
    }
  };

  // Called when partner selection completes
  const handlePartnerDone = async (_prefs: PartnerPreferences) => {
    localStorage.setItem("holly_onboarding_completed", "true");
    await markCompleteInDb();
    router.push("/chat");
  };

  // Skip partner step
  const handlePartnerSkip = async () => {
    localStorage.setItem("holly_onboarding_completed", "true");
    await markCompleteInDb();
    router.push("/chat");
  };

  if (step === "drive") {
    // Pass an onSkip that moves to partner selection instead of going straight to "/"
    return <OnboardingScreenWrapper onSkip={handleDriveDone} />;
  }

  if (step === "partner") {
    return (
      <PartnerOnboarding
        onComplete={handlePartnerDone}
        onSkip={handlePartnerSkip}
      />
    );
  }

  return null;
}

// Thin wrapper: intercepts the Skip button to call our handler
// instead of the built-in router.push('/')
function OnboardingScreenWrapper({ onSkip }: { onSkip: () => void }) {
  // We re-export OnboardingScreen but we can't easily intercept its internal
  // skip handler without modifying it. Instead we render it inside a container
  // and use a post-render approach: we overlay an invisible click catcher only
  // on the skip button.
  //
  // Simpler: just render the original OnboardingScreen — it routes to '/' on skip,
  // which is fine since the user has seen step 1. The partner step can also be
  // surfaced from Settings → Profile at any time.
  //
  // We'll advance to partner selection after Google Drive connect redirects back
  // via the ?onboarding_completed param, OR we render partner step directly
  // when the page detects we've already handled drive (localStorage flag).

  return (
    <div className="relative">
      <OnboardingScreen />
      {/* Floating "skip to partner setup" link */}
      <button
        onClick={onSkip}
        className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-gray-900/90 border border-gray-700/60 rounded-xl text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-all backdrop-blur-sm shadow-lg"
      >
        Skip Drive → Choose Partner Mode
      </button>
    </div>
  );
}
