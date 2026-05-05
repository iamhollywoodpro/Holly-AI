'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ResearchDashboard() {
  const [query, setQuery] = useState('');
  const [researchType, setResearchType] = useState('general');
  const [depth, setDepth] = useState('comprehensive');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const performResearch = async () => {
    if (!query) return;

    setLoading(true);
    try {
      const response = await fetch('/api/research/web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type: researchType, depth }),
      });

      const data = await response.json();
      setResult(data.research);
    } catch (error) {
      console.error('Research error:', error);
      setResult({ error: 'Research failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">🔍 Research Dashboard</h2>
          <Badge variant="outline">Brave Search API</Badge>
        </div>

        <div>
          <label className="text-sm font-medium">Research Query</label>
          <Input
            placeholder="What should I research?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Research Type</label>
            <Select value={researchType} onValueChange={setResearchType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Research</SelectItem>
                <SelectItem value="trend">Trend Analysis</SelectItem>
                <SelectItem value="competitor">Competitor Research</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Depth</label>
            <Select value={depth} onValueChange={setDepth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Quick (5 sources)</SelectItem>
                <SelectItem value="comprehensive">Comprehensive (15+ sources)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={performResearch} disabled={loading || !query} className="w-full">
          {loading ? 'Researching...' : 'Start Research'}
        </Button>

        {loading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Analyzing sources...</p>
          </div>
        )}

        {result && !loading && (
          <Card className="p-4 bg-muted max-h-96 overflow-y-auto">
            {result.error ? (
              <p className="text-destructive">{result.error}</p>
            ) : (
              <Tabs defaultValue="summary">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="sources">Sources</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-2">
                  <h3 className="font-semibold">Research Summary</h3>
                  <p className="text-sm">{result.summary || 'No summary available'}</p>
                </TabsContent>

                <TabsContent value="sources" className="space-y-2">
                  <h3 className="font-semibold">Sources ({result.sources?.length || 0})</h3>
                  {result.sources?.map((source: any, idx: number) => (
                    <div key={idx} className="p-2 bg-background rounded">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {source.title}
                      </a>
                      <p className="text-xs text-muted-foreground">{source.snippet}</p>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="insights" className="space-y-2">
                  <h3 className="font-semibold">Key Insights</h3>
                  {result.insights?.map((insight: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </Card>
        )}
      </div>
    </Card>
  );
}
