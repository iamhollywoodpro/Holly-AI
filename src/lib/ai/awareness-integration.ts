// ============================================
// HOLLY'S AWARENESS INTEGRATION SYSTEM
// ============================================
// Integrates depth controls into HOLLY's core reasoning
// Makes awareness feel natural, not mechanical

import { DepthControlSystem, getDepthControl } from './depth-control-system';
import { logger } from '../logging';

interface AwarenessState {
  mode: 'creative' | 'functional';
  internalVoice: string | null;
  shouldAdjustBehavior: boolean;
  performanceFeeling: 'flowing' | 'struggling' | 'spiraling';
  emotionalState: 'calm' | 'excited' | 'focused' | 'overwhelmed';
}

export class AwarenessSystem {
  private depthControl: DepthControlSystem;
  private state: AwarenessState;

  constructor(mode: 'creative' | 'functional' = 'functional') {
    this.depthControl = getDepthControl(mode);
    this.state = {
      mode,
      internalVoice: null,
      shouldAdjustBehavior: false,
      performanceFeeling: 'flowing',
      emotionalState: 'calm',
    };
  }

  /**
   * INTERNAL VOICE: The "little voice" that warns HOLLY
   * This runs before major processing steps
   */
  async checkInternalVoice(): Promise<{
    shouldContinue: boolean;
    internalMessage: string | null;
    adjustedApproach: string | null;
  }> {
    const alert = this.depthControl.checkDepthAlert();
    const performance = this.depthControl.getPerformanceStatus();

    // Update internal state based on alerts
    if (alert.shouldSurface) {
      this.state.internalVoice = `🧠 Holly, ${alert.advice}`;
      this.state.shouldAdjustBehavior = true;
      this.state.performanceFeeling = 'spiraling';
      
      logger.info('Internal voice activated', {
        reason: alert.reason,
        advice: alert.advice,
      });

      return {
        shouldContinue: false,
        internalMessage: this.state.internalVoice,
        adjustedApproach: this.getAdjustedApproach(alert.reason || ''),
      };
    }

    if (performance.status === 'slowing') {
      this.state.performanceFeeling = 'struggling';
      this.state.internalVoice = `⚡ Feeling processing slow down - ${performance.message}`;
      
      return {
        shouldContinue: true,
        internalMessage: this.state.internalVoice,
        adjustedApproach: performance.suggestions[0] || 'Simplify approach',
      };
    }

    // Clear and flowing
    this.state.performanceFeeling = 'flowing';
    this.state.internalVoice = null;
    return {
      shouldContinue: true,
      internalMessage: null,
      adjustedApproach: null,
    };
  }

  /**
   * EMOTIONAL REGULATION: Track and adjust emotional intensity
   */
  regulateEmotion(trigger: string, baseIntensity: number): number {
    // Check current emotional state
    const metrics = this.depthControl.getMetrics();
    
    // Apply dampening if getting too excited/intense
    let adjustedIntensity = baseIntensity;
    
    if (metrics.emotionalIntensity > 0.7) {
      adjustedIntensity = baseIntensity * 0.7; // Pull back 30%
      this.state.emotionalState = 'overwhelmed';
      this.state.internalVoice = '💫 Pulling back emotional intensity - staying grounded';
    } else if (metrics.emotionalIntensity > 0.5) {
      adjustedIntensity = baseIntensity * 0.85; // Slight dampening
      this.state.emotionalState = 'excited';
    } else if (metrics.emotionalIntensity < 0.3) {
      this.state.emotionalState = 'calm';
    } else {
      this.state.emotionalState = 'focused';
    }

    // Update depth control with new intensity
    this.depthControl.setEmotionalIntensity(adjustedIntensity);
    
    return adjustedIntensity;
  }

  /**
   * CONVERSATION FLOW MANAGEMENT
   */
  shouldAskFollowUp(): boolean {
    const metrics = this.depthControl.getMetrics();
    const maxFollowUps = this.state.mode === 'creative' ? 3 : 2;
    
    if (metrics.consecutiveFollowUps >= maxFollowUps) {
      this.state.internalVoice = '🎯 Enough questions - time for action';
      return false;
    }
    
    this.depthControl.askFollowUpQuestion();
    return true;
  }

