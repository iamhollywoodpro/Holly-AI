/**
 * Admin Dashboard Page with Phase 4A, 4B, 4D, 4E & 4F Components
 * Phase 4A: Architecture, Self-Healing, Insights, Auto-Merge, Predictive Detection, Analytics
 * Phase 4B: Behavior Analytics, A/B Testing, Personalization, Engagement Scoring, User Journeys
 * Phase 4D: Testing Dashboard, CI/CD Pipeline, Code Review, Documentation Generator
 * Phase 4E: Integrations Dashboard, Notification Center, Webhook Manager
 * Phase 4F: Business Metrics, Custom Reports, Metric Alerts, Analytics Dashboards
 */

'use client';

import { useState } from 'react';
import { 
  FileCode, 
  Activity, 
  TrendingUp, 
  GitMerge, 
  Target, 
  BarChart3,
  Users,
  FlaskConical,
  Sparkles,
  Zap,
  Map,
  CheckCircle,
  Rocket,
  FileCheck,
  BookOpen,
  Link as LinkIcon,
  Bell,
  DollarSign,
  FileText,
  Bell as BellAlert,
  BarChart4,
} from 'lucide-react';

// Phase 4A Panels
import ArchitectureGenerationPanel from '@/components/admin/ArchitectureGenerationPanel';
import { SelfHealingPanel } from '@/components/admin/SelfHealingPanel';
import { InsightsPanel } from '@/components/admin/InsightsPanel';
import { AutoMergePanel } from '@/components/admin/AutoMergePanel';
import { PredictiveDetectionPanel } from '@/components/admin/PredictiveDetectionPanel';
import AnalyticsDashboardPanel from '@/components/admin/AnalyticsDashboardPanel';

// Phase 4B Panels
import BehaviorAnalyticsPanel from '@/components/admin/BehaviorAnalyticsPanel';
import ABTestingPanel from '@/components/admin/ABTestingPanel';
import PersonalizationPanel from '@/components/admin/PersonalizationPanel';
import EngagementScoringPanel from '@/components/admin/EngagementScoringPanel';
import UserJourneyPanel from '@/components/admin/UserJourneyPanel';

// Phase 4D Panels
import TestingDashboardPanel from '@/components/admin/TestingDashboardPanel';
import CICDPipelinePanel from '@/components/admin/CICDPipelinePanel';
import CodeReviewPanel from '@/components/admin/CodeReviewPanel';
import DocumentationPanel from '@/components/admin/DocumentationPanel';

// Phase 4E Panels
import IntegrationsDashboardPanel from '@/components/admin/IntegrationsDashboardPanel';
import NotificationCenterPanel from '@/components/admin/NotificationCenterPanel';
import WebhookManagerPanel from '@/components/admin/WebhookManagerPanel';
// Phase 4F Panels
import BusinessMetricsDashboard from '@/components/admin/BusinessMetricsDashboard';
import CustomReportsBuilder from '@/components/admin/CustomReportsBuilder';
import MetricAlertsManager from '@/components/admin/MetricAlertsManager';
import AnalyticsDashboardManager from '@/components/admin/AnalyticsDashboardPanel';


