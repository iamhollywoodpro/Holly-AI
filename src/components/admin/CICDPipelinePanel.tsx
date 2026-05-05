'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  CheckCircle, 
  XCircle, 
  Clock,
  RotateCcw,
  Plus,
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';

interface Deployment {
  id: string;
  deploymentId: string;
  environment: string;
  platform: string;
  commitSha: string;
  branch: string;
  status: string;
  deployType: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  deploymentUrl?: string;
  errorRate?: number;
  healthCheckPassed?: boolean;
}

export default function CICDPipelinePanel() {
  const [loading, setLoading] = useState(false);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [stats, setStats] = useState({ total: 0, successful: 0, failed: 0, pending: 0 });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [envFilter, setEnvFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    environment: 'production',
    platform: 'vercel',
    commitSha: '',
    branch: 'main',
    deployType: 'standard',
  });

  useEffect(() => {
    fetchDeployments();
  }, [envFilter]);

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      const url = envFilter === 'all' 
        ? '/api/admin/cicd'
        : `/api/admin/cicd?environment=${envFilter}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDeployments(data.deployments || []);
        setStats(data.stats || { total: 0, successful: 0, failed: 0, pending: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDeployment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cicd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        fetchDeployments();
        setShowCreateForm(false);
        setFormData({ environment: 'production', platform: 'vercel', commitSha: '', branch: 'main', deployType: 'standard' });
      }
    } catch (error) {
      console.error('Failed to create deployment:', error);
    } finally {
      setLoading(false);
    }
  };

  const rollback = async (deploymentId: string) => {
    if (!confirm('Are you sure you want to rollback this deployment?')) return;
    
    try {
      const res = await fetch('/api/admin/cicd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback', deploymentId }),
      });
      
      if (res.ok) {
        fetchDeployments();
      }
    } catch (error) {
      console.error('Failed to rollback deployment:', error);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'deploying':
      case 'pending':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'deploying': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CI/CD Pipeline</h2>
          <p className="text-muted-foreground">Manage deployments and track status</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchDeployments} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4 mr-2" />
            New Deployment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deployments</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.successful / stats.total) * 100).toFixed(1)}%` : '0%'} success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Active deployments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Environment:</span>
        <select 
          value={envFilter}
          onChange={(e) => setEnvFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="all">All Environments</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
        </select>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Deployment</CardTitle>
            <CardDescription>Deploy to an environment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Environment *</Label>
                <select 
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>Platform</Label>
                <select 
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="vercel">Vercel</option>
                  <option value="netlify">Netlify</option>
                  <option value="aws">AWS</option>
                  <option value="heroku">Heroku</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commit SHA *</Label>
                <Input 
                  value={formData.commitSha}
                  onChange={(e) => setFormData({ ...formData, commitSha: e.target.value })}
                  placeholder="e.g., abc123def"
                />
              </div>

              <div className="space-y-2">
                <Label>Branch *</Label>
                <Input 
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  placeholder="e.g., main"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deploy Type</Label>
              <select 
                value={formData.deployType}
                onChange={(e) => setFormData({ ...formData, deployType: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="standard">Standard</option>
                <option value="hotfix">Hotfix</option>
                <option value="canary">Canary</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={createDeployment} disabled={loading || !formData.commitSha || !formData.branch}>
                <Rocket className="h-4 w-4 mr-2" />
                Deploy
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deployments List */}
      <div className="space-y-4">
        {loading && !showCreateForm ? (
          <div className="text-center py-8 text-muted-foreground">Loading deployments...</div>
        ) : deployments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No deployments yet. Create one to get started!
            </CardContent>
          </Card>
        ) : (
          deployments.map(deployment => (
            <Card key={deployment.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(deployment.status)}
                      <div>
                        <div className="font-semibold">{deployment.environment}</div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {deployment.commitSha.substring(0, 8)}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(deployment.status)}>
                        {deployment.status}
                      </Badge>
                      <Badge variant="outline">{deployment.platform}</Badge>
                      <Badge variant="outline">{deployment.deployType}</Badge>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Branch</div>
                      <div className="font-medium">{deployment.branch}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Duration</div>
                      <div className="font-medium">{formatDuration(deployment.duration)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Started</div>
                      <div className="font-medium">
                        {new Date(deployment.startedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    {deployment.errorRate !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Error Rate</div>
                        <div className="font-medium">{deployment.errorRate.toFixed(2)}%</div>
                      </div>
                    )}
                  </div>

                  {/* Health Check */}
                  {deployment.healthCheckPassed !== undefined && (
                    <div className={`border rounded p-2 text-sm ${
                      deployment.healthCheckPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      {deployment.healthCheckPassed ? (
                        <span className="text-green-700">✓ Health checks passed</span>
                      ) : (
                        <span className="text-red-700">✗ Health checks failed</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {deployment.deploymentUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(deployment.deploymentUrl, '_blank')}
                      >
                        View Deployment
                      </Button>
                    )}
                    {deployment.status === 'success' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => rollback(deployment.deploymentId)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Rollback
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
