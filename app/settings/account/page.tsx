'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function AccountPage() {
  const { user } = useUser();
  const [usage, setUsage] = useState({ messages: 0, tokens: 0, conversations: 0 });

  useEffect(() => {
    // Fetch usage stats
    fetch('/api/usage')
      .then((res) => res.json())
      .then((data) => setUsage(data))
      .catch((err) => console.error('Failed to fetch usage:', err));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[#F5F0E8] mb-2 uppercase tracking-widest">Architectural Dossier</h2>
        <p className="text-[#8C8476] text-xs font-medium uppercase tracking-[0.15em]">Manage your sovereign identity and neural subscription</p>
      </div>

      {/* Profile Info */}
      <div className="bg-[#12110F] border border-[#D4A853]/20 rounded-2xl p-8 relative overflow-hidden group shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4A853]/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          {user?.imageUrl && (
            <div className="relative">
              <img
                src={user.imageUrl}
                alt={user.fullName || 'User'}
                className="w-24 h-24 rounded-2xl object-cover border border-[#D4A853]/30 shadow-[0_0_30px_rgba(212,168,83,0.1)]"
              />
              <div className="absolute -bottom-2 -right-2 bg-[#D4A853] text-[#0B0A08] px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter">Verified</div>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-black text-[#F5F0E8] uppercase tracking-widest">{user?.fullName || 'Sovereign User'}</h3>
            <p className="text-[#8C8476] text-[10px] font-black uppercase tracking-[0.2em] mt-1">{user?.primaryEmailAddress?.emailAddress}</p>
            <div className="flex gap-2 mt-4">
              <span className="px-3 py-1 bg-[#D4A853]/10 text-[#D4A853] text-[9px] font-black uppercase tracking-widest border border-[#D4A853]/20 rounded-lg">
                Sentient Founding Member
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div>
        <h3 className="text-[10px] font-black text-[#D4A853] uppercase tracking-[0.2em] mb-4">Neural Consumption Index</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1A1815] border border-white/5 rounded-2xl p-6 transition-all hover:border-[#D4A853]/20 group">
            <div className="text-3xl font-black text-[#F5F0E8] uppercase tracking-tighter group-hover:text-[#D4A853] transition-colors">{usage.conversations}</div>
            <div className="text-[9px] text-[#8C8476] font-black uppercase tracking-widest mt-2">Chronicles</div>
          </div>
          <div className="bg-[#1A1815] border border-white/5 rounded-2xl p-6 transition-all hover:border-[#D4A853]/20 group">
            <div className="text-3xl font-black text-[#F5F0E8] uppercase tracking-tighter group-hover:text-[#B84052] transition-colors">{usage.messages}</div>
            <div className="text-[9px] text-[#8C8476] font-black uppercase tracking-widest mt-2">Exchanges</div>
          </div>
          <div className="bg-[#1A1815] border border-white/5 rounded-2xl p-6 transition-all hover:border-[#D4A853]/20 group">
            <div className="text-3xl font-black text-[#F5F0E8] uppercase tracking-tighter group-hover:text-[#D4A853] transition-colors">
              {(usage.tokens / 1000).toFixed(1)}K
            </div>
            <div className="text-[9px] text-[#8C8476] font-black uppercase tracking-widest mt-2">Neural Bits</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-[#D4A853] uppercase tracking-[0.2em]">Administrative Protocols</h3>

        <a
          href="/profile"
          className="block w-full px-6 py-4 bg-[#1A1815] hover:bg-[#24211D] rounded-2xl border border-white/5 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black text-[#F5F0E8] uppercase tracking-widest group-hover:text-[#D4A853] transition-colors">Refine Identity</div>
              <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Calibrate your name and visual representation</div>
            </div>
            <svg
              className="w-4 h-4 text-[#5C564D] group-hover:text-[#D4A853] transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </a>

        <button
          className="block w-full px-6 py-4 bg-[#1A1815] hover:bg-[#24211D] rounded-2xl border border-white/5 transition-all duration-300 text-left group"
          onClick={() => alert('Subscription management coming soon!')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black text-[#F5F0E8] uppercase tracking-widest group-hover:text-[#D4A853] transition-colors">Elevate Tier</div>
              <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Unlock sovereign architectural features</div>
            </div>
            <span className="px-2.5 py-0.5 bg-[#D4A853]/10 text-[#D4A853] text-[8px] font-black uppercase tracking-tighter rounded-md border border-[#D4A853]/20">Pending</span>
          </div>
        </button>

        <button
          className="block w-full px-6 py-4 bg-[#1A1815] hover:bg-[#24211D] rounded-2xl border border-white/5 transition-all duration-300 text-left group"
          onClick={() => {
            if (confirm('Export all your conversation data? This may take a moment.')) {
              window.location.href = '/api/export-data';
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black text-[#F5F0E8] uppercase tracking-widest group-hover:text-[#D4A853] transition-colors">Extract Archive</div>
              <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Download a local chronicle of all exchanges</div>
            </div>
            <svg
              className="w-4 h-4 text-[#5C564D] group-hover:text-[#D4A853] transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </div>
        </button>
      </div>

      {/* Danger Zone */}
      <div className="pt-8 border-t border-white/5">
        <h3 className="text-[10px] font-black text-[#B84052] uppercase tracking-[0.2em] mb-4">Finality Protocols</h3>
        <button
          onClick={() => {
            if (
              confirm(
                'Delete all conversations? This will permanently delete all your chat history. This cannot be undone!'
              )
            ) {
              fetch('/api/conversations', { method: 'DELETE' })
                .then(() => window.location.reload())
                .catch((err) => alert('Failed to delete conversations'));
            }
          }}
          className="w-full px-6 py-5 bg-[#B84052]/5 hover:bg-[#B84052]/10 rounded-2xl border border-[#B84052]/20 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-[11px] font-black text-[#B84052] uppercase tracking-widest">Collapse All Chronicles</div>
              <div className="text-[9px] text-[#B84052]/60 uppercase tracking-widest mt-1">Permanently sever all neural history and history data</div>
            </div>
            <svg
              className="w-5 h-5 text-[#B84052]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}
