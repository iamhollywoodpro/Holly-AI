/**
 * Capability Orchestrator
 * Integrates all 12 new capability systems with HOLLY's main AI
 */

import { ComputerVision } from '@/lib/vision/computer-vision';
import { VoiceInterface } from '@/lib/voice/voice-interface';
import { VideoGenerator } from '@/lib/video/video-generator';
import { WebResearcher } from '@/lib/research/web-researcher';
import { AdvancedAudioAnalyzer } from '@/lib/audio/advanced-audio-analyzer';
import { ContextualIntelligence } from '@/lib/learning/contextual-intelligence';
import { TasteLearner } from '@/lib/learning/taste-learner';
import { PredictiveEngine } from '@/lib/creativity/predictive-engine';
import { SelfImprovement } from '@/lib/learning/self-improvement';
import { UncensoredRouter } from '@/lib/ai/uncensored-router';
import { CollaborationAI } from '@/lib/interaction/collaboration-ai';
import { CrossProjectAI } from '@/lib/learning/cross-project-ai';

export type CapabilityType =
  | 'vision'
  | 'voice'
  | 'video'
  | 'research'
  | 'audio-analysis'
  | 'contextual'
  | 'taste'
  | 'predictive'
  | 'self-improve'
  | 'uncensored'
  | 'collaboration'
  | 'cross-project';

export interface CapabilityRequest {
  capability: CapabilityType;
  action: string;
  parameters: Record<string, any>;
  context?: Record<string, any>;
}

