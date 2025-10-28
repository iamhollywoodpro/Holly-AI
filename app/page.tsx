'use client';

import { ChatInterface } from '@/components/chat-interface';

export default function Home() {
  // Use a default user ID since auth is temporarily disabled
  const userId = 'default-user';
  
  return <ChatInterface userId={userId} />;
}
