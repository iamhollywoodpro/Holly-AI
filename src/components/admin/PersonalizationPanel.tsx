'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Users, 
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

export default function PersonalizationPanel() {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences[]>([]);

  useEffect(() => {
    fetchPersonalizationData();
  }, []);

  const fetchPersonalizationData = async () => {
    setLoading(true);
    try {
      const prefRes = await fetch('/api/user/personalization?action=preferences');
      if (prefRes.ok) {
        const data = await prefRes.json();
        setPreferences(data.preferences || []);
      }
    } catch (error) {
      console.error('Failed to fetch personalization data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Personalization Engine</h2>
          <p className="text-muted-foreground">Manage user preferences and personalization</p>
        </div>
        <Button onClick={fetchPersonalizationData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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

      <Tabs defaultValue="preferences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preferences">
            User Preferences
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}
