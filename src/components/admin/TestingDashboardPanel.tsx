'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  TestTube, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  Plus,
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';

interface TestSuite {
  id: string;
  name: string;
  description?: string;
  suiteType: string;
  framework: string;
  enabled: boolean;
  lastRun?: string;
  totalTests: number;
  passingTests: number;
  failingTests: number;
  runs?: TestRun[];
}

interface TestRun {
  id: string;
  runNumber: number;
  status: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coveragePercent?: number;
  duration?: number;
  startedAt: string;
  completedAt?: string;
}

export default function TestingDashboardPanel() {
  const [loading, setLoading] = useState(false);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    suiteType: 'unit',
    framework: 'jest',
    minCoverage: 80,
  });

  useEffect(() => {
    fetchSuites();
  }, []);

  const fetchSuites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/testing');
      if (res.ok) {
        const data = await res.json();
        setSuites(data.suites || []);
      }
    } catch (error) {
      console.error('Failed to fetch test suites:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSuite = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        fetchSuites();
        setShowCreateForm(false);
        setFormData({ name: '', description: '', suiteType: 'unit', framework: 'jest', minCoverage: 80 });
      }
    } catch (error) {
      console.error('Failed to create test suite:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTests = async (suiteId: string) => {
    try {
      const res = await fetch('/api/admin/testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_tests', suiteId }),
      });
      
      if (res.ok) {
        setTimeout(fetchSuites, 5000); // Refresh after 5 seconds
      }
    } catch (error) {
      console.error('Failed to run tests:', error);
    }
  };

  const viewRuns = async (suite: TestSuite) => {
    setSelectedSuite(suite);
    try {
      const res = await fetch(`/api/admin/testing?action=runs&suiteId=${suite.id}`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      }
    } catch (error) {
      console.error('Failed to fetch test runs:', error);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const stats = {
    totalSuites: suites.length,
    enabledSuites: suites.filter(s => s.enabled).length,
    totalTests: suites.reduce((sum, s) => sum + s.totalTests, 0),
    passingTests: suites.reduce((sum, s) => sum + s.passingTests, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Automated Testing</h2>
          <p className="text-muted-foreground">Manage test suites and track coverage</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchSuites} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Suite
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Suites</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSuites}</div>
            <p className="text-xs text-muted-foreground">{stats.enabledSuites} enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTests}</div>
            <p className="text-xs text-muted-foreground">Across all suites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passing</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.passingTests}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTests > 0 ? `${((stats.passingTests / stats.totalTests) * 100).toFixed(1)}%` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTests > 0 ? `${((stats.passingTests / stats.totalTests) * 100).toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">Overall success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Test Suite</CardTitle>
            <CardDescription>Set up a new automated test suite</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Suite Name *</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Unit Tests"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Framework</Label>
                <select 
                  value={formData.framework}
                  onChange={(e) => setFormData({ ...formData, framework: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="jest">Jest</option>
                  <option value="vitest">Vitest</option>
                  <option value="playwright">Playwright</option>
                  <option value="cypress">Cypress</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this test suite..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Suite Type</Label>
                <select 
                  value={formData.suiteType}
                  onChange={(e) => setFormData({ ...formData, suiteType: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="unit">Unit</option>
                  <option value="integration">Integration</option>
                  <option value="e2e">E2E</option>
                  <option value="performance">Performance</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Min Coverage (%)</Label>
                <Input 
                  type="number"
                  value={formData.minCoverage}
                  onChange={(e) => setFormData({ ...formData, minCoverage: parseInt(e.target.value) })}
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={createSuite} disabled={loading || !formData.name}>
                <TestTube className="h-4 w-4 mr-2" />
                Create Suite
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Suites List */}
      <div className="grid gap-4">
        {loading && !showCreateForm ? (
          <div className="text-center py-8 text-muted-foreground">Loading test suites...</div>
        ) : suites.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No test suites yet. Create one to get started!
            </CardContent>
          </Card>
        ) : (
          suites.map(suite => (
            <Card key={suite.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TestTube className="h-5 w-5" />
                    <div>
                      <CardTitle>{suite.name}</CardTitle>
                      {suite.description && (
                        <CardDescription>{suite.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{suite.framework}</Badge>
                    <Badge variant="outline">{suite.suiteType}</Badge>
                    <Badge variant={suite.enabled ? 'default' : 'secondary'}>
                      {suite.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Latest Run */}
                {suite.runs && suite.runs.length > 0 && (
                  <div className="border rounded-lg p-3 bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Latest Run</span>
                      {getStatusIcon(suite.runs[0].status)}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total</div>
                        <div className="font-semibold">{suite.runs[0].totalTests}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Passed</div>
                        <div className="font-semibold text-green-600">{suite.runs[0].passedTests}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Failed</div>
                        <div className="font-semibold text-red-600">{suite.runs[0].failedTests}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Coverage</div>
                        <div className="font-semibold">
                          {suite.runs[0].coveragePercent ? `${suite.runs[0].coveragePercent.toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Tests</div>
                    <div className="text-xl font-bold">{suite.totalTests}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Passing</div>
                    <div className="text-xl font-bold text-green-600">{suite.passingTests}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Failing</div>
                    <div className="text-xl font-bold text-red-600">{suite.failingTests}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm"
                    onClick={() => runTests(suite.id)}
                    disabled={!suite.enabled}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Tests
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => viewRuns(suite)}
                  >
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Test Runs Modal */}
      {selectedSuite && runs.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Test Runs: {selectedSuite.name}</CardTitle>
              <Button variant="outline" onClick={() => { setSelectedSuite(null); setRuns([]); }}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {runs.map(run => (
                <div key={run.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(run.status)}
                    <div>
                      <div className="font-semibold">Run #{run.runNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(run.startedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{run.passedTests}/{run.totalTests} passed</div>
                    <div className="text-muted-foreground">{formatDuration(run.duration)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