export interface CapabilityResponse {
  success: boolean;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export class CapabilityOrchestrator {
  private vision: ComputerVision;
  private voice: VoiceInterface;
  private video: VideoGenerator;
  private research: WebResearcher;
  private audio: AdvancedAudioAnalyzer;
  private contextual: ContextualIntelligence;
  private taste: TasteLearner;
  private predictive: PredictiveEngine;
  private selfImprove: SelfImprovement;
  private uncensored: UncensoredRouter;
  private collaboration: CollaborationAI;
  private crossProject: CrossProjectAI;

  constructor() {
    this.vision = new ComputerVision();
    this.voice = new VoiceInterface();
    this.video = new VideoGenerator();
    this.research = new WebResearcher();
    this.audio = new AdvancedAudioAnalyzer();
    this.contextual = new ContextualIntelligence();
    this.taste = new TasteLearner();
    this.predictive = new PredictiveEngine();
    this.selfImprove = new SelfImprovement();
    this.uncensored = new UncensoredRouter();
    this.collaboration = new CollaborationAI();
    this.crossProject = new CrossProjectAI();
  }

  /**
   * Route a capability request to the appropriate system
   */
  async execute(request: CapabilityRequest): Promise<CapabilityResponse> {
    try {
      let result;

      switch (request.capability) {
        case 'vision':
          result = await this.handleVision(request.action, request.parameters);
          break;
        case 'voice':
          result = await this.handleVoice(request.action, request.parameters);
          break;
        case 'video':
          result = await this.handleVideo(request.action, request.parameters);
          break;
        case 'research':
          result = await this.handleResearch(request.action, request.parameters);
          break;
        case 'audio-analysis':
          result = await this.handleAudio(request.action, request.parameters);
          break;
        case 'contextual':
          result = await this.handleContextual(request.action, request.parameters);
          break;
        case 'taste':
          result = await this.handleTaste(request.action, request.parameters);
          break;
        case 'predictive':
          result = await this.handlePredictive(request.action, request.parameters);
          break;
        case 'self-improve':
          result = await this.handleSelfImprove(request.action, request.parameters);
          break;
        case 'uncensored':
          result = await this.handleUncensored(request.action, request.parameters);
          break;
        case 'collaboration':
          result = await this.handleCollaboration(request.action, request.parameters);
          break;
        case 'cross-project':
          result = await this.handleCrossProject(request.action, request.parameters);
          break;
        default:
          throw new Error(`Unknown capability: ${request.capability}`);
      }

      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async handleVision(action: string, params: any) {
    switch (action) {
      case 'analyze':
        return await this.vision.analyzeImage({ imageUrl: params.imageUrl, prompt: params.prompt });
      case 'compare':
        return await this.vision.compareImages(params.imageUrl1, params.imageUrl2, params.prompt);
      case 'design-review':
        return await this.vision.reviewDesign(params.imageUrl, params.prompt);
      case 'ocr':
        return await this.vision.extractText(params.imageUrl);
      case 'art-style':
        return await this.vision.analyzeArtStyle(params.imageUrl);
      default:
        throw new Error(`Unknown vision action: ${action}`);
    }
  }

  private async handleVoice(action: string, params: any) {
    switch (action) {
      case 'transcribe':
        return await this.voice.transcribe(params.audio);
      case 'speak':
        return await this.voice.speak(params.text, { voice: params.voice, speed: params.speed });
      case 'command':
        // TODO: Implement voice command processing
        throw new Error('Voice command processing not yet implemented');
      default:
        throw new Error(`Unknown voice action: ${action}`);
    }
  }

  private async handleVideo(action: string, params: any) {
    switch (action) {
      case 'text-to-video':
        return await this.video.generateTextToVideo({ prompt: params.prompt, ...params.options });
      case 'image-to-video':
        return await this.video.generateImageToVideo(params.imageUrl, params.prompt, params.motion || 'medium');
      case 'music-video':
        return await this.video.createMusicVideo(params);
      case 'social-reel':
        return await this.video.createSocialReel(params);
      default:
        throw new Error(`Unknown video action: ${action}`);
    }
  }

  private async handleResearch(action: string, params: any) {
    switch (action) {
      case 'general':
        return await this.research.researchTopic(params.query, params.context);
      case 'trends':
        return await this.research.trackTrendingTopics(params.category || params.query);
      case 'competitor':
        return await this.research.researchCompetitors(params.artistName, params.genre);
      default:
        throw new Error(`Unknown research action: ${action}`);
    }
  }

  private async handleAudio(action: string, params: any) {
    switch (action) {
      case 'complete':
        return await this.audio.analyzeAudio({ audioUrl: params.audioUrl, analysisType: 'full' });
      case 'mix':
        return await this.audio.analyzeMixQuality(params.audioBuffer);
      case 'mastering':
        return await this.audio.checkMastering(params.audioUrl);
      case 'vocals':
        return await this.audio.analyzeVocalPerformance(params.audioUrl);
      case 'hit-factor':
        // First get analysis, then calculate hit factor
        const analysis = await this.audio.analyzeAudio({ audioUrl: params.audioUrl, analysisType: 'full' });
        return this.audio.calculateHitFactor(analysis);
      default:
        throw new Error(`Unknown audio action: ${action}`);
    }
  }

  private async handleContextual(action: string, params: any) {
    switch (action) {
      case 'track':
        return await this.contextual.trackActivity(params.projectId, params.activity);
      case 'context':
        return await this.contextual.getProjectContext(params.projectId);
      case 'patterns':
        return await this.contextual.detectPatterns(params.userId);
      default:
        throw new Error(`Unknown contextual action: ${action}`);
    }
  }

  private async handleTaste(action: string, params: any) {
    switch (action) {
      case 'track':
        return await this.taste.recordTasteSignal(params.userId, {
          type: params.userAction,
          category: params.category,
          item: params.item,
          context: params.context,
          timestamp: new Date()
        });
      case 'predict':
        return await this.taste.predictPreference(params.userId, params.item, params.category);
      case 'profile':
        return await this.taste.initializeTasteProfile(params.userId);
      default:
        throw new Error(`Unknown taste action: ${action}`);
    }
  }

  private async handlePredictive(action: string, params: any) {
    switch (action) {
      case 'concepts':
        return await this.predictive.generateDraftConcepts(params.userId);
      case 'needs':
        return await this.predictive.predictNextNeeds(params.userId);
      case 'blockers':
        return await this.predictive.anticipateBlockers(params.userId);
      default:
        throw new Error(`Unknown predictive action: ${action}`);
    }
  }

  private async handleSelfImprove(action: string, params: any) {
    switch (action) {
      case 'analyze':
        return await this.selfImprove.analyzePerformance(params.userId);
      case 'learn':
        return await this.selfImprove.learnNewSkill(params.skillArea);
      case 'optimize':
        return await this.selfImprove.optimizeWorkflow(params.workflowId);
      default:
        throw new Error(`Unknown self-improve action: ${action}`);
    }
  }

  private async handleUncensored(action: string, params: any) {
    switch (action) {
      case 'route':
        return await this.uncensored.routeRequest({ 
          type: params.type || 'text', 
          content: params.content || params.prompt, 
          adult: params.adult || false 
        });
      default:
        throw new Error(`Unknown uncensored action: ${action}`);
    }
  }

  private async handleCollaboration(action: string, params: any) {
    switch (action) {
      case 'detect':
        return await this.collaboration.detectUserConfidence(params.interaction);
      case 'adapt':
        return await this.collaboration.adaptLeadershipStyle(params.confidence);
      default:
        throw new Error(`Unknown collaboration action: ${action}`);
    }
  }

  private async handleCrossProject(action: string, params: any) {
    switch (action) {
      case 'patterns':
        return await this.crossProject.findCrossDomainPatterns(params.domain1, params.domain2);
      case 'transfer':
        return await this.crossProject.transferSuccessfulApproach(params.sourceProject, params.targetDomain);
      default:
        throw new Error(`Unknown cross-project action: ${action}`);
    }
  }

  /**
   * Detect which capability is needed based on user intent
   */
  detectCapabilityNeeded(userMessage: string): CapabilityType | null {
    const message = userMessage.toLowerCase();

    // Vision detection
    if (message.includes('image') || message.includes('design') || message.includes('look at') || message.includes('see')) {
      return 'vision';
    }

    // Voice detection
    if (message.includes('say') || message.includes('speak') || message.includes('listen') || message.includes('hear')) {
      return 'voice';
    }

    // Video detection
    if (message.includes('video') || message.includes('animate') || message.includes('motion')) {
      return 'video';
    }

    // Research detection
    if (message.includes('research') || message.includes('find out') || message.includes('look up') || message.includes('trends')) {
      return 'research';
    }

    // Audio analysis detection
    if (message.includes('analyze audio') || message.includes('mix quality') || message.includes('master') || message.includes('vocals')) {
      return 'audio-analysis';
    }

    return null;
  }
}
