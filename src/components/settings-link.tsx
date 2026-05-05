'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';

export function SettingsLink() {
  return (
    <Link
      href="/settings/integrations"
      className="fixed bottom-6 right-6 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all hover:scale-110 z-50"
      title="Settings"
    >
      <Settings className="w-6 h-6" />
    </Link>
  );
}
