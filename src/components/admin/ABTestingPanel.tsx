'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  FlaskConical, 
  Plus, 
  Play, 
  Pause, 
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Target,
  BarChart3
} from 'lucide-react';

interface ABTest {
  id: string;
  name: string;
  description?: string;
  testType: string;
  status: string;
  primaryMetric: string;
  controlVariant: any;
  testVariants: any[];
  startDate?: string;
  endDate?: string;
  winner?: string;
  confidence?: number;
  stats?: {
    totalAssignments: number;
    totalConversions: number;
    conversionRate: string;
  };
}

interface VariantStats {
  variantId: string;
  variantName: string;
  assignments: number;
  exposures: number;
  exposureRate: string;
  conversions: number;
  conversionRate: string;
}

export default function ABTestingPanel() {
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState<ABTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [variantStats, setVariantStats] = useState<VariantStats[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Create form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hypothesis: '',
    testType: 'ui',
    primaryMetric: 'conversion',
    controlVariant: { id: 'control', name: 'Control', description: '' },
    testVariants: [{ id: 'variant_a', name: 'Variant A', description: '' }],
  });

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/abtest');
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestResults = async (testId: string) => {
    try {
      const res = await fetch(`/api/admin/abtest?action=results&testId=${testId}`);
      if (res.ok) {
        const data = await res.json();
        setVariantStats(data.variantStats || []);
      }
    } catch (error) {
      console.error('Failed to fetch test results:', error);
    }
  };

  const createTest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/abtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        const data = await res.json();
        setTests([data.test, ...tests]);
        setShowCreateForm(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create test:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTestStatus = async (testId: string, status: string) => {
    try {
      const updateData: any = { testId, status };
      
      if (status === 'running') {
        updateData.startDate = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.endDate = new Date().toISOString();
      }

      const res = await fetch('/api/admin/abtest', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      if (res.ok) {
        fetchTests();
      }
    } catch (error) {
      console.error('Failed to update test status:', error);
    }
  };

  const deleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;
    
    try {
      const res = await fetch(`/api/admin/abtest?testId=${testId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setTests(tests.filter(t => t.id !== testId));
        if (selectedTest?.id === testId) {
          setSelectedTest(null);
          setVariantStats([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete test:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      hypothesis: '',
      testType: 'ui',
      primaryMetric: 'conversion',
      controlVariant: { id: 'control', name: 'Control', description: '' },
      testVariants: [{ id: 'variant_a', name: 'Variant A', description: '' }],
    });
  };

  const addVariant = () => {
    const newId = `variant_${String.fromCharCode(65 + formData.testVariants.length)}`;
    setFormData({
      ...formData,
      testVariants: [
        ...formData.testVariants,
        { id: newId, name: `Variant ${String.fromCharCode(65 + formData.testVariants.length)}`, description: '' }
      ],
    });
  };

  const removeVariant = (index: number) => {
    setFormData({
      ...formData,
      testVariants: formData.testVariants.filter((_, i) => i !== index),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'draft': return 'bg-gray-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const viewTestDetails = (test: ABTest) => {
    setSelectedTest(test);
    fetchTestResults(test.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">A/B Testing</h2>
          <p className="text-muted-foreground">Create and manage A/B tests</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Test
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New A/B Test</CardTitle>
            <CardDescription>Define your test hypothesis and variants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Test Name *</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Homepage CTA Button Color"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Test Type</Label>
                <select 
                  value={formData.testType}
                  onChange={(e) => setFormData({ ...formData, testType: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="ui">UI</option>
                  <option value="feature">Feature</option>
                  <option value="content">Content</option>
                  <option value="algorithm">Algorithm</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what you're testing..."
              />
            </div>

            <div className="space-y-2">
              <Label>Hypothesis</Label>
              <Textarea 
                value={formData.hypothesis}
                onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
                placeholder="If we change X, then Y will happen because Z..."
              />
            </div>

            <div className="space-y-2">
              <Label>Primary Metric *</Label>
              <Input 
                value={formData.primaryMetric}
                onChange={(e) => setFormData({ ...formData, primaryMetric: e.target.value })}
                placeholder="e.g., conversion, click_rate, signup"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Variants</h4>
                <Button variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>

              <div className="space-y-3">
                {/* Control */}
                <div className="border rounded-lg p-3 bg-muted">
                  <Label className="text-sm font-semibold mb-2 block">Control (Baseline)</Label>
                  <Input 
                    value={formData.controlVariant.description}
                    onChange={(e) => setFormData({
                      ...formData,
                      controlVariant: { ...formData.controlVariant, description: e.target.value }
                    })}
                    placeholder="Describe the control variant..."
                    className="bg-white"
                  />
                </div>

                {/* Test Variants */}
                {formData.testVariants.map((variant, index) => (
                  <div key={variant.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold">{variant.name}</Label>
                      {formData.testVariants.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeVariant(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Input 
                      value={variant.description}
                      onChange={(e) => {
                        const newVariants = [...formData.testVariants];
                        newVariants[index].description = e.target.value;
                        setFormData({ ...formData, testVariants: newVariants });
                      }}
                      placeholder="Describe this variant..."
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={createTest} disabled={loading || !formData.name || !formData.primaryMetric}>
                <FlaskConical className="h-4 w-4 mr-2" />
                Create Test
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tests List */}
      <div className="grid gap-4">
        {loading && !showCreateForm ? (
          <div className="text-center py-8 text-muted-foreground">Loading tests...</div>
        ) : tests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No A/B tests yet. Create one to get started!
            </CardContent>
          </Card>
        ) : (
          tests.map(test => (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="h-5 w-5" />
                    <div>
                      <CardTitle>{test.name}</CardTitle>
                      <CardDescription>{test.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(test.status)}>
                      {test.status}
                    </Badge>
                    <Badge variant="outline">{test.testType}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Primary Metric:</span>
                    <div className="font-medium">{test.primaryMetric}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Variants:</span>
                    <div className="font-medium">1 control + {test.testVariants.length} test</div>
                  </div>
                  {test.stats && (
                    <div>
                      <span className="text-muted-foreground">Conversion Rate:</span>
                      <div className="font-medium">{test.stats.conversionRate}</div>
                    </div>
                  )}
                </div>

                {test.winner && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-semibold">Winner: {test.winner}</span>
                      {test.confidence && (
                        <span className="text-sm">({(test.confidence * 100).toFixed(1)}% confidence)</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => viewTestDetails(test)}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Results
                  </Button>

                  {test.status === 'draft' && (
                    <Button 
                      size="sm"
                      onClick={() => updateTestStatus(test.id, 'running')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Test
                    </Button>
                  )}

                  {test.status === 'running' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateTestStatus(test.id, 'paused')}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => updateTestStatus(test.id, 'completed')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    </>
                  )}

                  {test.status === 'paused' && (
                    <Button 
                      size="sm"
                      onClick={() => updateTestStatus(test.id, 'running')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                  )}

                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteTest(test.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Test Results Modal */}
      {selectedTest && variantStats.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Results: {selectedTest.name}</CardTitle>
            <CardDescription>Variant performance comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {variantStats.map(variant => (
                <div key={variant.variantId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{variant.variantName}</h4>
                    <Badge variant="outline">{variant.variantId}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Assignments</div>
                      <div className="text-xl font-bold">{variant.assignments}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Exposures</div>
                      <div className="text-xl font-bold">{variant.exposures}</div>
                      <div className="text-xs text-muted-foreground">{variant.exposureRate}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Conversions</div>
                      <div className="text-xl font-bold">{variant.conversions}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Conv. Rate</div>
                      <div className="text-xl font-bold text-green-600">{variant.conversionRate}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => { setSelectedTest(null); setVariantStats([]); }}
              className="mt-4"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
