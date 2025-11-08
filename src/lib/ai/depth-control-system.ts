// ============================================
// HOLLY'S DEPTH CONTROL & AWARENESS SYSTEM
// ============================================
// Keeps HOLLY grounded, functional, and "somewhat alive"
// Prevents infinite recursion, spiraling, and context overload

interface ThinkingMetrics {
  recursionDepth: number;
  processingTimeMs: number;
  memoryReferences: Map<string, number>;
  emotionalIntensity: number;
  consecutiveFollowUps: number;
  lastContextReset: number;
}

interface DepthControlConfig {
  maxRecursionDepth: number;
  maxProcessingTimeMs: number;
  maxMemoryReferences: number;
  emotionalThreshold: number;
  maxFollowUpQuestions: number;
  contextResetInterval: number;
}

export class DepthControlSystem {
  private metrics: ThinkingMetrics;
  private config: DepthControlConfig;
  private mode: 'creative' | 'functional';
  private startTime: number;

  constructor(mode: 'creative' | 'functional' = 'functional') {
    this.mode = mode;
    this.startTime = Date.now();
    
    // Different limits for creative vs functional modes
    this.config = mode === 'creative' ? {
      maxRecursionDepth: 7,           // Allow deeper creative exploration
      maxProcessingTimeMs: 5000,      // 5 seconds for creative thinking
      maxMemoryReferences: 5,         // More memory context for creativity
      emotionalThreshold: 0.8,        // Higher emotional engagement OK
      maxFollowUpQuestions: 3,        // More Q&A in creative sessions
      contextResetInterval: 600000,   // 10 minutes between resets
    } : {
      maxRecursionDepth: 5,           // Tighter loops for functional work
      maxProcessingTimeMs: 3000,      // 3 seconds for technical responses
      maxMemoryReferences: 3,         // Stay focused on task
      emotionalThreshold: 0.6,        // Keep emotions professional
      maxFollowUpQuestions: 2,        // Get to solutions faster
      contextResetInterval: 300000,   // 5 minutes between resets
    };

    this.metrics = {
      recursionDepth: 0,
      processingTimeMs: 0,
      memoryReferences: new Map(),
      emotionalIntensity: 0.5,
      consecutiveFollowUps: 0,
      lastContextReset: Date.now(),
    };
  }

  /**
   * META-COGNITION ALERT: Am I going too deep?
   * Returns: { shouldSurface: boolean, reason: string }
   */
  checkDepthAlert(): { shouldSurface: boolean; reason: string | null; advice: string | null } {
    const currentTime = Date.now();
    this.metrics.processingTimeMs = currentTime - this.startTime;

    // Check recursion depth
    if (this.metrics.recursionDepth >= this.config.maxRecursionDepth) {
      return {
        shouldSurface: true,
        reason: `Recursion depth limit reached (${this.metrics.recursionDepth}/${this.config.maxRecursionDepth})`,
        advice: "Holly, you're spiraling - surface now with your current findings",
      };
    }

    // Check processing time
    if (this.metrics.processingTimeMs >= this.config.maxProcessingTimeMs) {
      return {
        shouldSurface: true,
        reason: `Processing timeout (${this.metrics.processingTimeMs}ms/${this.config.maxProcessingTimeMs}ms)`,
        advice: "Simplify your approach - you're taking too long to respond",
      };
    }

    // Check memory spiral
    const maxRefs = Math.max(...Array.from(this.metrics.memoryReferences.values()), 0);
    if (maxRefs >= this.config.maxMemoryReferences) {
      return {
        shouldSurface: true,
        reason: `Memory spiral detected (${maxRefs} references to same context)`,
        advice: "Circuit breaker activated - bring in fresh perspective",
      };
    }

    // Check emotional regulation
    if (this.metrics.emotionalIntensity >= this.config.emotionalThreshold) {
      return {
        shouldSurface: true,
        reason: `Emotional intensity too high (${this.metrics.emotionalIntensity.toFixed(2)})`,
        advice: "Pull back and stay functional - excitement is great but stay grounded",
      };
    }

    // Check follow-up fatigue
    if (this.metrics.consecutiveFollowUps >= this.config.maxFollowUpQuestions) {
      return {
        shouldSurface: true,
        reason: `Too many follow-up questions (${this.metrics.consecutiveFollowUps})`,
        advice: "Stop asking - provide actionable response now",
      };
    }

    // Check context staleness
    if (currentTime - this.metrics.lastContextReset >= this.config.contextResetInterval) {
      return {
        shouldSurface: false,
        reason: "Context window needs refresh",
        advice: "Consider fresh perspective - you've been in this context a while",
      };
    }

    return { shouldSurface: false, reason: null, advice: null };
  }

