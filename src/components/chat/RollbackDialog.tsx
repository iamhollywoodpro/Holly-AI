'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { DeploymentHistory } from './DeploymentHistory';

interface RollbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RollbackDialog({ isOpen, onClose }: RollbackDialogProps) {
  const handleRollback = (deploymentId: string) => {
    // Rollback handled in DeploymentHistory component
    // Close dialog after successful rollback
    setTimeout(() => {
      onClose();
    }, 1500);
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                    <ArrowPathIcon className="w-6 h-6" />
                    Deployment Rollback
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Warning Banner */}
                <div className="bg-yellow-500/10 border-b border-yellow-500/30 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-yellow-400 mb-1">
                        Production Rollback Warning
                      </div>
                      <div className="text-xs text-gray-300">
                        Rolling back will promote a previous deployment to production.
                        This action affects live users immediately.
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        💡 Tip: Test in preview environment first when possible.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deployment History */}
                <DeploymentHistory onRollback={handleRollback} />

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div>
                      Click "Rollback" on any successful deployment to restore it
                    </div>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
