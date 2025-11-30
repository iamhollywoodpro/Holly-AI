'use client';

import { useUserContext } from '@/hooks/useUserContext';
import { motion } from 'framer-motion';
import { Sparkles, Heart, Zap } from 'lucide-react';

export function PersonalizedGreeting() {
  const { context, greeting, loading } = useUserContext();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 animate-pulse">
        <div className="w-4 h-4 bg-purple-500/20 rounded-full" />
        <div className="h-4 w-48 bg-gray-800 rounded" />
      </div>
    );
  }

  if (!context || !greeting) {
    return null;
  }

  // Get relationship icon
  const relationshipIcons = {
    new: <Sparkles className="w-4 h-4" />,
    acquainted: <Zap className="w-4 h-4" />,
    familiar: <Heart className="w-4 h-4" />,
    close: <Heart className="w-4 h-4 fill-current" />,
  };

  const icon = relationshipIcons[context.hollyMemory.relationshipLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-purple-900/30 rounded-2xl border border-purple-500/20 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold">
              Welcome, {context.firstName}!
            </h3>
            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
              {context.hollyMemory.relationshipLevel}
            </span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {greeting}
          </p>
          
          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
            {context.hollyMemory.totalConversations > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-purple-400">💬</span>
                <span>{context.hollyMemory.totalConversations} conversations</span>
              </div>
            )}
            {context.stats.deploymentsCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-pink-400">🚀</span>
                <span>{context.stats.deploymentsCount} deployments</span>
              </div>
            )}
            {context.stats.projectsCreated > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-blue-400">📁</span>
                <span>{context.stats.projectsCreated} projects</span>
              </div>
            )}
            {context.hollyMemory.lastInteraction && (
              <div className="flex items-center gap-1">
                <span className="text-green-400">🕐</span>
                <span>
                  Last: {new Date(context.hollyMemory.lastInteraction).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
