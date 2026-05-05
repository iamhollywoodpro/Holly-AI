'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface WorkflowRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  workflowId: number;
  workflowName: string;
  defaultBranch?: string;
}

export default function WorkflowRunDialog({
  isOpen,
  onClose,
  owner,
  repo,
  workflowId,
  workflowName,
  defaultBranch = 'main',
}: WorkflowRunDialogProps) {
  const [branch, setBranch] = useState(defaultBranch);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBranch(defaultBranch);
      setInputs({});
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, defaultBranch]);

  const handleTrigger = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/github/workflows/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          ref: branch,
          inputs: Object.keys(inputs).length > 0 ? inputs : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to trigger workflow');
      }

      const data = await response.json();
      setSuccess(true);

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Trigger Workflow
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 mt-1">{workflowName}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {success ? (
                  <div className="py-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PlayIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Workflow Triggered!
                    </h3>
                    <p className="text-sm text-gray-600">
                      Check the Runs tab to see progress
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Warning about workflow_dispatch */}
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-yellow-800">
                        <p className="font-medium mb-1">Manual Trigger Required</p>
                        <p>This workflow must have <code className="bg-yellow-100 px-1 rounded">workflow_dispatch</code> event configured to be triggered manually.</p>
                      </div>
                    </div>

                    {/* Branch Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Branch/Tag
                      </label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        The branch or tag to run the workflow on
                      </p>
                    </div>

                    {/* Workflow Inputs (Optional) */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Workflow Inputs (Optional)
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Add any custom inputs required by the workflow
                      </p>
                      <div className="space-y-2">
                        {Object.entries(inputs).map(([key, value], index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={key}
                              onChange={(e) => {
                                const newInputs = { ...inputs };
                                delete newInputs[key];
                                newInputs[e.target.value] = value;
                                setInputs(newInputs);
                              }}
                              placeholder="Key"
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => setInputs({ ...inputs, [key]: e.target.value })}
                              placeholder="Value"
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button
                              onClick={() => {
                                const newInputs = { ...inputs };
                                delete newInputs[key];
                                setInputs(newInputs);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setInputs({ ...inputs, '': '' })}
                          className="w-full py-2 text-sm text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        >
                          + Add Input
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleTrigger}
                        disabled={loading || !branch}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Triggering...
                          </>
                        ) : (
                          <>
                            <PlayIcon className="w-4 h-4" />
                            Trigger Workflow
                          </>
                        )}
                      </button>
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
