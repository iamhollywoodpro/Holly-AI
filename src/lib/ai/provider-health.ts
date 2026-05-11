/**
 * HOLLY AI — Provider Health Monitor
 * 
 * Monitors the health and availability of all AI providers (OpenAI, Anthropic, etc.).
 * Prevents silent failures by testing providers before using them in chat.
 */

import { logger } from '../logging/structured-logger';
import OpenAI from 'openai';

export interface ProviderHealth {
  provider: string;
  healthy: boolean;
  lastCheck: Date;
  responseTime?: number;
  error?: string;
}

export class ProviderHealthMonitor {
  private healthCache = new Map<string, ProviderHealth>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  private checkInProgress = new Map<string, Promise<boolean>>();

  /**
   * Test if a provider is healthy and responsive
   */
  async testProvider(provider: string, apiKey: string): Promise<boolean> {
    // Return cached result if still valid
    const cached = this.healthCache.get(provider);
    if (cached && Date.now() - cached.lastCheck.getTime() < this.cacheTTL) {
      return cached.healthy;
    }

    // Prevent concurrent checks for same provider
    if (this.checkInProgress.has(provider)) {
      return this.checkInProgress.get(provider)!;
    }

    // Perform health check
    const checkPromise = this.performHealthCheck(provider, apiKey);
    this.checkInProgress.set(provider, checkPromise);

    try {
      const result = await checkPromise;
      return result;
    } finally {
      this.checkInProgress.delete(provider);
    }
  }

  /**
   * Perform actual health check by making a minimal API call
   */
  private async performHealthCheck(provider: string, apiKey: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      let healthy = false;

      switch (provider) {
        case 'openai':
          healthy = await this.testOpenAI(apiKey);
          break;
        case 'anthropic':
          healthy = await this.testAnthropic(apiKey);
          break;
        case 'deepseek':
          healthy = await this.testDeepSeek(apiKey);
          break;
        case 'groq':
          healthy = await this.testGroq(apiKey);
          break;
        case 'openrouter':
          healthy = await this.testOpenRouter(apiKey);
          break;
        case 'cerebras':
          healthy = await this.testCerebras(apiKey);
          break;
        case 'google':
          healthy = await this.testGoogle(apiKey);
          break;
        default:
          logger.warn('ProviderHealth', `Unknown provider: ${provider}`);
          return false;
      }

      const responseTime = Date.now() - startTime;

      // Update cache
      this.healthCache.set(provider, {
        provider,
        healthy,
        lastCheck: new Date(),
        responseTime,
        error: healthy ? undefined : 'Health check failed'
      });

      if (healthy) {
        logger.info('ProviderHealth', `${provider} is healthy`, { responseTime: `${responseTime}ms` });
      } else {
        logger.warn('ProviderHealth', `${provider} health check failed`);
      }

      return healthy;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.healthCache.set(provider, {
        provider,
        healthy: false,
        lastCheck: new Date(),
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.error('ProviderHealth', error as Error, { provider, responseTime: `${responseTime}ms` });
      return false;
    }
  }

  /**
   * Test OpenAI provider
   */
  private async testOpenAI(apiKey: string): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey });
      await client.models.list();
      return true;
    } catch (error) {
      logger.error('ProviderHealth', error as Error, { provider: 'openai' });
      return false;
    }
  }

  /**
   * Test Anthropic provider
   */
  private async testAnthropic(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      return response.ok;
    } catch (error) {
      logger.error('ProviderHealth', error as Error, { provider: 'anthropic' });
      return false;
    }
  }

  /**
   * Test DeepSeek provider
   */
  private async testDeepSeek(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });
      return response.ok;
    } catch (error) {
      logger.error('ProviderHealth', error as Error, { provider: 'deepseek' });
      return false;
    }
  }

  /**
   * Test Groq provider
   */
  private async testGroq(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return response.ok;
    } catch (error) {
      logger.error('ProviderHealth', error as Error, { provider: 'groq' });
      return false;
    }
  }

  /**
   * Test OpenRouter provider
   */
  private async testOpenRouter(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return response.ok;
    } catch (error) {
      logger.error('ProviderHealth', error as Error, { provider: 'openrouter' });
      return false;
    }
  }

  /**
   * Test Cerebras provider
   */
  private async testCerebras(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.cerebras.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return response.ok;
    } catch (error) {
      logger.error('ProviderHealth', error as Error, { provider: 'cerebras' });
      return false;
    }
  }

  /**
   * Test Google AI provider
   */
  private async testGoogle(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      return response.ok;
    } catch (error) {
      logger.error('ProviderHealth', error as Error, { provider: 'google' });
      return false;
    }
  }

  /**
   * Get list of all healthy providers
   */
  async getHealthyProviders(providers: string[], apiKeys: Record<string, string>): Promise<string[]> {
    const healthChecks = providers.map(provider => 
      this.testProvider(provider, apiKeys[provider] || '')
    );
    
    const results = await Promise.all(healthChecks);
    
    return providers.filter((_, index) => results[index]);
  }

  /**
   * Get health status for all providers
   */
  getAllHealthStatus(): ProviderHealth[] {
    return Array.from(this.healthCache.values());
  }

  /**
   * Get health status for specific provider
   */
  getHealthStatus(provider: string): ProviderHealth | undefined {
    return this.healthCache.get(provider);
  }

  /**
   * Force recheck a provider (bypass cache)
   */
  async recheckProvider(provider: string, apiKey: string): Promise<boolean> {
    // Clear cache for this provider
    this.healthCache.delete(provider);
    return this.testProvider(provider, apiKey);
  }

  /**
   * Clear all cached health status
   */
  clearCache(): void {
    this.healthCache.clear();
    logger.info('ProviderHealth', 'Health cache cleared');
  }

  /**
   * Get health summary for monitoring
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
    providers: ProviderHealth[];
  } {
    const providers = this.getAllHealthStatus();
    const healthy = providers.filter(p => p.healthy).length;
    const unhealthy = providers.filter(p => !p.healthy).length;
    
    return {
      total: providers.length,
      healthy,
      unhealthy,
      unknown: 0, // We always have a status after checking
      providers
    };
  }
}

// Singleton instance
export const providerHealthMonitor = new ProviderHealthMonitor();