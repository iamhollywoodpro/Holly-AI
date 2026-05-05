/**
 * INTEGRATIONS DASHBOARD PANEL - Phase 4E
 * Manage external service integrations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Activity, 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Zap,
  Bell,
  Link as LinkIcon,
  RefreshCw
} from 'lucide-react';

interface Integration {
  id: string;
  service: string;
  serviceName: string;
  serviceIcon: string;
  status: string;
  authType: string;
  capabilities: string[];
  enabledFeatures: string[];
  isActive: boolean;
  lastSyncAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  createdAt: string;
}

interface AvailableService {
  id: string;
  name: string;
  icon: string;
  description: string;
  authType: string;
  capabilities: string[];
}

interface IntegrationStats {
  total: number;
  active: number;
  inactive: number;
  notificationsToday: number;
  webhooksToday: number;
}

export default function IntegrationsDashboardPanel() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [availableServices, setAvailableServices] = useState<AvailableService[]>([]);
  const [stats, setStats] = useState<IntegrationStats>({
    total: 0,
    active: 0,
    inactive: 0,
    notificationsToday: 0,
    webhooksToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedService, setSelectedService] = useState<AvailableService | null>(null);
  const [configForm, setConfigForm] = useState({
    serviceName: '',
    apiKey: '',
    webhookUrl: '',
    config: ''
  });

  // Fetch data on mount
  useEffect(() => {
    fetchIntegrations();
    fetchAvailableServices();
    fetchStats();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/admin/integrations');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    }
  };

  const fetchAvailableServices = async () => {
    try {
      const response = await fetch('/api/admin/integrations?action=services');
      if (response.ok) {
        const data = await response.json();
        setAvailableServices(data.services || []);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/integrations?action=stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIntegration = (service: AvailableService) => {
    setSelectedService(service);
    setConfigForm({
      serviceName: service.name,
      apiKey: '',
      webhookUrl: '',
      config: ''
    });
    setShowAddModal(true);
  };

  const handleSaveIntegration = async () => {
    if (!selectedService) return;

    try {
      const response = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: selectedService.id,
          serviceName: configForm.serviceName,
          serviceIcon: selectedService.icon,
          authType: selectedService.authType,
          capabilities: selectedService.capabilities,
          config: configForm.config ? JSON.parse(configForm.config) : {},
          credentials: { apiKey: configForm.apiKey },
          webhookUrl: configForm.webhookUrl
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        fetchIntegrations();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to create integration:', error);
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    try {
      const response = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          integrationId
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
    }
  };

  const handleToggleActive = async (integration: Integration) => {
    try {
      const response = await fetch('/api/admin/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: integration.id,
          isActive: !integration.isActive
        })
      });

      if (response.ok) {
        fetchIntegrations();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      const response = await fetch(`/api/admin/integrations?id=${integrationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchIntegrations();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Integrations Dashboard
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage external service connections
          </p>
        </div>
        <Button
          onClick={() => fetchIntegrations()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <LinkIcon className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p>
              <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
            </div>
            <XCircle className="w-8 h-8 text-gray-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Notifications</p>
              <p className="text-2xl font-bold text-purple-600">{stats.notificationsToday}</p>
            </div>
            <Bell className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Webhooks</p>
              <p className="text-2xl font-bold text-orange-600">{stats.webhooksToday}</p>
            </div>
            <Zap className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Available Services */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Available Services
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {availableServices.map((service) => (
            <button
              key={service.id}
              onClick={() => handleAddIntegration(service)}
              className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
            >
              <span className="text-3xl mb-2">{service.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {service.name}
              </span>
              <Plus className="w-4 h-4 text-purple-600 mt-2" />
            </button>
          ))}
        </div>
      </Card>

      {/* Active Integrations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Active Integrations
        </h3>
        {integrations.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No integrations configured yet. Add one above to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{integration.serviceIcon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {integration.serviceName}
                      </h4>
                      {getStatusIcon(integration.status)}
                      <span className={`text-sm ${getStatusColor(integration.status)}`}>
                        {integration.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {integration.authType} • {integration.capabilities.length} capabilities
                    </p>
                    {integration.lastError && (
                      <p className="text-xs text-red-600 mt-1">
                        Error: {integration.lastError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestConnection(integration.id)}
                  >
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant={integration.isActive ? 'outline' : 'default'}
                    onClick={() => handleToggleActive(integration)}
                  >
                    {integration.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteIntegration(integration.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Integration Modal */}
      {showAddModal && selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg p-6 m-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add {selectedService.name} Integration
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Service Name</Label>
                <Input
                  value={configForm.serviceName}
                  onChange={(e) => setConfigForm({ ...configForm, serviceName: e.target.value })}
                  placeholder="My Slack Integration"
                />
              </div>

              <div>
                <Label>API Key / Token</Label>
                <Input
                  type="password"
                  value={configForm.apiKey}
                  onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                />
              </div>

              <div>
                <Label>Webhook URL (optional)</Label>
                <Input
                  value={configForm.webhookUrl}
                  onChange={(e) => setConfigForm({ ...configForm, webhookUrl: e.target.value })}
                  placeholder="https://your-webhook-url.com"
                />
              </div>

              <div>
                <Label>Additional Config (JSON)</Label>
                <Textarea
                  value={configForm.config}
                  onChange={(e) => setConfigForm({ ...configForm, config: e.target.value })}
                  placeholder='{"channel": "#general"}'
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleSaveIntegration} className="flex-1">
                Add Integration
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
