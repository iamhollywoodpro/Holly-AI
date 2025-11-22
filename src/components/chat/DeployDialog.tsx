'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ArrowPathIcon,
  RocketLaunchIcon 
} from '@heroicons/react/24/outline';
import { useActiveRepo } from '@/hooks/useActiveRepo';

interface DeployDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type DeployStatus = 'idle' | 'deploying' | 'success' | 'error';

interface DeploymentInfo {
  id?: string;
  url?: string;
  status?: string;
  readyState?: string;
}

export function DeployDialog({ isOpen, onClose }: DeployDialogProps) {
  const { activeRepo } = useActiveRepo();
  const [status, setStatus] = useState<DeployStatus>('idle');
  const [error, setError] = useState('');
  const [deployment, setDeployment] = useState<DeploymentInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleDeploy = async () => {
    if (!activeRepo) {
      setError('No repository selected');
      return;
    }

    try {
      setStatus('deploying');
      setError('');
      setLogs([]);
      addLog('Starting deployment...');

      const response = await fetch('/api/vercel/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: activeRepo.owner,
          repo: activeRepo.repo,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to trigger deployment');
        setStatus('error');
        addLog(`❌ Error: ${data.error || 'Failed to trigger deployment'}`);
        return;
      }

      addLog('✅ Deployment triggered successfully');
      addLog(`Deployment ID: ${data.deployment.id}`);
      
      setDeployment(data.deployment);
      
      // Poll for deployment status
      pollDeploymentStatus(data.deployment.id);

    } catch (err: any) {
      setError(err.message || 'Failed to trigger deployment');
      setStatus('error');
      addLog(`❌ Error: ${err.message || 'Failed to trigger deployment'}`);
    }
  };

  const pollDeploymentStatus = async (deploymentId: string) => {
    const maxAttempts = 60; // 5 minutes max (5s interval)
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/vercel/deploy?id=${deploymentId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setStatus('error');
          addLog(`❌ ${data.error}`);
          return;
        }

        setDeployment(data.deployment);

        // Check deployment state
        if (data.deployment.readyState === 'READY') {
          setStatus('success');
          addLog('🎉 Deployment completed successfully!');
          addLog(`Live at: ${data.deployment.url}`);
          return;
        } else if (data.deployment.readyState === 'ERROR') {
          setError('Deployment failed');
          setStatus('error');
          addLog('❌ Deployment failed');
          return;
        } else {
          // Still building
          addLog(`Building... (${data.deployment.readyState})`);
          
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            setError('Deployment timeout');
            setStatus('error');
            addLog('⏱️ Deployment timeout - check Vercel dashboard');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to check deployment status');
        setStatus('error');
        addLog(`❌ Error checking status: ${err.message}`);
      }
    };

    poll();
  };

  const handleClose = () => {
    if (status === 'deploying') {
      // Don't close while deploying
      return;
    }
    setStatus('idle');
    setError('');
    setDeployment(null);
    setLogs([]);
    onClose();
  };

  if (!activeRepo) {
    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <div className="text-center">
                    <ExclamationCircleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <Dialog.Title className="text-lg font-semibold text-white mb-2">
                      No Repository Selected
                    </Dialog.Title>
                    <p className="text-sm text-gray-400 mb-4">
                      Please select a repository first by using the <code className="px-2 py-1 bg-gray-800 rounded text-purple-400">/repos</code> command.
                    </p>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                {status === 'success' ? (
                  // Success State
                  <div className="text-center py-8">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <Dialog.Title className="text-2xl font-bold text-white mb-2">
                      🎉 Deployed Successfully!
                    </Dialog.Title>
                    <p className="text-gray-400 mb-4">
                      Your changes are now live on Vercel
                    </p>
                    {deployment?.url && (
                      <a
                        href={`https://${deployment.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
                      >
                        Visit deployment →
                      </a>
                    )}
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  // Deploy Form / Status
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                        <RocketLaunchIcon className="w-6 h-6" />
                        Deploy to Vercel
                      </Dialog.Title>
                      {status !== 'deploying' && (
                        <button
                          onClick={handleClose}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <XMarkIcon className="w-6 h-6" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Repository Info */}
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                        <div className="text-sm text-gray-400">Repository</div>
                        <div className="text-white font-semibold mt-1">
                          {activeRepo.fullName}
                        </div>
                        {activeRepo.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {activeRepo.description}
                          </div>
                        )}
                      </div>

                      {/* Deployment Logs */}
                      {logs.length > 0 && (
                        <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
                          <div className="text-sm font-semibold text-white mb-2">
                            Deployment Logs
                          </div>
                          <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
                            {logs.map((log, index) => (
                              <div key={index} className="text-gray-400">
                                {log}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <div className="text-sm text-red-400">{error}</div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        {status === 'idle' ? (
                          <>
                            <button
                              onClick={handleClose}
                              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDeploy}
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-colors"
                            >
                              🚀 Deploy Now
                            </button>
                          </>
                        ) : status === 'deploying' ? (
                          <div className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg flex items-center justify-center gap-2">
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            <span>Deploying...</span>
                          </div>
                        ) : (
                          <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
