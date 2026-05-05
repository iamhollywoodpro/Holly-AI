'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { WorkflowRun, WorkflowJob } from '@/types/workflow';

interface WorkflowLogsViewerProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  runId: number;
}

export default function WorkflowLogsViewer({
  isOpen,
  onClose,
  owner,
  repo,
  runId,
}: WorkflowLogsViewerProps) {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRunDetails();
    }
  }, [isOpen, runId]);

  const fetchRunDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/github/workflows/runs/${runId}?owner=${owner}&repo=${repo}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch run details');
      }

      const data = await response.json();
      setRun(data.run);
      setJobs(data.jobs || []);
      
      // Auto-select first job
      if (data.jobs && data.jobs.length > 0) {
        setSelectedJob(data.jobs[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLogs = async () => {
    try {
      const response = await fetch(
        `/api/github/workflows/runs/${runId}/logs?owner=${owner}&repo=${repo}`
      );

      if (!response.ok) {
        throw new Error('Failed to download logs');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-${runId}-logs.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'completed') {
      if (conclusion === 'success') return 'text-green-600 bg-green-50';
      if (conclusion === 'failure') return 'text-red-600 bg-red-50';
      if (conclusion === 'cancelled') return 'text-gray-600 bg-gray-50';
    }
    if (status === 'in_progress') return 'text-blue-600 bg-blue-50';
    if (status === 'queued') return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatDuration = (started: string | null, completed: string | null) => {
    if (!started) return 'N/A';
    const start = new Date(started).getTime();
    const end = completed ? new Date(completed).getTime() : Date.now();
    const duration = Math.floor((end - start) / 1000);
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const selectedJobData = jobs.find(j => j.id === selectedJob);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-200">
                  <div className="flex-1">
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      {run?.name || 'Workflow Run'}
                    </Dialog.Title>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(run?.status || '', run?.conclusion || null)}`}>
                        {run?.conclusion || run?.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        Run #{run?.run_number}
                      </span>
                      <span className="text-sm text-gray-600">
                        {run?.head_branch}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadLogs}
                      className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="Download logs"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm text-gray-600">Loading workflow details...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="p-6">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[600px]">
                    {/* Jobs Sidebar */}
                    <div className="w-64 border-r border-gray-200 overflow-y-auto">
                      <div className="p-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                          Jobs ({jobs.length})
                        </h3>
                        <div className="space-y-2">
                          {jobs.map((job) => (
                            <button
                              key={job.id}
                              onClick={() => setSelectedJob(job.id)}
                              className={`w-full text-left p-3 rounded-lg transition-colors ${
                                selectedJob === job.id
                                  ? 'bg-purple-50 border-2 border-purple-300'
                                  : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {job.name}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(job.status, job.conclusion)}`}>
                                  {job.conclusion || job.status}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDuration(job.started_at, job.completed_at)}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Steps Details */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {selectedJobData ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {selectedJobData.name}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Duration: {formatDuration(selectedJobData.started_at, selectedJobData.completed_at)}
                              </p>
                            </div>
                            <a
                              href={selectedJobData.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-purple-600 hover:underline"
                            >
                              View on GitHub →
                            </a>
                          </div>

                          {/* Steps */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700">
                              Steps ({selectedJobData.steps.length})
                            </h4>
                            {selectedJobData.steps.map((step, index) => (
                              <div
                                key={index}
                                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3">
                                    <span className="text-sm font-mono text-gray-500">
                                      {step.number}
                                    </span>
                                    <div>
                                      <h5 className="font-medium text-gray-900">
                                        {step.name}
                                      </h5>
                                      {step.started_at && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {formatDuration(step.started_at, step.completed_at)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(step.status, step.conclusion)}`}>
                                    {step.conclusion || step.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Download Notice */}
                          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>Note:</strong> To view full logs, download the logs ZIP file using the download button above. GitHub provides detailed logs as downloadable archives.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <p className="text-sm">Select a job to view details</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
