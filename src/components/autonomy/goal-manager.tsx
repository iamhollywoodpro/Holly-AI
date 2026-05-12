'use client';

/**
 * Goal Manager Component
 * 
 * Provides UI for:
 * - Viewing prioritized goals
 * - Creating new goals
 * - Executing goals
 * - Tracking goal progress
 */

import { useState, useEffect } from 'react';
import { createLogger } from '@/lib/logging/structured-logger';

const logger = createLogger('goal-manager');

interface Goal {
  id: string;
  title: string;
  category: string;
  priority: number;
  score: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  canStart: boolean;
  blockedBy: string[];
  reasons: string[];
  deadline?: string;
  createdAt: string;
}

interface GoalFormData {
  title: string;
  description: string;
  category: string;
  priority: number;
  deadline?: string;
}

const CATEGORIES = [
  'improvement',
  'learning',
  'performance',
  'user_satisfaction',
  'resource',
  'collaboration'
];

const CATEGORY_LABELS: Record<string, string> = {
  improvement: 'Self-Improvement',
  learning: 'Learning',
  performance: 'Performance',
  user_satisfaction: 'User Experience',
  resource: 'Resources',
  collaboration: 'Collaboration'
};

export default function GoalManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [executingGoal, setExecutingGoal] = useState<string | null>(null);
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    category: 'improvement',
    priority: 5,
    deadline: ''
  });

  // Fetch goals on mount
  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/goals');
      const data = await response.json();
      setGoals(data.goals || []);
    } catch (error) {
      logger.error('Failed to fetch goals', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          actions: [], // Default empty actions
          userId: 'system' // System-generated goal
        })
      });

      if (response.ok) {
        setShowCreateForm(false);
        setFormData({
          title: '',
          description: '',
          category: 'improvement',
          priority: 5,
          deadline: ''
        });
        fetchGoals();
      }
    } catch (error) {
      logger.error('Failed to create goal', { error });
    }
  };

  const handleExecuteGoal = async (goalId: string) => {
    setExecutingGoal(goalId);
    
    try {
      const response = await fetch(`/api/goals/${goalId}/execute`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        logger.info('Goal executed', { goalId, result });
        fetchGoals();
      }
    } catch (error) {
      logger.error('Failed to execute goal', { error });
    } finally {
      setExecutingGoal(null);
    }
  };

  const handleCancelGoal = async (goalId: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}/execute`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchGoals();
      }
    } catch (error) {
      logger.error('Failed to cancel goal', { error });
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-600 bg-red-50';
    if (priority >= 5) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Autonomous Goals</h2>
          <p className="text-gray-600 mt-1">
            {goals.filter(g => g.canStart).length} actionable goals out of {goals.length} total
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Create Goal
        </button>
      </div>

      {/* Create Goal Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Goal</h3>
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Improve response time"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe what this goal should achieve..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (1-10) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Create Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No goals yet. Create your first autonomous goal!</p>
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {goal.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                      P{goal.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                      {goal.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{CATEGORY_LABELS[goal.category]}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{goal.score}</div>
                  <div className="text-xs text-gray-500">priority score</div>
                </div>
              </div>

              {/* Progress Bar */}
              {goal.status === 'in_progress' && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(goal.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {goal.reasons.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Why this priority?</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {goal.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-blue-500">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Blocked By */}
              {goal.blockedBy.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Blocked by:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {goal.blockedBy.map((blocked, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-yellow-600">•</span>
                        {blocked}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Created {new Date(goal.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  {goal.canStart && goal.status === 'pending' && (
                    <button
                      onClick={() => handleExecuteGoal(goal.id)}
                      disabled={executingGoal === goal.id}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {executingGoal === goal.id ? 'Executing...' : 'Execute Goal'}
                    </button>
                  )}
                  {goal.status === 'in_progress' && (
                    <button
                      onClick={() => handleCancelGoal(goal.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}