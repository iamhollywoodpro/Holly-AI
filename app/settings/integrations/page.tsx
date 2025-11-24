'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Cloud, Check, AlertCircle, Loader2, CodeBracketIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface IntegrationService {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status: 'connected' | 'disconnected' | 'coming-soon';
  onConnect?: () => void;
  onDisconnect?: () => void;
  details?: {
    email?: string;
    username?: string;
    accountInfo?: string;
  };
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [driveConnected, setDriveConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrationStatus();
    
    // Check for success/error parameters
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');
    
    if (successParam === 'drive_connected') {
      setSuccess('🎉 Google Drive connected successfully!');
      window.history.replaceState({}, '', '/settings/integrations');
    }
    
    if (successParam === 'github_connected') {
      setSuccess('🎉 GitHub connected successfully!');
      window.history.replaceState({}, '', '/settings/integrations');
    }
    
    if (errorParam) {
      setError(`Error: ${errorParam}`);
      window.history.replaceState({}, '', '/settings/integrations');
    }
  }, [searchParams]);

  const fetchIntegrationStatus = async () => {
    try {
      setLoading(true);
      
      // Fetch Google Drive status
      const driveRes = await fetch('/api/google-drive/status');
      const driveData = await driveRes.json();
      setDriveConnected(driveData.success && driveData.connected);
      if (driveData.user?.email) setDriveEmail(driveData.user.email);
      
      // Fetch GitHub status
      const githubRes = await fetch('/api/github/connection');
      const githubData = await githubRes.json();
      setGithubConnected(githubData.connected);
      if (githubData.username) setGithubUsername(githubData.username);
      
    } catch (err) {
      console.error('Failed to fetch integration status:', err);
    } finally {
      setLoading(false);
    }
  };

  const services: IntegrationService[] = [
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Automatically save generated files to your Google Drive',
      icon: <Cloud className="w-6 h-6" />,
      color: 'from-blue-600 to-cyan-600',
      status: driveConnected ? 'connected' : 'disconnected',
      onConnect: () => window.location.href = '/api/google-drive/connect',
      details: driveConnected ? { email: driveEmail } : undefined,
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Access your repositories and create commits directly',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      ),
      color: 'from-gray-700 to-gray-900',
      status: githubConnected ? 'connected' : 'disconnected',
      onConnect: () => window.location.href = '/api/github/connect',
      details: githubConnected ? { username: `@${githubUsername}` } : undefined,
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      description: 'Sync files with your Dropbox account',
      icon: <Cloud className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-700',
      status: 'coming-soon',
    },
    {
      id: 'onedrive',
      name: 'OneDrive',
      description: 'Connect to Microsoft OneDrive for file storage',
      icon: <Cloud className="w-6 h-6" />,
      color: 'from-blue-600 to-blue-800',
      status: 'coming-soon',
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Sync HOLLY conversations with Notion pages',
      icon: <Cloud className="w-6 h-6" />,
      color: 'from-gray-800 to-black',
      status: 'coming-soon',
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Get notifications and updates in Slack',
      icon: <Cloud className="w-6 h-6" />,
      color: 'from-purple-600 to-purple-800',
      status: 'coming-soon',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Integrations</h2>
        <p className="text-gray-400">Connect HOLLY to your favorite services</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-3 text-green-300"
        >
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-300"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Integration Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-6 rounded-xl border transition-all ${
              service.status === 'connected'
                ? 'bg-gray-800/50 border-green-500/30'
                : service.status === 'coming-soon'
                ? 'bg-gray-800/20 border-gray-700/30 opacity-60'
                : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${service.color}`}>
                  {service.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                  {service.status === 'connected' && service.details && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {service.details.email || service.details.username || service.details.accountInfo}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              {service.status === 'connected' ? (
                <span className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
              ) : service.status === 'coming-soon' ? (
                <span className="px-2 py-1 bg-gray-700/50 text-gray-500 rounded-full text-xs font-medium">
                  Coming Soon
                </span>
              ) : (
                <span className="px-2 py-1 bg-gray-700/50 text-gray-400 rounded-full text-xs font-medium">
                  Not Connected
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-400 mb-4">{service.description}</p>

            {/* Actions */}
            {service.status === 'connected' ? (
              <button
                onClick={service.onDisconnect}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
              >
                Disconnect
              </button>
            ) : service.status === 'disconnected' ? (
              <button
                onClick={service.onConnect}
                className={`w-full px-4 py-2 bg-gradient-to-r ${service.color} hover:opacity-90 rounded-lg text-sm text-white font-medium transition-opacity`}
              >
                Connect {service.name}
              </button>
            ) : (
              <button
                disabled
                className="w-full px-4 py-2 bg-gray-800/50 rounded-lg text-sm text-gray-500 cursor-not-allowed"
              >
                Coming Soon
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* More Integrations Coming */}
      <div className="p-6 bg-gray-800/30 border border-gray-700/50 rounded-xl text-center">
        <p className="text-gray-400 text-sm">
          Need another integration?{' '}
          <a href="mailto:support@hollywoodpro.dev" className="text-purple-400 hover:text-purple-300 transition-colors">
            Let us know
          </a>
        </p>
      </div>
    </div>
  );
}
