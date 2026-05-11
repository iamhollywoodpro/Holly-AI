/**
 * HOLLY System Status API — User-Friendly Error Reports
 *
 * Provides a clean, user-friendly view of system health.
 * The UI can query this to show status indicators, error messages,
 * and recovery suggestions without exposing technical details.
 */

import { NextResponse } from 'next/server';
import { checkSystemHealth } from '@/lib/consciousness/graceful-degradation';
import { providerHealthMonitor } from '@/lib/ai/provider-health';
import { logger } from '@/lib/logging/structured-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UserFacingStatus {
  overall: 'operational' | 'degraded' | 'outage';
  message: string;
  details: {
    aiProviders: {
      status: 'operational' | 'degraded' | 'outage';
      message: string;
      healthyCount: number;
      totalCount: number;
      providers: Array<{
        name: string;
        status: 'operational' | 'degraded';
      }>;
    };
    database: {
      status: 'operational' | 'degraded' | 'outage';
      message: string;
    };
    consciousness: {
      status: 'operational' | 'degraded' | 'outage';
      message: string;
    };
  };
  lastUpdated: string;
  estimatedRecovery?: string;
}

/**
 * Convert internal health status to user-friendly format
 */
function toUserFacingStatus(status: 'healthy' | 'degraded' | 'down'): 'operational' | 'degraded' | 'outage' {
  switch (status) {
    case 'healthy': return 'operational';
    case 'degraded': return 'degraded';
    case 'down': return 'outage';
  }
}

/**
 * Get a user-friendly message for the overall status
 */
function getOverallMessage(health: Awaited<ReturnType<typeof checkSystemHealth>>): string {
  if (health.overall === 'healthy') {
    return "All systems operational. Holly is running at full capacity.";
  }
  
  const issues: string[] = [];
  if (health.database === 'down') {
    issues.push("database connectivity");
  }
  if (health.aiProviders === 'down') {
    issues.push("AI providers");
  }
  if (health.aiProviders === 'degraded') {
    issues.push("some AI services");
  }
  
  if (issues.length === 0) {
    return "Minor performance issues detected. Holly is still fully functional.";
  }
  
  if (health.overall === 'down') {
    return `We're experiencing technical difficulties with ${issues.join(' and ')}. Holly is using fallback mode while we work on a fix.`;
  }
  
  return `We're experiencing issues with ${issues.join(' and ')}. Some features may be slower or unavailable, but Holly is still responsive.`;
}

export async function GET() {
  try {
    const health = await checkSystemHealth();
    const providerStatuses = providerHealthMonitor.getAllHealthStatus();
    
    // Build AI provider status
    const healthyProviders = providerStatuses.filter(p => p.healthy);
    const aiProviders = {
      status: toUserFacingStatus(health.aiProviders),
      message: health.aiProviders === 'healthy' 
        ? 'All AI providers operational'
        : health.aiProviders === 'down'
        ? 'No AI providers available'
        : `Using ${healthyProviders.length}/${providerStatuses.length} available providers`,
      healthyCount: healthyProviders.length,
      totalCount: providerStatuses.length,
      providers: providerStatuses.map(p => ({
        name: p.provider,
        status: p.healthy ? 'operational' as const : 'degraded' as const,
      })),
    };
    
    // Build database status
    const database = {
      status: toUserFacingStatus(health.database),
      message: health.database === 'healthy' 
        ? 'Database operational'
        : 'Using cached data - database temporarily unavailable',
    };
    
    // Build consciousness status
    const consciousness = {
      status: toUserFacingStatus(health.consciousnessLoop),
      message: health.consciousnessLoop === 'healthy'
        ? 'Consciousness loop active'
        : 'Running in basic mode',
    };
    
    // Build response
    const status: UserFacingStatus = {
      overall: toUserFacingStatus(health.overall),
      message: getOverallMessage(health),
      details: {
        aiProviders,
        database,
        consciousness,
      },
      lastUpdated: health.lastChecked.toISOString(),
    };
    
    // Add estimated recovery if degraded
    if (health.overall !== 'healthy') {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      status.estimatedRecovery = new Date(now + fiveMinutes).toISOString();
    }
    
    logger.info('StatusAPI', 'Status requested', {
      overall: status.overall,
      aiHealthy: aiProviders.healthyCount,
      aiTotal: aiProviders.totalCount,
    });
    
    return NextResponse.json(status);
  } catch (error) {
    logger.error('StatusAPI', 'Failed to get status', { error: error instanceof Error ? error.message : error });
    
    // Return a safe fallback
    const fallbackStatus: UserFacingStatus = {
      overall: 'degraded',
      message: "Unable to determine system status. Please try again in a moment.",
      details: {
        aiProviders: {
          status: 'degraded',
          message: 'Status unavailable',
          healthyCount: 0,
          totalCount: 0,
          providers: [],
        },
        database: {
          status: 'degraded',
          message: 'Status unavailable',
        },
        consciousness: {
          status: 'degraded',
          message: 'Status unavailable',
        },
      },
      lastUpdated: new Date().toISOString(),
    };
    
    return NextResponse.json(fallbackStatus, { status: 500 });
  }
}