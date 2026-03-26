import { redirect } from 'next/navigation';

/**
 * Root route — redirect to /chat.
 * HollyChatInterface (Phase 5A+) is the canonical entry point.
 * HollyInterface (holly2) is kept for backward compatibility but no longer
 * served at the root.
 */
export default function HomePage() {
  redirect('/chat');
}
