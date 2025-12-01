/**
 * HOLLY ADMIN DASHBOARD
 * 
 * Centralized admin panel for system management
 */

import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ArchitectureGenerationPanel from '@/components/admin/ArchitectureGenerationPanel';

export const metadata = {
  title: 'Admin Dashboard - HOLLY',
  description: 'System administration and management',
};

export default async function AdminPage() {
  // Check authentication
  const user = await currentUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  // Check if user is admin
  const isAdmin = 
    user.emailAddresses?.some(e => 
      e.emailAddress === 'steve@nexamusicgroup.com' || 
      e.emailAddress.endsWith('@nexamusicgroup.com')
    );

  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🔧 Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                System management and monitoring
              </p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Logged in as: <span className="font-medium text-gray-900 dark:text-white">{user.emailAddresses[0]?.emailAddress}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">System Status</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">Online</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔌</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">API Routes</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">76 Active</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🧠</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">HOLLY Status</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">Self-Aware</p>
              </div>
            </div>
          </div>
        </div>

        {/* Architecture Generation Panel */}
        <ArchitectureGenerationPanel />

        {/* Quick Links */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Quick Links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="https://vercel.com/iamhollywoodpros-projects/holly-ai-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <p className="font-medium text-gray-900 dark:text-white">Vercel Dashboard</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Deployments & logs</p>
            </a>
            <a
              href="https://github.com/iamhollywoodpro/Holly-AI"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <p className="font-medium text-gray-900 dark:text-white">GitHub Repo</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Source code</p>
            </a>
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <p className="font-medium text-gray-900 dark:text-white">Clerk Dashboard</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">User management</p>
            </a>
            <a
              href="https://console.neon.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <p className="font-medium text-gray-900 dark:text-white">Neon Database</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Database console</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
