/**
 * Admin Dashboard Page with Phase 4A Components
 * Includes: Architecture Generation, Self-Healing, Insights, Auto-Merge, Predictive Detection, Analytics
 */

'use client';

import { useState } from 'react';
import { 
  FileCode, 
  Activity, 
  TrendingUp, 
  GitMerge, 
  Target, 
  BarChart3 
} from 'lucide-react';

import ArchitectureGenerationPanel from '@/components/admin/ArchitectureGenerationPanel';
import { SelfHealingPanel } from '@/components/admin/SelfHealingPanel';
import { InsightsPanel } from '@/components/admin/InsightsPanel';
import { AutoMergePanel } from '@/components/admin/AutoMergePanel';
import { PredictiveDetectionPanel } from '@/components/admin/PredictiveDetectionPanel';
import { AnalyticsDashboardPanel } from '@/components/admin/AnalyticsDashboardPanel';

type Tab = 
  | 'architecture' 
  | 'self-healing' 
  | 'insights' 
  | 'auto-merge' 
  | 'predictive-detection' 
  | 'analytics';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');

  const tabs = [
    {
      id: 'analytics' as Tab,
      label: 'Analytics',
      icon: BarChart3,
      description: 'System health & metrics'
    },
    {
      id: 'auto-merge' as Tab,
      label: 'Auto-Merge',
      icon: GitMerge,
      description: 'PR auto-merge system'
    },
    {
      id: 'predictive-detection' as Tab,
      label: 'Predictions',
      icon: Target,
      description: 'Predictive issue detection'
    },
    {
      id: 'self-healing' as Tab,
      label: 'Self-Healing',
      icon: Activity,
      description: 'Autonomous healing'
    },
    {
      id: 'insights' as Tab,
      label: 'Insights',
      icon: TrendingUp,
      description: 'Learning insights'
    },
    {
      id: 'architecture' as Tab,
      label: 'Architecture',
      icon: FileCode,
      description: 'System architecture'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              HOLLY Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Enhanced Self-Awareness & Autonomous Development System
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors
                    ${
                      isActive
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs text-gray-500">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'analytics' && <AnalyticsDashboardPanel />}
        {activeTab === 'auto-merge' && <AutoMergePanel />}
        {activeTab === 'predictive-detection' && <PredictiveDetectionPanel />}
        {activeTab === 'self-healing' && <SelfHealingPanel />}
        {activeTab === 'insights' && <InsightsPanel />}
        {activeTab === 'architecture' && <ArchitectureGenerationPanel />}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <strong>HOLLY</strong> - Hyper-Optimized Logic & Learning Yield
            </div>
            <div>
              Phase 4A: Enhanced Self-Awareness & Predictive Systems
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
