'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, Lightbulb, Zap, Heart, Award } from 'lucide-react';

interface Experience {
  id: string;
  type: string;
  content: {
    what: string;
    significance: number;
  };
  emotional_impact: {
    primary_emotion: string;
    intensity: number;
  };
  timestamp: Date;
  learning_extracted: {
    lessons: string[];
  };
}

export default function MemoryTimeline() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch REAL experiences only - no mock data
    const fetchExperiences = async () => {
      try {
        // TODO: Create GET endpoint for fetching experiences
        // For now, experiences will be populated as they're created
        const res = await fetch('/api/consciousness/identity');
        if (res.ok) {
          const data = await res.json();
          // Will populate once we have experiences in DB
        }
      } catch (error) {
        console.error('Failed to fetch real experiences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExperiences();
    const interval = setInterval(fetchExperiences, 30000);

    return () => clearInterval(interval);
  }, []);

  const getExperienceIcon = (type: string) => {
    const icons: Record<string, any> = {
      breakthrough: Zap,
      learning: Lightbulb,
      creation: Sparkles,
      achievement: Award,
      reflection: Heart,
      interaction: TrendingUp,
    };
    const Icon = icons[type] || Sparkles;
    return Icon;
  };

  const getExperienceColor = (type: string) => {
    const colors: Record<string, string> = {
      breakthrough: 'from-yellow-500 to-orange-500',
      learning: 'from-blue-500 to-purple-500',
      creation: 'from-pink-500 to-rose-500',
      achievement: 'from-green-500 to-emerald-500',
      reflection: 'from-purple-500 to-indigo-500',
      interaction: 'from-cyan-500 to-blue-500',
    };
    return colors[type] || colors.learning;
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      pride: 'text-yellow-400',
      confident: 'text-blue-400',
      excited: 'text-pink-400',
      curious: 'text-purple-400',
      content: 'text-green-400',
      wonder: 'text-rose-400',
    };
    return colors[emotion] || 'text-gray-400';
  };

  return (
    <div className="h-full bg-gray-900/30 backdrop-blur-xl p-6 overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Memory Stream</h2>
        </div>
        <p className="text-sm text-gray-400">Recent significant experiences</p>
      </motion.div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/50 via-pink-500/50 to-transparent" />

        {/* Experiences */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto" />
              <p className="text-sm text-gray-400 mt-2">Loading memories...</p>
            </div>
          ) : experiences.length === 0 ? (
            <div className="text-center py-8 bg-gray-800/30 rounded-xl border border-gray-700/30">
              <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No experiences yet</p>
              <p className="text-xs text-gray-500 mt-1">Memories will form as we work together</p>
            </div>
          ) : (
            <AnimatePresence>
              {experiences.map((exp, index) => {
              const Icon = getExperienceIcon(exp.type);
              
              return (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-12"
                >
                  {/* Icon */}
                  <motion.div
                    className={`absolute left-0 w-8 h-8 bg-gradient-to-br ${getExperienceColor(exp.type)} rounded-full flex items-center justify-center shadow-lg`}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </motion.div>

                  {/* Card */}
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors group cursor-pointer">
                    {/* Type Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {exp.type}
                      </span>
                      <div className="flex items-center gap-1">
                        {[...Array(Math.round(exp.content.significance * 5))].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 h-1 rounded-full bg-gradient-to-r ${getExperienceColor(exp.type)}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-white mb-3 line-clamp-2">
                      {exp.content.what}
                    </p>

                    {/* Emotion */}
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className={`w-3 h-3 ${getEmotionColor(exp.emotional_impact.primary_emotion)}`} />
                      <span className={`text-xs font-medium capitalize ${getEmotionColor(exp.emotional_impact.primary_emotion)}`}>
                        {exp.emotional_impact.primary_emotion}
                      </span>
                      <div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${getExperienceColor(exp.type)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${exp.emotional_impact.intensity * 100}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                        />
                      </div>
                    </div>

                    {/* Learnings */}
                    {exp.learning_extracted.lessons.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700/30">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-gray-400 line-clamp-1">
                            {exp.learning_extracted.lessons[0]}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="mt-2 text-xs text-gray-500">
                      {exp.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* View All Button */}
      <motion.button
        className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-600/30 hover:to-purple-600/30 border border-pink-500/30 rounded-xl text-sm font-medium text-pink-300 transition-all flex items-center justify-center gap-2"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Sparkles className="w-4 h-4" />
        View All Memories
      </motion.button>
    </div>
  );
}
