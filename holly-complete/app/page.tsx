'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ChatInterface } from '@/components/chat-interface';

export default function Home() {
  // Use a default user ID since auth is temporarily disabled
  const userId = 'default-user';
  
  return (
    <MainLayout>
      <div className="h-[calc(100vh-4rem)]">
        <ChatInterface userId={userId} />
      </div>
    </MainLayout>
  );
}
