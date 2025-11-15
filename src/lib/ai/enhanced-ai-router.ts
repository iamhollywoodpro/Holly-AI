/**
 * Enhanced AI Router
 * Integrates all 12 new capabilities into HOLLY's decision-making
 */

import { CapabilityOrchestrator, CapabilityType } from './capability-orchestrator';

export interface AIRequest {
  message: string;
  conversationHistory?: any[];
  context?: Record<string, any>;
  files?: any[];
}

export interface AIResponse {
  message: string;
  capabilityUsed?: CapabilityType;
  capabilityResult?: any;
  requiresFollowUp?: boolean;
  suggestions?: string[];
}

export class EnhancedAIRouter {
  private orchestrator: CapabilityOrchestrator;

  constructor() {
    this.orchestrator = new CapabilityOrchestrator();
  }

  /**
   * Main routing logic - decides what capabilities to use
   */
  async route(request: AIRequest): Promise<AIResponse> {
    const { message, conversationHistory, context } = request;

    // Detect if a specific capability is needed
    const capability = this.orchestrator.detectCapabilityNeeded(message);

    if (capability) {
      // Extract parameters from the message
      const parameters = this.extractParameters(message, capability);

      // Execute the capability with correct API signature
      const result = await this.orchestrator.execute({
        type: capability,
        input: { message, action: parameters.action, ...parameters.params },
        context,
        userId: context?.userId || 'default-user', // Use userId from context or default
      });

      if (result.success) {
        return {
          message: this.formatCapabilityResponse(capability, result.data),
          capabilityUsed: capability,
          capabilityResult: result.data,
          suggestions: this.generateSuggestions(capability),
        };
      } else {
        return {
          message: `I tried to use my ${capability} capabilities, but encountered an error: ${result.error}`,
          capabilityUsed: capability,
        };
      }
    }

    // If no specific capability detected, return null to use standard AI chat
    return {
      message: '', // Will be filled by main AI
      requiresFollowUp: true,
    };
  }

  /**
   * Extract parameters from user message for capability execution
   */
  private extractParameters(message: string, capability: CapabilityType): { action: string; params: any } {
    const params: any = {};
    let action = 'general';

    switch (capability) {
      case 'vision':
        if (message.includes('compare')) {
          action = 'compare';
        } else if (message.includes('design') || message.includes('review')) {
          action = 'design-review';
        } else if (message.includes('text') || message.includes('read')) {
          action = 'ocr';
        } else if (message.includes('style') || message.includes('art')) {
          action = 'art-style';
        } else {
          action = 'analyze';
        }
        break;

      case 'voice':
        if (message.includes('say') || message.includes('speak')) {
          action = 'speak';
        } else if (message.includes('listen') || message.includes('hear') || message.includes('transcribe')) {
          action = 'transcribe';
        } else {
          action = 'command';
        }
        break;

      case 'video':
        if (message.includes('music video')) {
          action = 'music-video';
        } else if (message.includes('reel') || message.includes('social')) {
          action = 'social-reel';
        } else if (message.includes('from image')) {
          action = 'image-to-video';
        } else {
          action = 'text-to-video';
        }
        break;

      case 'research':
        if (message.includes('trend')) {
          action = 'trends';
        } else if (message.includes('competitor')) {
          action = 'competitor';
        } else {
          action = 'general';
        }
        params.depth = message.includes('quick') ? 'quick' : 'comprehensive';
        break;

      case 'audio':
        if (message.includes('mix')) {
          action = 'mix';
        } else if (message.includes('master')) {
          action = 'mastering';
        } else if (message.includes('vocal')) {
          action = 'vocals';
        } else if (message.includes('hit factor')) {
          action = 'hit-factor';
        } else {
          action = 'complete';
        }
        break;
    }

    return { action, params };
  }

  /**
   * Format capability results into natural language
   */
  private formatCapabilityResponse(capability: CapabilityType, result: any): string {
    switch (capability) {
      case 'vision':
        return `Here's what I see: ${result.analysis || JSON.stringify(result)}`;
      
      case 'voice':
        if (result.text) {
          return `I heard: "${result.text}"`;
        }
        return 'Audio processed successfully.';
      
      case 'video':
        return `Video generated! ${result.url ? `You can view it at: ${result.url}` : ''}`;
      
      case 'research':
        return `Research complete! ${result.summary || 'Found relevant information.'}`;
      
      case 'audio':
        return `Audio analysis complete. Overall score: ${result.overall_score || 'N/A'}/10`;
      
      default:
        return 'Task completed successfully!';
    }
  }

  /**
   * Generate helpful suggestions based on capability used
   */
  private generateSuggestions(capability: CapabilityType): string[] {
    const suggestions: Record<CapabilityType, string[]> = {
      vision: [
        'Want me to compare this with another image?',
        'Should I analyze the design more deeply?',
        'Would you like me to extract any text from this image?',
      ],
      voice: [
        'Want me to speak this in a different voice?',
        'Should I transcribe another audio file?',
        'Would you like me to process a voice command?',
      ],
      video: [
        'Want to generate a longer video?',
        'Should I create a music video version?',
        'Would you like to turn this into a social media reel?',
      ],
      research: [
        'Want me to research a related topic?',
        'Should I analyze the trends in this area?',
        'Would you like competitor analysis?',
      ],
      audio: [
        'Want me to analyze the mix quality?',
        'Should I check the mastering?',
        'Would you like me to calculate a hit factor score?',
      ],
      contextual: [],
      taste: [],
      predictive: [],
      selfImprove: [],
      uncensored: [],
      collaboration: [],
      crossProject: [],
    };

    return suggestions[capability] || [];
  }

  /**
   * Check if message requires proactive capability suggestion
   */
  shouldSuggestCapability(message: string): { capability: CapabilityType; reason: string } | null {
    // Vision suggestions
    if (message.includes('show') || message.includes('display')) {
      return {
        capability: 'vision',
        reason: 'It looks like you want to show me something. I can analyze images if you provide a URL!',
      };
    }

    // Research suggestions
    if (message.includes('how is') || message.includes('what are the trends')) {
      return {
        capability: 'research',
        reason: 'I can research this topic in real-time using my web research capabilities!',
      };
    }

    // Video suggestions
    if (message.includes('imagine') || message.includes('visualize')) {
      return {
        capability: 'video',
        reason: "I can turn that visualization into an actual video if you'd like!",
      };
    }

    return null;
  }
}
