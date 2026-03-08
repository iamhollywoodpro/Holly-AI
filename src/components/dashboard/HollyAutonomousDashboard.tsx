'use client';

/**
 * HOLLY AI - Autonomous Dashboard
 * 
 * Real-time dashboard for monitoring HOLLY's:
 * - System health
 * - Evolution progress
 * - Capabilities
 * - Learning insights
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface HealthMetric {
  name: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
}

interface Capability {
  name: string;
  level: number;
  description: string;
  lastImproved: string;
}

interface EvolutionReadiness {
  score: number;
  canEvolve: boolean;
  blockers: string[];
  nextSteps: string[];
}

// Components
const MetricCard: React.FC<{ metric: HealthMetric }> = ({ metric }) => {
  const statusColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-4 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{metric.name}</span>
        <span className={`${statusColors[metric.status]} w-3 h-3 rounded-full`} />
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
      </div>
      <div className="text-gray-500 text-xs">{metric.message}</div>
    </motion.div>
  );
};

const CapabilityBar: React.FC<{ capability: Capability }> = ({ capability }) => {
  const getColor = (level: number) => {
    if (level >= 80) return 'bg-green-500';
    if (level >= 60) return 'bg-blue-500';
    if (level >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-gray-300 text-sm">{capability.name}</span>
        <span className="text-gray-500 text-sm">{capability.level}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${capability.level}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full ${getColor(capability.level)}`}
        />
      </div>
      <div className="text-gray-600 text-xs mt-1">{capability.description}</div>
    </div>
  );
};

const EvolutionStatus: React.FC<{ readiness: EvolutionReadiness }> = ({ readiness }) => (
  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
    <h3 className="text-lg font-semibold text-white mb-4">Evolution Readiness</h3>
    
    <div className="flex items-center justify-center mb-6">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="#374151"
            strokeWidth="8"
            fill="none"
          />
          <motion.circle
            cx="64"
            cy="64"
            r="56"
            stroke={readiness.canEvolve ? '#10B981' : '#F59E0B'}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDasharray: '0 352' }}
            animate={{ strokeDasharray: `${(readiness.score / 100) * 352} 352` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-white">{readiness.score}%</span>
        </div>
      </div>
    </div>

    <div className={`text-center mb-4 ${readiness.canEvolve ? 'text-green-400' : 'text-yellow-400'}`}>
      {readiness.canEvolve ? '✅ Ready for Autonomous Evolution' : '⚠️ Not Ready'}
    </div>

    {readiness.blockers.length > 0 && (
      <div className="mb-4">
        <h4 className="text-gray-400 text-sm mb-2">Blockers:</h4>
        <ul className="space-y-1">
          {readiness.blockers.map((blocker, i) => (
            <li key={i} className="text-red-400 text-sm">• {blocker}</li>
          ))}
        </ul>
      </div>
    )}

    <div>
      <h4 className="text-gray-400 text-sm mb-2">Next Steps:</h4>
      <ul className="space-y-1">
        {readiness.nextSteps.map((step, i) => (
          <li key={i} className="text-blue-400 text-sm">• {step}</li>
        ))}
      </ul>
    </div>
  </div>
);

// Main Dashboard Component
export const HollyAutonomousDashboard: React.FC = () => {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [evolutionReadiness, setEvolutionReadiness] = useState<EvolutionReadiness>({
    score: 0,
    canEvolve: false,
    blockers: [],
    nextSteps: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch data
  const fetchData = async () => {
    try {
      // Fetch health
      const healthRes = await fetch('/api/autonomous/health');
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealthMetrics(healthData.data?.metrics || []);
      }

      // Fetch evolution status
      const evolveRes = await fetch('/api/autonomous/evolve?action=readiness');
      if (evolveRes.ok) {
        const evolveData = await evolveRes.json();
        setEvolutionReadiness(evolveData.data || evolutionReadiness);
      }

      // Fetch capabilities
      const capRes = await fetch('/api/autonomous/evolve?action=capabilities');
      if (capRes.ok) {
        const capData = await capRes.json();
        setCapabilities(capData.data?.capabilities || []);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const runEvolution = async () => {
    try {
      const res = await fetch('/api/autonomous/evolve', { method: 'POST' });
      if (res.ok) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Evolution failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading HOLLY's systems...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          🧠 HOLLY Autonomous Dashboard
        </h1>
        <p className="text-gray-400">
          Real-time monitoring of HOLLY's self-improvement systems
        </p>
        <p className="text-gray-600 text-sm mt-1">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>

      {/* Health Metrics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {healthMetrics.map((metric, i) => (
              <MetricCard key={i} metric={metric} />
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Capabilities */}
        <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Capabilities</h2>
          <div className="space-y-2">
            {capabilities.map((cap, i) => (
              <CapabilityBar key={i} capability={cap} />
            ))}
          </div>
        </section>

        {/* Evolution Status */}
        <EvolutionStatus readiness={evolutionReadiness} />
      </div>

      {/* Actions */}
      <section className="mt-8 flex gap-4">
        <button
          onClick={fetchData}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          🔄 Refresh Data
        </button>
        <button
          onClick={runEvolution}
          disabled={!evolutionReadiness.canEvolve}
          className={`px-6 py-3 rounded-lg transition-colors ${
            evolutionReadiness.canEvolve
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          🚀 Run Evolution Cycle
        </button>
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gray-800">
        <p className="text-gray-600 text-sm text-center">
          HOLLY Autonomous Self-Improvement System • Built with ❤️ for the future of AI
        </p>
      </footer>
    </div>
  );
};

export default HollyAutonomousDashboard;
