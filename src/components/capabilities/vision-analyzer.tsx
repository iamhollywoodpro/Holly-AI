'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export function VisionAnalyzer() {
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrl2, setImageUrl2] = useState('');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('analyze');

  const analyzeImage = async (analysisType: string) => {
    if (!imageUrl) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, analysisType, prompt }),
      });
      
      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Vision analysis error:', error);
      setResult({ error: 'Analysis failed' });
    } finally {
      setLoading(false);
    }
  };

  const compareImages = async () => {
    if (!imageUrl || !imageUrl2) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/vision/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl1: imageUrl, imageUrl2: imageUrl2, comparisonPrompt: prompt }),
      });
      
      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Comparison error:', error);
      setResult({ error: 'Comparison failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">👁️ Vision Analyzer</h2>
          <Badge variant="outline">GPT-4 Vision</Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analyze">Analyze Image</TabsTrigger>
            <TabsTrigger value="compare">Compare Images</TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="space-y-4">
            <div>
              <label className="text-sm font-medium">Image URL</label>
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Custom Prompt (Optional)</label>
              <Input
                placeholder="What should I focus on?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => analyzeImage('general')} disabled={loading}>
                General Analysis
              </Button>
              <Button onClick={() => analyzeImage('design-review')} disabled={loading}>
                Design Review
              </Button>
              <Button onClick={() => analyzeImage('ocr')} disabled={loading}>
                Extract Text
              </Button>
              <Button onClick={() => analyzeImage('art-style')} disabled={loading}>
                Art Style
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="compare" className="space-y-4">
            <div>
              <label className="text-sm font-medium">Image 1 URL</label>
              <Input
                type="url"
                placeholder="https://example.com/image1.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Image 2 URL</label>
              <Input
                type="url"
                placeholder="https://example.com/image2.jpg"
                value={imageUrl2}
                onChange={(e) => setImageUrl2(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Comparison Focus (Optional)</label>
              <Input
                placeholder="What should I compare?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <Button onClick={compareImages} disabled={loading} className="w-full">
              Compare Images
            </Button>
          </TabsContent>
        </Tabs>

        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {result && !loading && (
          <Card className="p-4 bg-muted">
            <h3 className="font-semibold mb-2">Analysis Result:</h3>
            <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
          </Card>
        )}
      </div>
    </Card>
  );
}
