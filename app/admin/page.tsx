/**
 * ADMIN DASHBOARD - PHASE 3 ENHANCED
 * Main admin page with architecture generation, self-healing, and insights panels
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Activity, Zap, BarChart3, GitBranch } from 'lucide-react';
import { ArchitectureGenerationPanel } from '@/components/admin/ArchitectureGenerationPanel';
import { SelfHealingPanel } from '@/components/admin/SelfHealingPanel';
import { InsightsPanel } from '@/components/admin/InsightsPanel';

export default async function AdminPage() {
  const { userId } = auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const isAdmin = user?.emailAddresses[0]?.emailAddress?.endsWith('@nexamusicgroup.com');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-2xl max-w-md">
          <div className="text-center">
            <div className="mb-4 text-6xl">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              This page is only accessible to NEXA Music Group administrators.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                HOLLY Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Phase 3: Enhanced Self-Awareness & Learning
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <span>👤 {user?.firstName || 'Admin'}</span>
            <span>•</span>
            <span>📧 {user?.emailAddresses[0]?.emailAddress}</span>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <GitBranch className="w-8 h-8" />
              <span className="text-2xl font-bold">✅</span>
            </div>
            <h3 className="font-semibold mb-1">Architecture Map</h3>
            <p className="text-sm text-blue-100">Phase 2 Complete</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8" />
              <span className="text-2xl font-bold">🚀</span>
            </div>
            <h3 className="font-semibold mb-1">Self-Healing</h3>
            <p className="text-sm text-purple-100">Auto Code Repair</p>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8" />
              <span className="text-2xl font-bold">📊</span>
            </div>
            <h3 className="font-semibold mb-1">Insights</h3>
            <p className="text-sm text-pink-100">Performance Analysis</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8" />
              <span className="text-2xl font-bold">🧠</span>
            </div>
            <h3 className="font-semibold mb-1">Learning</h3>
            <p className="text-sm text-green-100">Adaptive AI</p>
          </div>
        </div>

        {/* Phase 2: Architecture Generation */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <GitBranch className="w-6 h-6" />
            <span>Phase 2: Architecture Generation</span>
          </h2>
          <ArchitectureGenerationPanel />
        </div>

        {/* Phase 3: Self-Healing System */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Zap className="w-6 h-6" />
            <span>Phase 3: Self-Healing System</span>
          </h2>
          <SelfHealingPanel />
        </div>

        {/* Phase 3: System Insights */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <BarChart3 className="w-6 h-6" />
            <span>Phase 3: System Insights</span>
          </h2>
          <InsightsPanel />
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="https://github.com/iamhollywoodpro/Holly-AI"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow text-center"
            >
              <div className="text-2xl mb-2">🐙</div>
              <div className="font-medium text-sm text-gray-900 dark:text-white">GitHub</div>
            </a>
            <a
              href="https://vercel.com/iamhollywoodpros-projects/holly-ai-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow text-center"
            >
              <div className="text-2xl mb-2">▲</div>
              <div className="font-medium text-sm text-gray-900 dark:text-white">Vercel</div>
            </a>
            <a
              href="https://holly.nexamusicgroup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow text-center"
            >
              <div className="text-2xl mb-2">🌐</div>
              <div className="font-medium text-sm text-gray-900 dark:text-white">Live Site</div>
            </a>
            <a
              href="https://clerk.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow text-center"
            >
              <div className="text-2xl mb-2">🔐</div>
              <div className="font-medium text-sm text-gray-900 dark:text-white">Clerk</div>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>HOLLY - Hyper-Optimized Logic & Learning Yield</p>
          <p>© 2025 NEXA Music Group. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
