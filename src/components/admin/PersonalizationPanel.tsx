'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Users, 
  Target, 
  Settings,
  Plus,
  RefreshCw,
  Palette,
  Bell,
  Star
} from 'lucide-react';

interface UserPreferences {
  id: string;
  clerkUserId: string;
  theme: string;
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  pinnedFeatures: string[];
  interests: string[];
  personalizationScore: number;
}

interface UserSegment {
  id: string;
  name: string;
  description?: string;
  segmentType: string;
  userCount: number;
  active: boolean;
  criteria: any;
}

export default function PersonalizationPanel() {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences[]>([]);
  const [segments, setSegments] = useState<UserSegment[]>([]);
  const [showCreateSegment, setShowCreateSegment] = useState(false);
  
  const [segmentForm, setSegmentForm] = useState({
    name: '',
    description: '',
    segmentType: 'behavioral',
    criteria: {
      minScore: 0,
      tags: [],
      behaviors: [],
    },
  });

  useEffect(() => {
    fetchPersonalizationData();
  }, []);

  const fetchPersonalizationData = async () => {
    setLoading(true);
    try {
      // Fetch preferences
      const prefRes = await fetch('/api/user/personalization?action=preferences');
      if (prefRes.ok) {
        const data = await prefRes.json();
        setPreferences(data.preferences || []);
      }

      // Fetch segments
      const segRes = await fetch('/api/user/personalization?action=segments');
      if (segRes.ok) {
        const data = await segRes.json();
        setSegments(data.segments || []);
      }
    } catch (error) {
      console.error('Failed to fetch personalization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSegment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_segment',
          ...segmentForm,
        }),
      });
      
      if (res.ok) {
        fetchPersonalizationData();
        setShowCreateSegment(false);
        setSegmentForm({
          name: '',
          description: '',
          segmentType: 'behavioral',
          criteria: { minScore: 0, tags: [], behaviors: [] },
        });
      }
    } catch (error) {
      console.error('Failed to create segment:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSegmentStatus = async (segmentId: string, active: boolean) => {
    try {
      await fetch('/api/user/personalization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_segment',
          segmentId,
          active: !active,
        }),
      });
      fetchPersonalizationData();
    } catch (error) {
      console.error('Failed to update segment:', error);
    }
  };

  const getSegmentTypeColor = (type: string) => {
    switch (type) {
      case 'demographic': return 'bg-blue-500';
      case 'behavioral': return 'bg-purple-500';
      case 'engagement': return 'bg-green-500';
      case 'value': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Personalization Engine</h2>
          <p className="text-muted-foreground">Manage user preferences and segments</p>
        </div>
        <Button onClick={fetchPersonalizationData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preferences.length.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">With preferences set</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Segments</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {segments.filter(s => s.active).length}
            </div>
            <p className="text-xs text-muted-foreground">Out of {segments.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Personalization</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {preferences.length > 0 
                ? (preferences.reduce((sum, p) => sum + p.personalizationScore, 0) / preferences.length).toFixed(1)
                : '0.0'
              }
            </div>
            <p className="text-xs text-muted-foreground">Score (0-100)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preferences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preferences">
            <Settings className="h-4 w-4 mr-2" />
            User Preferences
          </TabsTrigger>
          <TabsTrigger value="segments">
            <Target className="h-4 w-4 mr-2" />
            Segments
          </TabsTrigger>
        </TabsList>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Preferences</CardTitle>
              <CardDescription>Individual user personalization settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading preferences...</div>
                ) : preferences.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No user preferences yet</div>
                ) : (
                  preferences.slice(0, 20).map(pref => (
                    <div key={pref.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {pref.clerkUserId.slice(0, 12)}...
                        </code>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Score: {pref.personalizationScore.toFixed(1)}</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <Palette className="h-4 w-4 inline mr-1" />
                          <span className="text-muted-foreground">Theme:</span>
                          <span className="ml-1 font-medium capitalize">{pref.theme}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Language:</span>
                          <span className="ml-1 font-medium uppercase">{pref.language}</span>
                        </div>
                        <div>
                          <Bell className="h-4 w-4 inline mr-1" />
                          <span className="text-muted-foreground">Notifications:</span>
                          <span className="ml-1 font-medium">
                            {pref.emailNotifications ? 'Email' : ''} 
                            {pref.pushNotifications ? ' Push' : ''}
                          </span>
                        </div>
                        <div>
                          <Star className="h-4 w-4 inline mr-1" />
                          <span className="text-muted-foreground">Interests:</span>
                          <span className="ml-1 font-medium">{pref.interests.length}</span>
                        </div>
                      </div>

                      {pref.pinnedFeatures.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-sm text-muted-foreground mr-2">Pinned:</span>
                          {pref.pinnedFeatures.map(feature => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {pref.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-sm text-muted-foreground mr-2">Interests:</span>
                          {pref.interests.map(interest => (
                            <Badge key={interest} variant="outline" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          {/* Create Segment Form */}
          {showCreateSegment && (
            <Card>
              <CardHeader>
                <CardTitle>Create User Segment</CardTitle>
                <CardDescription>Define a new audience segment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Segment Name *</Label>
                    <Input 
                      value={segmentForm.name}
                      onChange={(e) => setSegmentForm({ ...segmentForm, name: e.target.value })}
                      placeholder="e.g., High Engagement Users"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Segment Type</Label>
                    <select 
                      value={segmentForm.segmentType}
                      onChange={(e) => setSegmentForm({ ...segmentForm, segmentType: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="behavioral">Behavioral</option>
                      <option value="demographic">Demographic</option>
                      <option value="engagement">Engagement</option>
                      <option value="value">Value</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={segmentForm.description}
                    onChange={(e) => setSegmentForm({ ...segmentForm, description: e.target.value })}
                    placeholder="Describe this segment..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Minimum Score</Label>
                  <Input 
                    type="number"
                    value={segmentForm.criteria.minScore}
                    onChange={(e) => setSegmentForm({
                      ...segmentForm,
                      criteria: { ...segmentForm.criteria, minScore: parseFloat(e.target.value) }
                    })}
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={createSegment} disabled={loading || !segmentForm.name}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Segment
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateSegment(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Segments List */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">User Segments</h3>
            <Button onClick={() => setShowCreateSegment(!showCreateSegment)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Segment
            </Button>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading segments...</div>
            ) : segments.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                  No segments yet. Create one to start targeting users!
                </CardContent>
              </Card>
            ) : (
              segments.map(segment => (
                <Card key={segment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5" />
                        <div>
                          <CardTitle>{segment.name}</CardTitle>
                          {segment.description && (
                            <CardDescription>{segment.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSegmentTypeColor(segment.segmentType)}>
                          {segment.segmentType}
                        </Badge>
                        <Badge variant={segment.active ? 'default' : 'secondary'}>
                          {segment.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Users className="h-4 w-4 inline mr-2" />
                        <span className="text-2xl font-bold">{segment.userCount}</span>
                        <span className="text-sm text-muted-foreground ml-2">users</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleSegmentStatus(segment.id, segment.active)}
                      >
                        {segment.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
