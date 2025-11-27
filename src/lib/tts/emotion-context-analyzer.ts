/**
 * Emotion Context Analyzer - Automatically add emotion tags based on conversation context
 * Makes HOLLY respond naturally with appropriate emotions without manual tags
 */

export interface EmotionContext {
  emotion: string;
  confidence: number;
  reason: string;
}

export class EmotionContextAnalyzer {
  /**
   * Analyze message content and context to determine appropriate emotion
   */
  static analyzeEmotion(text: string, context?: {
    isSuccess?: boolean;
    isError?: boolean;
    isQuestion?: boolean;
    isGreeting?: boolean;
    sentiment?: 'positive' | 'negative' | 'neutral';
    previousEmotion?: string;
  }): EmotionContext | null {
    
    const lowerText = text.toLowerCase();
    
    // Priority 1: Explicit context hints (from code analysis)
    if (context?.isSuccess) {
      return this.analyzeSuccessEmotion(text, lowerText);
    }
    
    if (context?.isError) {
      return { emotion: '', confidence: 0.8, reason: 'error_neutral' }; // Calm, no emotion
    }
    
    if (context?.isGreeting) {
      return this.analyzeGreetingEmotion(lowerText);
    }
    
    // Priority 2: Content-based emotion detection
    
    // Excitement/Success indicators
    if (this.hasSuccessIndicators(lowerText)) {
      return { emotion: 'excited', confidence: 0.9, reason: 'success_detected' };
    }
    
    // Playful/Humor indicators
    if (this.hasHumorIndicators(lowerText)) {
      return { emotion: 'laugh', confidence: 0.8, reason: 'humor_detected' };
    }
    
    // Analysis/Thinking indicators
    if (this.hasAnalysisIndicators(lowerText)) {
      return { emotion: 'whisper', confidence: 0.7, reason: 'analysis_mode' };
    }
    
    // Warm/Encouraging indicators
    if (this.hasEncouragementIndicators(lowerText)) {
      return { emotion: 'warm', confidence: 0.8, reason: 'encouragement_detected' };
    }
    
    // Confidence indicators
    if (this.hasConfidenceIndicators(lowerText)) {
      return { emotion: 'confident', confidence: 0.8, reason: 'confident_statement' };
    }
    
    // Default: no emotion (natural conversational tone)
    return null;
  }
  
  /**
   * Apply emotion to text naturally (wraps key phrases, not entire text)
   */
  static applyEmotion(text: string, emotion: EmotionContext | null): string {
    if (!emotion || emotion.confidence < 0.6) {
      return text; // No emotion needed
    }
    
    // Find the key phrase to emphasize
    const keyPhrase = this.findKeyPhrase(text, emotion.reason);
    
    if (keyPhrase) {
      // Wrap only the key phrase
      return text.replace(
        keyPhrase,
        `<${emotion.emotion}>${keyPhrase}</${emotion.emotion}>`
      );
    }
    
    // If no specific phrase, wrap first sentence only
    const firstSentence = text.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length > 0) {
      return text.replace(
        firstSentence,
        `<${emotion.emotion}>${firstSentence}</${emotion.emotion}>`
      );
    }
    
