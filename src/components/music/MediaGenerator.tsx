'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Video, Sparkles } from 'lucide-react';

export function MediaGenerator() {
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  const [albumCoverData, setAlbumCoverData] = useState({
    trackTitle: '',
    artist: '',
    genre: '',
    mood: '',
    style: 'modern'
  });

  const generateAlbumCover = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/media/album-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(albumCoverData)
      });
      
      const data = await response.json();
      setGeneratedImage(data.imageUrl);
    } catch (error) {
      console.error('Failed to generate:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Media Generator</CardTitle>
          <CardDescription>
            Create album covers, social media posts, and video concepts with AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="album-cover">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="album-cover">
                <Image className="h-4 w-4 mr-2" />
                Album Cover
              </TabsTrigger>
              <TabsTrigger value="social-media">
                <Sparkles className="h-4 w-4 mr-2" />
                Social Media
              </TabsTrigger>
              <TabsTrigger value="video-concept">
                <Video className="h-4 w-4 mr-2" />
                Video Concept
              </TabsTrigger>
            </TabsList>

            <TabsContent value="album-cover" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="trackTitle">Track Title</Label>
                  <Input
                    id="trackTitle"
                    placeholder="Enter track title"
                    value={albumCoverData.trackTitle}
                    onChange={(e) => setAlbumCoverData({...albumCoverData, trackTitle: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="artist">Artist Name</Label>
                  <Input
                    id="artist"
                    placeholder="Enter artist name"
                    value={albumCoverData.artist}
                    onChange={(e) => setAlbumCoverData({...albumCoverData, artist: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    placeholder="e.g., Hip-Hop, Electronic"
                    value={albumCoverData.genre}
                    onChange={(e) => setAlbumCoverData({...albumCoverData, genre: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="mood">Mood</Label>
                  <Input
                    id="mood"
                    placeholder="e.g., Dark, Energetic, Dreamy"
                    value={albumCoverData.mood}
                    onChange={(e) => setAlbumCoverData({...albumCoverData, mood: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="style">Style</Label>
                  <Select
                    value={albumCoverData.style}
                    onValueChange={(value) => setAlbumCoverData({...albumCoverData, style: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimalist">Minimalist</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="photographic">Photographic</SelectItem>
                      <SelectItem value="abstract">Abstract</SelectItem>
                      <SelectItem value="retro">Retro</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={generateAlbumCover} 
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? 'Generating...' : 'Generate Album Cover'}
                </Button>

                {generatedImage && (
                  <div className="mt-4">
                    <img 
                      src={generatedImage} 
                      alt="Generated album cover" 
                      className="w-full rounded-lg border"
                    />
                    <Button variant="outline" className="w-full mt-2">
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="social-media" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate eye-catching social media posts for Instagram, TikTok, Twitter, and Facebook.
              </p>
              <Button className="w-full">Coming Soon</Button>
            </TabsContent>

            <TabsContent value="video-concept" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get AI-generated music video concepts with scene breakdowns and budget estimates.
              </p>
              <Button className="w-full">Coming Soon</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Providers</CardTitle>
          <CardDescription>Available image generation services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded border">
              <div>
                <p className="font-medium">DALL-E 3 (OpenAI)</p>
                <p className="text-sm text-muted-foreground">High quality, photorealistic</p>
              </div>
              <span className="text-sm text-green-600">Active</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded border opacity-50">
              <div>
                <p className="font-medium">Midjourney</p>
                <p className="text-sm text-muted-foreground">Artistic, creative</p>
              </div>
              <span className="text-sm text-muted-foreground">Coming Soon</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded border opacity-50">
              <div>
                <p className="font-medium">Stable Diffusion</p>
                <p className="text-sm text-muted-foreground">Open source, flexible</p>
              </div>
              <span className="text-sm text-muted-foreground">Coming Soon</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
