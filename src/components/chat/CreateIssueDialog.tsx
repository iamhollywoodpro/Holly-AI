'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Label, Milestone, ISSUE_TEMPLATES, IssueTemplate } from '@/types/issue';
import { Collaborator } from '@/types/collaboration';

interface CreateIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
}

export default function CreateIssueDialog({
  isOpen,
  onClose,
  owner,
  repo,
}: CreateIssueDialogProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<IssueTemplate | null>(null);
  
  const [labels, setLabels] = useState<Label[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchData();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setSelectedLabels([]);
    setSelectedAssignees([]);
    setSelectedMilestone(null);
    setSelectedTemplate(null);
    setError(null);
    setSuccess(false);
    setShowTemplates(true);
  };

  const fetchData = async () => {
    try {
      // Fetch labels
      const labelsRes = await fetch(`/api/github/labels?owner=${owner}&repo=${repo}`);
      if (labelsRes.ok) {
        const labelsData = await labelsRes.json();
        setLabels(labelsData.labels || []);
      }

      // Fetch collaborators
      const collabRes = await fetch(`/api/github/collaborators?owner=${owner}&repo=${repo}`);
      if (collabRes.ok) {
        const collabData = await collabRes.json();
        setCollaborators(collabData.collaborators || []);
      }

      // Fetch milestones
      const milestonesRes = await fetch(`/api/github/milestones?owner=${owner}&repo=${repo}`);
      if (milestonesRes.ok) {
        const milestonesData = await milestonesRes.json();
        setMilestones(milestonesData.milestones || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleTemplateSelect = (template: IssueTemplate) => {
    setSelectedTemplate(template);
    setTitle(template.title);
    setBody(template.body);
    setSelectedLabels(template.labels || []);
    setShowTemplates(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/github/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          title: title.trim(),
          body: body.trim() || undefined,
          labels: selectedLabels.length > 0 ? selectedLabels : undefined,
          assignees: selectedAssignees.length > 0 ? selectedAssignees : undefined,
          milestone: selectedMilestone || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create issue');
      }

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

  const toggleLabel = (labelName: string) => {
    if (selectedLabels.includes(labelName)) {
      setSelectedLabels(selectedLabels.filter(l => l !== labelName));
    } else {
      setSelectedLabels([...selectedLabels, labelName]);
    }
  };

  const toggleAssignee = (username: string) => {
    if (selectedAssignees.includes(username)) {
      setSelectedAssignees(selectedAssignees.filter(a => a !== username));
    } else {
      setSelectedAssignees([...selectedAssignees, username]);
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Create New Issue
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 mt-1">
                      {owner}/{repo}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {success ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircleIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Issue Created!
                    </h3>
                    <p className="text-sm text-gray-600">
                      Your issue has been successfully created
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Templates */}
                    {showTemplates && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">
                          Choose a template
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {ISSUE_TEMPLATES.map((template, index) => (
                            <button
                              key={index}
                              onClick={() => handleTemplateSelect(template)}
                              className="p-4 text-left border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
                            >
                              <div className="font-medium text-gray-900 mb-1">
                                {template.name}
                              </div>
                              {template.labels && template.labels.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {template.labels.map((label) => (
                                    <span
                                      key={label}
                                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                                    >
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Title */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Issue title"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Describe the issue..."
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Supports Markdown formatting
                      </p>
                    </div>

                    {/* Labels */}
                    {labels.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Labels
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {labels.map((label) => {
                            const isSelected = selectedLabels.includes(label.name);
                            return (
                              <button
                                key={label.id}
                                onClick={() => toggleLabel(label.name)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                  isSelected ? 'ring-2 ring-purple-500 ring-offset-1' : ''
                                }`}
                                style={{
                                  backgroundColor: `#${label.color}${isSelected ? 'FF' : '40'}`,
                                  color: isSelected ? '#fff' : `#${label.color}`,
                                }}
                              >
                                {label.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Assignees */}
                    {collaborators.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assignees
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {collaborators.slice(0, 10).map((collab) => {
                            const isSelected = selectedAssignees.includes(collab.login);
                            return (
                              <button
                                key={collab.id}
                                onClick={() => toggleAssignee(collab.login)}
                                className={`flex items-center gap-2 px-3 py-1.5 border-2 rounded-lg transition-all ${
                                  isSelected
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                                }`}
                              >
                                <img
                                  src={collab.avatar_url}
                                  alt={collab.login}
                                  className="w-5 h-5 rounded-full"
                                />
                                <span className="text-sm">@{collab.login}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Milestone */}
                    {milestones.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Milestone
                        </label>
                        <select
                          value={selectedMilestone || ''}
                          onChange={(e) => setSelectedMilestone(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">No milestone</option>
                          {milestones.map((milestone) => (
                            <option key={milestone.id} value={milestone.number}>
                              {milestone.title} ({milestone.open_issues} open)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={loading || !title.trim()}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <PlusIcon className="w-4 h-4" />
                            Create Issue
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
