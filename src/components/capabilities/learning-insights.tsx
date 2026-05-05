'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function LearningInsights() {
  const [tasteProfile, setTasteProfile] = useState<any>(null);
  const [selfAnalysis, setSelfAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadTasteProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/learning/taste/profile');
      const data = await response.json();
      setTasteProfile(data.profile);
    } catch (error) {
      console.error('Taste profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelfAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/learning/self-improvement/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange: '30d' }),
      });
      const data = await response.json();
      setSelfAnalysis(data.analysis);
    } catch (error) {
      console.error('Self-analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasteProfile();
    loadSelfAnalysis();
  }, []);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">🧠 Learning Insights</h2>
          <Badge variant="outline">AI Intelligence</Badge>
        </div>

        <Tabs defaultValue="taste">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="taste">Your Taste</TabsTrigger>
            <TabsTrigger value="self">My Performance</TabsTrigger>
            <TabsTrigger value="predict">Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="taste" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : tasteProfile ? (
              <div className="space-y-3">
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Design Preferences</h3>
                  {tasteProfile.preferences?.design ? (
                    <div className="space-y-1 text-sm">
                      <p>• Prefers: {tasteProfile.preferences.design.likes?.join(', ')}</p>
                      <p>• Avoids: {tasteProfile.preferences.design.dislikes?.join(', ')}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Building your design taste profile...</p>
                  )}
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Music Preferences</h3>
                  {tasteProfile.preferences?.music ? (
                    <div className="space-y-1 text-sm">
                      <p>• Prefers: {tasteProfile.preferences.music.likes?.join(', ')}</p>
                      <p>• Avoids: {tasteProfile.preferences.music.dislikes?.join(', ')}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Building your music taste profile...</p>
                  )}
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Code Style Preferences</h3>
                  {tasteProfile.preferences?.code ? (
                    <div className="space-y-1 text-sm">
                      <p>• Prefers: {tasteProfile.preferences.code.likes?.join(', ')}</p>
                      <p>• Avoids: {tasteProfile.preferences.code.dislikes?.join(', ')}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Building your code style profile...</p>
                  )}
                </Card>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No taste data yet</p>
            )}
          </TabsContent>

          <TabsContent value="self" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : selfAnalysis ? (
              <div className="space-y-3">
                <Card className="p-4 bg-green-50 dark:bg-green-950">
                  <h3 className="font-semibold mb-2 text-green-700 dark:text-green-300">My Strengths</h3>
                  <ul className="space-y-1 text-sm">
                    {selfAnalysis.strengths?.map((strength: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-4 bg-yellow-50 dark:bg-yellow-950">
                  <h3 className="font-semibold mb-2 text-yellow-700 dark:text-yellow-300">Areas to Improve</h3>
                  <ul className="space-y-1 text-sm">
                    {selfAnalysis.weaknesses?.map((weakness: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-yellow-600">→</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-4 bg-blue-50 dark:bg-blue-950">
                  <h3 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">Recent Improvements</h3>
                  <ul className="space-y-1 text-sm">
                    {selfAnalysis.improvements_made?.map((improvement: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-600">↑</span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No performance data yet</p>
            )}
          </TabsContent>

          <TabsContent value="predict" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Predictive Features Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                I'll proactively suggest concepts, anticipate your needs, and predict potential blockers
                before you even ask.
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2">
          <Button onClick={loadTasteProfile} size="sm" variant="outline">
            Refresh Taste
          </Button>
          <Button onClick={loadSelfAnalysis} size="sm" variant="outline">
            Refresh Performance
          </Button>
        </div>
      </div>
    </Card>
  );
}
