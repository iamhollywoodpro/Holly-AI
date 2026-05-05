'use client';

import dynamic from 'next/dynamic';

// Dynamic import prevents SSR crash from browser-only APIs (Audio, localStorage, etc.)
const HollyChatInterface = dynamic(
  () => import('@/components/holly-chat-interface'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col h-screen w-full bg-[#0B0A08] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4A853] to-[#B84052] animate-pulse shadow-[0_0_20px_rgba(212,168,83,0.3)]" />
          <p className="text-[#D4A853] text-xs font-bold tracking-[0.3em] uppercase animate-pulse">
            Establishing Nexus Link...
          </p>
        </div>
      </div>
    ),
  }
);

export default function ChatPage() {
  return (
    <div className="h-screen w-full">
      <HollyChatInterface />
    </div>
  );
}
