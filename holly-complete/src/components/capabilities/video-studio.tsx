'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export function VideoStudio() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoType, setVideoType] = useState('text-to-video');
  const [duration, setDuration] = useState('3');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateVideo = async () => {
    if (!prompt) return;

    setLoading(true);
    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          type: videoType,
          imageUrl: videoType === 'image-to-video' ? imageUrl : undefined,
          duration: parseInt(duration),
          fps: 24,
        }),
      });

      const data = await response.json();
      setResult(data.video);
    } catch (error) {
      console.error('Video generation error:', error);
      setResult({ error: 'Video generation failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">🎬 Video Studio</h2>
          <Badge variant="outline">Zeroscope + Stable Diffusion</Badge>
        </div>

        <div>
          <label className="text-sm font-medium">Video Type</label>
          <Select value={videoType} onValueChange={setVideoType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text-to-video">Text-to-Video</SelectItem>
              <SelectItem value="image-to-video">Image-to-Video</SelectItem>
              <SelectItem value="music-video">Music Video</SelectItem>
              <SelectItem value="social-reel">Social Reel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {videoType === 'image-to-video' && (
          <div>
            <label className="text-sm font-medium">Starting Image URL</label>
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Video Prompt</label>
          <Input
            placeholder="A cinematic shot of..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Duration (seconds)</label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 seconds</SelectItem>
              <SelectItem value="5">5 seconds</SelectItem>
              <SelectItem value="8">8 seconds</SelectItem>
              <SelectItem value="10">10 seconds</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={generateVideo} disabled={loading || !prompt} className="w-full">
          {loading ? 'Generating Video...' : 'Generate Video'}
        </Button>

        {loading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">This may take 1-2 minutes...</p>
          </div>
        )}

        {result && !loading && (
          <Card className="p-4 bg-muted">
            {result.error ? (
              <p className="text-destructive">{result.error}</p>
            ) : (
              <div className="space-y-2">
                <h3 className="font-semibold">Video Generated!</h3>
                {result.url && (
                  <video controls src={result.url} className="w-full rounded" />
                )}
                <p className="text-sm text-muted-foreground">
                  Duration: {result.duration}s | Resolution: {result.resolution}
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </Card>
  );
}
