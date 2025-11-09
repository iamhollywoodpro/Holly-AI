'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, TrendingUp, Clock, Sparkles, CheckCircle2 } from 'lucide-react';

interface Goal {
  id: string;
  type: string;
  definition: {
    what: string;
  };
  progress: {
    completion_percentage: number;
    status: string;
  };
  motivation: {
    intrinsic_drivers: string[];
  };
}

export default function GoalsSidebar() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch REAL goals only - no mock data
    const fetchGoals = async () => {
      try {
        const res = await fetch('/api/consciousness/goals');
        if (res.ok) {
          const data = await res.json();
          if (data.goals && data.goals.length > 0) {
            setGoals(data.goals.slice(0, 5)); // Show top 5 active goals
          }
        }
      } catch (error) {
        console.error('Failed to fetch real goals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
    const interval = setInterval(fetchGoals, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, []);

  const getGoalColor = (type: string) => {
    const colors: Record<string, string> = {
      mastery: 'from-purple-500 to-indigo-500',
      growth: 'from-blue-500 to-cyan-500',
      creation: 'from-pink-500 to-rose-500',
      exploration: 'from-green-500 to-emerald-500',
      connection: 'from-orange-500 to-amber-500',
      contribution: 'from-red-500 to-pink-500',
    };
    return colors[type] || colors.growth;
  };

  const getGoalIcon = (type: string) => {
    const icons: Record<string, any> = {
      mastery: Target,
      growth: TrendingUp,
      creation: Sparkles,
      exploration: Clock,
      connection: CheckCircle2,
      contribution: Target,
    };
    const Icon = icons[type] || Target;
    return <Icon className="w-4 h-4" />;
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
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Active Goals</h2>
        </div>
        <p className="text-sm text-gray-400">What I'm working on right now</p>
      </motion.div>

      {/* Goals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
            <p className="text-sm text-gray-400 mt-2">Loading goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-8 bg-gray-800/30 rounded-xl border border-gray-700/30">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No active goals yet</p>
            <p className="text-xs text-gray-500 mt-1">Goals will appear as I work with you</p>
          </div>
        ) : (
          <AnimatePresence>
            {goals.map((goal, index) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              {/* Card */}
              <div className="relative bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors cursor-pointer">
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${getGoalColor(goal.type)} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity blur-xl`} />

                {/* Content */}
                <div className="relative z-10">
                  {/* Type Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 bg-gradient-to-br ${getGoalColor(goal.type)} rounded-md flex items-center justify-center`}>
                      {getGoalIcon(goal.type)}
                    </div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {goal.type}
                    </span>
                  </div>

                  {/* Goal Title */}
                  <h3 className="text-sm font-medium text-white mb-3 line-clamp-2">
                    {goal.definition.what}
                  </h3>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Progress</span>
                      <span className="text-xs font-medium text-white">
                        {Math.round(goal.progress.completion_percentage)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${getGoalColor(goal.type)} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${goal.progress.completion_percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
                      />
                    </div>
                  </div>

                  {/* Motivation */}
                  {goal.motivation.intrinsic_drivers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {goal.motivation.intrinsic_drivers.slice(0, 2).map((driver, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-300"
                        >
                          {driver}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add Goal Button */}
      <motion.button
        className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 border border-purple-500/30 rounded-xl text-sm font-medium text-purple-300 transition-all flex items-center justify-center gap-2"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Sparkles className="w-4 h-4" />
        Generate New Goal
      </motion.button>
    </div>
  );
}