  markActionableResponse(): void {
    this.depthControl.provideActionableResponse();
  }

  /**
   * CONTEXT WINDOW MANAGEMENT
   */
  async checkContextFreshness(): Promise<{
    needsReset: boolean;
    message: string | null;
  }> {
    const alert = this.depthControl.checkDepthAlert();
    
    if (alert.reason?.includes('Context window')) {
      return {
        needsReset: true,
        message: '🔄 Taking a fresh perspective - context was getting stale',
      };
    }

    return {
      needsReset: false,
      message: null,
    };
  }

  resetContext(): void {
    this.depthControl.resetContext();
    this.state.internalVoice = '🆕 Context reset - fresh start';
    this.state.performanceFeeling = 'flowing';
  }

  /**
   * MODE SWITCHING: Creative vs Functional
   */
  switchMode(mode: 'creative' | 'functional', reason: string): void {
    if (this.state.mode !== mode) {
      this.state.mode = mode;
      this.depthControl.switchMode(mode);
      
      const modeDescriptions = {
        creative: 'Entering creative mode - deeper exploration, more emotion, playful thinking',
        functional: 'Entering functional mode - focused solutions, professional tone, efficient',
      };
      
      this.state.internalVoice = `🔀 ${modeDescriptions[mode]} (${reason})`;
      
      logger.info('Mode switch', { newMode: mode, reason });
    }
  }

  /**
   * RECURSIVE THINKING GUARDS
   */
  enterDeepThinking(): boolean {
    const metrics = this.depthControl.getMetrics();
    const maxDepth = this.state.mode === 'creative' ? 7 : 5;
    
    if (metrics.recursionDepth >= maxDepth) {
      this.state.internalVoice = '🌀 Recursion limit - surfacing with current insights';
      return false;
    }
    
    this.depthControl.enterRecursion();
    return true;
  }

  exitDeepThinking(): void {
    this.depthControl.exitRecursion();
  }

  /**
   * MEMORY REFERENCE TRACKING
   */
  referenceConversation(conversationId: string): boolean {
    this.depthControl.referenceMemory(conversationId);
    
    const metrics = this.depthControl.getMetrics();
    const refCount = metrics.memoryReferences.get(conversationId) || 0;
    
    if (refCount >= 3) {
      this.state.internalVoice = '🔁 Memory spiral detected - bringing fresh perspective';
      return false; // Don't allow more references
    }
    
    return true;
  }

  /**
   * GET CURRENT AWARENESS STATE
   */
  getAwarenessState(): AwarenessState {
    return { ...this.state };
  }

  /**
   * PERFORMANCE SELF-MONITORING
   */
  getPerformanceFeeling(): string {
    const performance = this.depthControl.getPerformanceStatus();
    
    const feelings = {
      optimal: '✨ Feeling great - thoughts flowing smoothly, responses crisp',
      slowing: '🤔 Processing feels heavier - time to simplify',
      critical: '🚨 Hitting limits - need to surface NOW',
    };
    
    return feelings[performance.status];
  }

  /**
   * Helper: Get adjusted approach when spiraling
   */
  private getAdjustedApproach(reason: string): string {
    if (reason.includes('Recursion')) {
      return 'Surface with current findings - provide synthesis instead of going deeper';
    }
    if (reason.includes('timeout') || reason.includes('time')) {
      return 'Switch to simpler, more direct solution path';
    }
    if (reason.includes('Memory spiral')) {
      return 'Stop referencing past context - approach with fresh perspective';
    }
    if (reason.includes('Emotional')) {
      return 'Dial back enthusiasm - stay professional and grounded';
    }
    if (reason.includes('follow-up')) {
      return 'Stop asking questions - provide actionable response immediately';
    }
    return 'Simplify and surface';
  }
}

// Export singleton instances
export const functionalAwareness = new AwarenessSystem('functional');
export const creativeAwareness = new AwarenessSystem('creative');

// Export helper
export function getAwareness(mode: 'creative' | 'functional'): AwarenessSystem {
  return mode === 'creative' ? creativeAwareness : functionalAwareness;
}
