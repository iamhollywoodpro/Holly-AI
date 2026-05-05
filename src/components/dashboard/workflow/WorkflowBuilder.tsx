'use client';

import { useState, DragEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/dashboard/ui/Card';
import { Plus, Trash2, GripVertical, Play, Save } from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config: any;
}

interface WorkflowBuilderProps {
  initialSteps?: WorkflowStep[];
  onSave: (steps: WorkflowStep[]) => Promise<void>;
}

const STEP_TYPES = [
  { type: 'api_call', name: 'API Call', icon: '🔌', color: 'bg-blue-100 text-blue-700' },
  { type: 'data_transform', name: 'Transform Data', icon: '🔄', color: 'bg-green-100 text-green-700' },
  { type: 'condition', name: 'Condition', icon: '❓', color: 'bg-yellow-100 text-yellow-700' },
  { type: 'delay', name: 'Delay', icon: '⏱️', color: 'bg-orange-100 text-orange-700' },
  { type: 'notification', name: 'Send Notification', icon: '📧', color: 'bg-purple-100 text-purple-700' },
  { type: 'ai_generation', name: 'AI Generation', icon: '🤖', color: 'bg-pink-100 text-pink-700' },
];

export function WorkflowBuilder({ initialSteps = [], onSave }: WorkflowBuilderProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const addStep = (type: string, name: string) => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      name,
      type,
      config: {},
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSteps = [...steps];
    const draggedStep = newSteps[draggedIndex];
    newSteps.splice(draggedIndex, 1);
    newSteps.splice(index, 0, draggedStep);

    setSteps(newSteps);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(steps);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Palette */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {STEP_TYPES.map((stepType) => (
              <button
                key={stepType.type}
                onClick={() => addStep(stepType.type, stepType.name)}
                className={`flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-all hover:shadow-md ${stepType.color}`}
              >
                <span className="text-2xl">{stepType.icon}</span>
                <span className="text-xs font-medium">{stepType.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Canvas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workflow Steps ({steps.length})</CardTitle>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || steps.length === 0}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Workflow'}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p className="text-sm">No steps yet. Add steps from above to build your workflow.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => {
                const stepType = STEP_TYPES.find(t => t.type === step.type);
                return (
                  <div key={step.id}>
                    <div
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group flex items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                        draggedIndex === index
                          ? 'border-purple-500 bg-purple-50 opacity-50'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                      }`}
                    >
                      {/* Drag Handle */}
                      <div className="cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                      </div>

                      {/* Step Number */}
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
                        {index + 1}
                      </div>

                      {/* Step Icon & Name */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{stepType?.icon}</span>
                          <span className="font-medium text-gray-900">{step.name}</span>
                        </div>
                        <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${stepType?.color}`}>
                          {stepType?.name}
                        </span>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => removeStep(index)}
                        className="rounded-lg p-2 text-red-600 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100"
                        title="Remove step"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Connector Arrow */}
                    {index < steps.length - 1 && (
                      <div className="flex justify-center py-2">
                        <div className="h-8 w-0.5 bg-gray-300"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Preview */}
      {steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-600" />
              Workflow Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Steps:</span>
                <span className="font-medium text-gray-900">{steps.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Step Types:</span>
                <span className="font-medium text-gray-900">
                  {new Set(steps.map(s => s.type)).size} unique
                </span>
              </div>
              <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                <p className="font-medium">Execution Flow:</p>
                <p className="mt-1 text-blue-600">
                  {steps.map((s, i) => `${i + 1}. ${s.name}`).join(' → ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