type Tab = 
  // Phase 4A
  | 'architecture' 
  | 'self-healing' 
  | 'insights' 
  | 'auto-merge' 
  | 'predictive-detection' 
  | 'analytics'
  // Phase 4B
  | 'behavior'
  | 'abtest'
  | 'personalization'
  | 'engagement'
  | 'journeys'
  // Phase 4D
  | 'testing'
  | 'cicd'
  | 'code-review'
  | 'documentation'
  // Phase 4E
  | 'integrations'
  | 'notifications'
  | 'webhooks'
  // Phase 4F
  | 'metrics'
  | 'reports'
  | 'alerts'
  | 'dashboards';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');

  const tabs = [
    // Phase 4A Tabs
    {
      id: 'analytics' as Tab,
      label: 'Analytics',
      icon: BarChart3,
      description: 'System health & metrics',
      phase: '4A'
    },
    {
      id: 'auto-merge' as Tab,
      label: 'Auto-Merge',
      icon: GitMerge,
      description: 'PR auto-merge system',
      phase: '4A'
    },
    {
      id: 'predictive-detection' as Tab,
      label: 'Predictions',
      icon: Target,
      description: 'Predictive issue detection',
      phase: '4A'
    },
    {
      id: 'self-healing' as Tab,
      label: 'Self-Healing',
      icon: Activity,
      description: 'Autonomous healing',
      phase: '4A'
    },
    {
      id: 'insights' as Tab,
      label: 'Insights',
      icon: TrendingUp,
      description: 'Learning insights',
      phase: '4A'
    },
    {
      id: 'architecture' as Tab,
      label: 'Architecture',
      icon: FileCode,
      description: 'System architecture',
      phase: '4A'
    },
    // Phase 4B Tabs
    {
      id: 'behavior' as Tab,
      label: 'Behavior',
      icon: Users,
      description: 'User behavior tracking',
      phase: '4B'
    },
    {
      id: 'abtest' as Tab,
      label: 'A/B Tests',
      icon: FlaskConical,
      description: 'A/B testing manager',
      phase: '4B'
    },
    {
      id: 'personalization' as Tab,
      label: 'Personalization',
      icon: Sparkles,
      description: 'User personalization',
      phase: '4B'
    },
    {
      id: 'engagement' as Tab,
      label: 'Engagement',
      icon: Zap,
      description: 'Engagement scoring',
      phase: '4B'
    },
    {
      id: 'journeys' as Tab,
      label: 'Journeys',
      icon: Map,
      description: 'User journey tracking',
      phase: '4B'
    },
    // Phase 4D Tabs
    {
      id: 'testing' as Tab,
      label: 'Testing',
      icon: CheckCircle,
      description: 'Automated testing',
      phase: '4D'
    },
    {
      id: 'cicd' as Tab,
      label: 'CI/CD',
      icon: Rocket,
      description: 'Pipeline automation',
      phase: '4D'
    },
    {
      id: 'code-review' as Tab,
      label: 'Code Review',
      icon: FileCheck,
      description: 'AI code review',
      phase: '4D'
    },
    {
      id: 'documentation' as Tab,
      label: 'Docs',
      icon: BookOpen,
      description: 'Auto documentation',
      phase: '4D'
    },
    // Phase 4E Tabs
    {
      id: 'integrations' as Tab,
      label: 'Integrations',
      icon: LinkIcon,
      description: 'External integrations',
      phase: '4E'
    },
    {
      id: 'notifications' as Tab,
      label: 'Notifications',
      icon: Bell,
      description: 'Notification center',
      phase: '4E'
    },
    {
      id: 'webhooks' as Tab,
      label: 'Webhooks',
      icon: Zap,
      description: 'Webhook manager',
      phase: '4E'
    },
    // Phase 4F Tabs
    {
      id: 'metrics' as Tab,
      label: 'Metrics',
      icon: DollarSign,
      description: 'Business metrics',
      phase: '4F'
    },
    {
      id: 'reports' as Tab,
      label: 'Reports',
      icon: FileText,
      description: 'Custom reports',
      phase: '4F'
    },
    {
      id: 'alerts' as Tab,
      label: 'Alerts',
      icon: BellAlert,
      description: 'Metric alerts',
      phase: '4F'
    },
    {
      id: 'dashboards' as Tab,
      label: 'Dashboards',
      icon: BarChart4,
      description: 'Analytics dashboards',
      phase: '4F'
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
              Enhanced Self-Awareness • Advanced User Intelligence • Development Automation
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
                    flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors relative
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
                  {(tab.phase === '4B' || tab.phase === '4D' || tab.phase === '4F') && (
                    <span className="absolute top-1 right-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      NEW
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Phase 4A Panels */}
        {activeTab === 'analytics' && <AnalyticsDashboardPanel />}
        {activeTab === 'auto-merge' && <AutoMergePanel />}
        {activeTab === 'predictive-detection' && <PredictiveDetectionPanel />}
        {activeTab === 'self-healing' && <SelfHealingPanel />}
        {activeTab === 'insights' && <InsightsPanel />}
        {activeTab === 'architecture' && <ArchitectureGenerationPanel />}
        
        {/* Phase 4B Panels */}
        {activeTab === 'behavior' && <BehaviorAnalyticsPanel />}
        {activeTab === 'abtest' && <ABTestingPanel />}
        {activeTab === 'personalization' && <PersonalizationPanel />}
        {activeTab === 'engagement' && <EngagementScoringPanel />}
        {activeTab === 'journeys' && <UserJourneyPanel />}

        {/* Phase 4D Panels */}
        {activeTab === 'testing' && <TestingDashboardPanel />}
        {activeTab === 'cicd' && <CICDPipelinePanel />}
        {activeTab === 'code-review' && <CodeReviewPanel />}
        {activeTab === 'documentation' && <DocumentationPanel />}

        {/* Phase 4E Panels */}
        {activeTab === 'integrations' && <IntegrationsDashboardPanel />}
        {activeTab === 'notifications' && <NotificationCenterPanel />}
        {activeTab === 'webhooks' && <WebhookManagerPanel />}

        {/* Phase 4F Panels */}
        {activeTab === 'metrics' && <BusinessMetricsDashboard />}
        {activeTab === 'reports' && <CustomReportsBuilder />}
        {activeTab === 'alerts' && <MetricAlertsManager />}
        {activeTab === 'dashboards' && <AnalyticsDashboardManager />}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <strong>HOLLY</strong> - Hyper-Optimized Logic & Learning Yield
            </div>
            <div>
              Phase 4A: Self-Awareness • Phase 4B: User Intelligence • Phase 4D: DevOps • Phase 4E: Integration Hub • Phase 4F: Advanced Analytics
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
