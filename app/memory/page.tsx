'use client';

import { Brain, Clock, Tag, Search } from 'lucide-react';

export default function MemoryPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Brain size={32} className="text-[#8B5CF6]" />
            <h1 className="text-3xl font-bold">
              HOLLY's Memory
            </h1>
          </div>
          <p className="text-[#A1A1AA] text-lg">
            Everything HOLLY remembers about your conversations, preferences, and work together
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-[#13131A] border border-[#27272A] rounded-xl p-4 mb-8 flex items-center gap-3">
          <Search size={20} className="text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search memories..."
            className="flex-1 bg-transparent border-none outline-none text-white"
          />
        </div>

        {/* Memory Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recent Conversations */}
          <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock size={20} className="text-[#EC4899]" />
              <h3 className="text-lg font-semibold">Recent Conversations</h3>
            </div>
            <p className="text-[#A1A1AA] mb-4">
              Your latest interactions with HOLLY
            </p>
            <div className="py-8 text-center text-[#A1A1AA]">
              <Clock size={48} className="mx-auto mb-4 text-[#27272A]" />
              <p>No recent memories yet</p>
            </div>
          </div>

          {/* Topics & Interests */}
          <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Tag size={20} className="text-[#06B6D4]" />
              <h3 className="text-lg font-semibold">Topics & Interests</h3>
            </div>
            <p className="text-[#A1A1AA] mb-4">
              Things you've discussed with HOLLY
            </p>
            <div className="py-8 text-center text-[#A1A1AA]">
              <Tag size={48} className="mx-auto mb-4 text-[#27272A]" />
              <p>No topics tracked yet</p>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Brain size={20} className="text-[#8B5CF6]" />
              <h3 className="text-lg font-semibold">Your Preferences</h3>
            </div>
            <p className="text-[#A1A1AA] mb-4">
              How you like to work with HOLLY
            </p>
            <div className="py-8 text-center text-[#A1A1AA]">
              <Brain size={48} className="mx-auto mb-4 text-[#27272A]" />
              <p>No preferences set yet</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 rounded-xl p-6">
          <h4 className="font-semibold text-[#8B5CF6] mb-2">
            🧠 How HOLLY's Memory Works
          </h4>
          <p className="text-[#A1A1AA] leading-relaxed">
            HOLLY remembers your conversations, preferences, and work patterns to provide better assistance over time. 
            Your memories are private and only used to improve your experience with HOLLY.
          </p>
        </div>
      </div>
    </div>
  );
}
