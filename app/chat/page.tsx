'use client';

import dynamic from 'next/dynamic';

// Dynamic import prevents SSR crash from browser-only APIs (Audio, localStorage, etc.)
const HollyChatInterface = dynamic(
  () => import('@/components/holly-chat-interface'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col h-screen w-full bg-gray-950 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 animate-pulse" />
          <p className="text-gray-400 text-sm tracking-widest uppercase animate-pulse">
            Loading HOLLY...
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
