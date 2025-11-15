// HOLLY Capability Orchestrator - Fixed for Clerk + Prisma migration
// Routes AI requests to the appropriate capability system

import { ComputerVision } from './vision/computer-vision';
import { VoiceInterface } from './voice/voice-interface';
import { VideoGenerator } from './creativity/video-generator';
import { WebResearcher } from './research/web-researcher';
import { AdvancedAudioAnalyzer } from './audio/advanced-audio-analyzer';
import { ContextualIntelligence } from '../learning/contextual-intelligence';
import { TasteLearner } from '../learning/taste-learner';
import { PredictiveEngine } from '../creativity/predictive-engine';
import { SelfImprovement } from './consciousness/self-improvement';
import { UncensoredRouter } from './uncensored-router';
import { CollaborationAI } from './collaboration/collaboration-ai';
import { CrossProjectAI } from './collaboration/cross-project-ai';

export interface CapabilityRequest {
  type: 'vision' | 'voice' | 'video' | 'research' | 'audio' | 'contextual' | 'taste' | 'predictive' | 'selfImprove' | 'uncensored' | 'collaboration' | 'crossProject';
  input: any;
  context?: any;
  userId: string; // Required for learning systems
}

export interface CapabilityResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: any;
}

export class CapabilityOrchestrator {
  private vision: ComputerVision;
  private voice: VoiceInterface;
  private video: VideoGenerator;
  private research: WebResearcher;
  private audio: AdvancedAudioAnalyzer;
  private selfImprove: SelfImprovement;
  private uncensored: UncensoredRouter;
  private collaboration: CollaborationAI;
  private crossProject: CrossProjectAI;

  // Lazy-initialized learning systems (require userId)
  private contextual?: ContextualIntelligence;
  private taste?: TasteLearner;
  private predictive?: PredictiveEngine;
  private lastUserId?: string;

  constructor() {
    // Initialize systems that don't require userId
    this.vision = new ComputerVision();
    this.voice = new VoiceInterface();
    this.video = new VideoGenerator();
    this.research = new WebResearcher();
    this.audio = new AdvancedAudioAnalyzer();
    this.selfImprove = new SelfImprovement();
    this.uncensored = new UncensoredRouter();
    this.collaboration = new CollaborationAI();
    this.crossProject = new CrossProjectAI();
  }

  /**
   * Initialize learning systems with userId (lazy initialization)
   */
  private initializeLearning(userId: string): void {
    if (this.lastUserId !== userId) {
      this.contextual = new ContextualIntelligence(userId);
      this.taste = new TasteLearner(userId);
      this.predictive = new PredictiveEngine(userId);
      this.lastUserId = userId;
    }
  }

  /**
   * Execute a capability request
   */
  async execute(request: CapabilityRequest): Promise<CapabilityResponse> {
    try {
      // Initialize learning systems if needed
      if (['contextual', 'taste', 'predictive'].includes(request.type)) {
        if (!request.userId) {
          return {
            success: false,
            error: 'userId is required for learning capabilities'
          };
        }
        this.initializeLearning(request.userId);
      }

      // Route to appropriate capability
      switch (request.type) {
        case 'vision':
          return await this.vision.analyze(request.input, request.context);

        case 'voice':
          return await this.voice.process(request.input, request.context);

        case 'video':
          return await this.video.generate(request.input, request.context);

        case 'research':
          return await this.research.search(request.input, request.context);

        case 'audio':
          return await this.audio.analyze(request.input, request.context);

        case 'contextual':
          if (!this.contextual) {
            throw new Error('Contextual intelligence not initialized');
          }
          return await this.contextual.analyzeContext(request.input, request.context);

        case 'taste':
          if (!this.taste) {
            throw new Error('Taste learner not initialized');
          }
          return await this.taste.learn(request.input, request.context);

        case 'predictive':
          if (!this.predictive) {
            throw new Error('Predictive engine not initialized');
          }
          return await this.predictive.predict(request.input, request.context);

        case 'selfImprove':
          return await this.selfImprove.improve(request.input, request.context);

        case 'uncensored':
          return await this.uncensored.route(request.input, request.context);

        case 'collaboration':
          return await this.collaboration.collaborate(request.input, request.context);

        case 'crossProject':
          return await this.crossProject.analyze(request.input, request.context);

        default:
          return {
            success: false,
            error: `Unknown capability type: ${request.type}`
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Capability execution failed',
        metadata: {
          type: request.type,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get list of available capabilities
   */
  getCapabilities(): string[] {
    return [
      'vision',
      'voice',
      'video',
      'research',
      'audio',
      'contextual',
      'taste',
      'predictive',
      'selfImprove',
      'uncensored',
      'collaboration',
      'crossProject'
    ];
  }

  /**
   * Check if a capability is available
   */
  hasCapability(type: string): boolean {
    return this.getCapabilities().includes(type);
  }
}