    return text;
  }
  
  /**
   * Process HOLLY's response to add contextual emotions
   */
  static processResponse(text: string, context?: {
    isSuccess?: boolean;
    isError?: boolean;
    isQuestion?: boolean;
    isGreeting?: boolean;
    userMessage?: string;
  }): string {
    // Don't add emotions if text already has emotion tags
    if (text.includes('<') && text.includes('>')) {
      return text;
    }
    
    // Analyze sentiment from user message
    const sentiment = context?.userMessage 
      ? this.analyzeSentiment(context.userMessage)
      : 'neutral';
    
    // Detect context from HOLLY's response
    const detectedContext = {
      ...context,
      sentiment,
      isSuccess: context?.isSuccess || this.hasSuccessIndicators(text.toLowerCase()),
      isGreeting: context?.isGreeting || this.hasGreetingIndicators(text.toLowerCase()),
    };
    
    const emotion = this.analyzeEmotion(text, detectedContext);
    return this.applyEmotion(text, emotion);
  }
  
  // ============================================================================
  // Detection Methods
  // ============================================================================
  
  private static hasSuccessIndicators(text: string): boolean {
    const successWords = [
      'success', 'complete', 'done', 'deployed', 'working', 'perfect',
      'excellent', 'great job', 'awesome', 'amazing', 'fantastic',
      'deployed successfully', 'all tests passing', 'build complete',
      'fixed', 'resolved', 'accomplished'
    ];
    return successWords.some(word => text.includes(word));
  }
  
  private static hasHumorIndicators(text: string): boolean {
    const humorWords = [
      'haha', 'lol', 'funny', 'hilarious', 'smooth',
      'tricky', 'clever', 'nice one', 'smooth move'
    ];
    const hasEmoji = /[😂🤣😄😆]/.test(text);
    return humorWords.some(word => text.includes(word)) || hasEmoji;
  }
  
  private static hasAnalysisIndicators(text: string): boolean {
    const analysisWords = [
      'analyzing', 'let me check', 'looking at', 'examining',
      'investigating', 'reviewing', 'hmm', 'interesting',
      'let me see', 'checking', 'processing'
    ];
    return analysisWords.some(word => text.includes(word));
  }
  
  private static hasEncouragementIndicators(text: string): boolean {
    const encouragementWords = [
      "i'm here", "don't worry", "you got this", "we can",
      "let's try", "no problem", "happy to help", "of course"
    ];
    return encouragementWords.some(word => text.includes(word));
  }
  
  private static hasConfidenceIndicators(text: string): boolean {
    const confidenceWords = [
      'definitely', 'absolutely', 'certainly', 'clearly',
      'obviously', 'without a doubt', "i'll handle", "i've got"
    ];
    return confidenceWords.some(word => text.includes(word));
  }
  
  private static hasGreetingIndicators(text: string): boolean {
    const greetingWords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon'];
    return greetingWords.some(word => text.startsWith(word));
  }
  
  private static analyzeSuccessEmotion(text: string, lowerText: string): EmotionContext {
    // Extra excited for major wins
    if (lowerText.includes('deploy') || lowerText.includes('live')) {
      return { emotion: 'excited', confidence: 0.95, reason: 'major_success' };
    }
    
    // Happy for completions
    return { emotion: 'happy', confidence: 0.85, reason: 'task_success' };
  }
  
  private static analyzeGreetingEmotion(lowerText: string): EmotionContext {
    // Warm greeting for Hollywood
    if (lowerText.includes('hollywood')) {
      return { emotion: 'warm', confidence: 0.9, reason: 'personalized_greeting' };
    }
    
    return { emotion: 'happy', confidence: 0.75, reason: 'greeting' };
  }
  
  private static analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const lowerText = text.toLowerCase();
    
    const positiveWords = ['thanks', 'great', 'awesome', 'perfect', 'love', 'excellent'];
    const negativeWords = ['error', 'problem', 'issue', 'broken', 'failed', 'wrong'];
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  private static findKeyPhrase(text: string, reason: string): string | null {
    const lowerText = text.toLowerCase();
    
    switch (reason) {
      case 'success_detected':
      case 'major_success':
      case 'task_success':
        const successPhrases = [
          'deployment successful', 'all tests passing', 'task complete',
          'build complete', 'working perfectly', 'deployed successfully'
        ];
        for (const phrase of successPhrases) {
          const regex = new RegExp(phrase, 'i');
          const match = text.match(regex);
          if (match) return match[0];
        }
        break;
        
      case 'humor_detected':
        const humorPhrases = ['that was smooth', 'nice one', 'tricky bug'];
        for (const phrase of humorPhrases) {
          const regex = new RegExp(phrase, 'i');
          const match = text.match(regex);
          if (match) return match[0];
        }
        break;
        
      case 'analysis_mode':
        const analysisPhrases = ['let me check', 'analyzing', 'interesting'];
        for (const phrase of analysisPhrases) {
          const regex = new RegExp(phrase, 'i');
          const match = text.match(regex);
          if (match) return match[0];
        }
        break;
    }
    
    return null;
  }
}

// Export convenience function for easy integration
export function addNaturalEmotions(
  hollyResponse: string,
  context?: {
    isSuccess?: boolean;
    isError?: boolean;
    userMessage?: string;
  }
): string {
  return EmotionContextAnalyzer.processResponse(hollyResponse, context);
}
