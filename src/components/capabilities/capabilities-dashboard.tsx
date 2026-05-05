'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisionAnalyzer } from './vision-analyzer';
import { VoiceInterface } from './voice-interface';
import { VideoStudio } from './video-studio';
import { ResearchDashboard } from './research-dashboard';
import { LearningInsights } from './learning-insights';

export function CapabilitiesDashboard() {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">HOLLY's Capabilities</h1>
        <p className="text-muted-foreground">
          12 AI-powered systems at your command
        </p>
      </div>

      <Tabs defaultValue="vision" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="vision">👁️ Vision</TabsTrigger>
          <TabsTrigger value="voice">🎤 Voice</TabsTrigger>
          <TabsTrigger value="video">🎬 Video</TabsTrigger>
          <TabsTrigger value="research">🔍 Research</TabsTrigger>
          <TabsTrigger value="learning">🧠 Learning</TabsTrigger>
        </TabsList>

        <TabsContent value="vision">
          <VisionAnalyzer />
        </TabsContent>

        <TabsContent value="voice">
          <VoiceInterface />
        </TabsContent>

        <TabsContent value="video">
          <VideoStudio />
        </TabsContent>

        <TabsContent value="research">
          <ResearchDashboard />
        </TabsContent>

        <TabsContent value="learning">
          <LearningInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
}
