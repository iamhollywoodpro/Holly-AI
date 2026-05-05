'use client';

import { HollyEmotionProvider, useHollyEmotion } from '@/components/holly/HollyEmotionContext';
import { LivingBackground } from '@/components/holly/LivingBackground';

function ChatLayoutInner({ children }: { children: React.ReactNode }) {
  const { emotion } = useHollyEmotion();

  return (
    <LivingBackground emotion={emotion} intensity={0.25}>
      {children}
    </LivingBackground>
  );
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <HollyEmotionProvider>
      <ChatLayoutInner>{children}</ChatLayoutInner>
    </HollyEmotionProvider>
  );
}
