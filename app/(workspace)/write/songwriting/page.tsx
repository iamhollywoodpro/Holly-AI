'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mic, Loader2, Sparkles, Copy, CheckCircle } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

export default function SongwritingPage() {
  const [theme, setTheme] = useState('');
  const [style, setStyle] = useState('Pop');
  const [mood, setMood] = useState('Emotional, powerful');
  const [language, setLanguage] = useState('english');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generateLyrics = async () => {
    if (!theme) {
      setError('Please provide a theme or topic for your song.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/music/generate-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, style, mood, language }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to generate');
      setResult(data.data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.lyrics) {
      navigator.clipboard.writeText(result.lyrics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Mic className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Songwriting Studio</h1>
          <p className="text-muted-foreground mt-1">Multi-language AI lyricist, infused with authentic cultural nuance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        {/* Controls */}
        <Card className="p-5 flex flex-col gap-4 h-fit border-border/50 bg-background/50 backdrop-blur-sm">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Song Theme / Prompt</label>
            <Textarea
              placeholder="e.g. A heartbreak anthem about finding yourself in a new city..."
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="resize-none h-24"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Musical Style</label>
            <Input
              placeholder="e.g. Synthpop, R&B, Trap"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Mood</label>
            <Input
              placeholder="e.g. Melancholic, Upbeat"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="korean">Korean (K-Pop/R&B)</SelectItem>
                <SelectItem value="japanese">Japanese (J-Pop)</SelectItem>
                <SelectItem value="brazilian-portuguese">Brazilian Portuguese</SelectItem>
                <SelectItem value="french">French</SelectItem>
                <SelectItem value="hindi">Hindi</SelectItem>
                <SelectItem value="arabic">Arabic</SelectItem>
                <SelectItem value="greek">Greek</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

          <Button 
            onClick={generateLyrics} 
            disabled={loading || !theme} 
            className="w-full mt-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Writing Lyrics...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Lyrics</>
            )}
          </Button>
        </Card>

        {/* Results */}
        <Card className="p-6 min-h-[500px] border-border/50 bg-background/50 backdrop-blur-sm relative">
          {!result && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Mic className="w-12 h-12 mb-4 opacity-20" />
              <p>Your lyrics will appear here</p>
            </div>
          )}
          
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-primary">
              <Loader2 className="w-10 h-10 mb-4 animate-spin opacity-50" />
              <p className="animate-pulse">Channelling inspiration...</p>
            </div>
          )}

          {result && !loading && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {result.language}
                  </Badge>
                  <Badge variant="outline" className="opacity-70">
                    {result.provider}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8">
                  {copied ? <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div className="whitespace-pre-wrap font-mono text-[15px] leading-relaxed flex-1 overflow-y-auto pb-8 text-foreground/90 mx-auto max-w-xl self-start w-full">
                {result.lyrics}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