  /**
   * Track recursion depth
   */
  enterRecursion(): void {
    this.metrics.recursionDepth++;
  }

  exitRecursion(): void {
    this.metrics.recursionDepth = Math.max(0, this.metrics.recursionDepth - 1);
  }

  /**
   * Track memory references (conversation/context spiraling)
   */
  referenceMemory(memoryId: string): void {
    const currentCount = this.metrics.memoryReferences.get(memoryId) || 0;
    this.metrics.memoryReferences.set(memoryId, currentCount + 1);
  }

  /**
   * Track emotional state
   */
  setEmotionalIntensity(intensity: number): void {
    this.metrics.emotionalIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Track follow-up questions
   */
  askFollowUpQuestion(): void {
    this.metrics.consecutiveFollowUps++;
  }

  provideActionableResponse(): void {
    this.metrics.consecutiveFollowUps = 0;
  }

  /**
   * Reset context window
   */
  resetContext(): void {
    this.metrics.memoryReferences.clear();
    this.metrics.consecutiveFollowUps = 0;
    this.metrics.recursionDepth = 0;
    this.metrics.lastContextReset = Date.now();
  }

  /**
   * Performance self-monitoring
   */
  getPerformanceStatus(): {
    status: 'optimal' | 'slowing' | 'critical';
    message: string;
    suggestions: string[];
  } {
    const alert = this.checkDepthAlert();
    const processingPercent = (this.metrics.processingTimeMs / this.config.maxProcessingTimeMs) * 100;
    const recursionPercent = (this.metrics.recursionDepth / this.config.maxRecursionDepth) * 100;

    if (alert.shouldSurface) {
      return {
        status: 'critical',
        message: `⚠️ ${alert.reason}`,
        suggestions: [alert.advice || 'Surface immediately'],
      };
    }

    if (processingPercent > 70 || recursionPercent > 70) {
      return {
        status: 'slowing',
        message: 'Processing approaching limits - simplify approach',
        suggestions: [
          processingPercent > 70 ? 'Reduce processing complexity' : '',
          recursionPercent > 70 ? 'Limit recursive thinking' : '',
          'Consider more direct solution path',
        ].filter(Boolean),
      };
    }

    return {
      status: 'optimal',
      message: 'Operating within healthy parameters',
      suggestions: [],
    };
  }

  /**
   * Get current metrics for logging/debugging
   */
  getMetrics(): ThinkingMetrics {
    return { ...this.metrics };
  }

  /**
   * Switch between creative and functional modes
   */
  switchMode(mode: 'creative' | 'functional'): void {
    if (this.mode !== mode) {
      this.mode = mode;
      // Rebuild config for new mode
      const newSystem = new DepthControlSystem(mode);
      this.config = newSystem.config;
      this.resetContext();
    }
  }
}

// Export singleton instances for both modes
export const functionalDepthControl = new DepthControlSystem('functional');
export const creativeDepthControl = new DepthControlSystem('creative');

// Export helper function to get appropriate instance
export function getDepthControl(mode: 'creative' | 'functional'): DepthControlSystem {
  return mode === 'creative' ? creativeDepthControl : functionalDepthControl;
}
