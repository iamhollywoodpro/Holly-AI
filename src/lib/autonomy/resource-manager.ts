/**
 * Autonomous Resource Management System
 * 
 * Enables HOLLY to autonomously:
 * - Monitor system resources (CPU, memory, disk, network)
 * - Allocate resources dynamically based on demand
 * - Optimize costs for AI API calls
 * - Manage memory and storage efficiently
 * - Implement rate limiting and throttling
 * - Scale resources up/down automatically
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ResourceMetrics {
  timestamp: Date;
  cpuUsage: number; // 0-100
  memoryUsage: number; // 0-100
  diskUsage: number; // 0-100
  networkIO: {
    inbound: number; // bytes
    outbound: number; // bytes
  };
  activeConnections: number;
  queueDepth: number;
}

export interface ResourceThresholds {
  cpuWarning: number;
  cpuCritical: number;
  memoryWarning: number;
  memoryCritical: number;
  diskWarning: number;
  diskCritical: number;
  queueDepthWarning: number;
  queueDepthCritical: number;
}

export interface CostMetrics {
  provider: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  timestamp: Date;
}

export interface ResourceAllocation {
  type: 'compute' | 'memory' | 'storage' | 'network';
  amount: number;
  priority: number;
  duration: number;
}

export class AutonomousResourceManager {
  private thresholds: ResourceThresholds = {
    cpuWarning: 70,
    cpuCritical: 90,
    memoryWarning: 80,
    memoryCritical: 95,
    diskWarning: 80,
    diskCritical: 90,
    queueDepthWarning: 50,
    queueDepthCritical: 100
  };

  private costLimits: Map<string, number> = new Map();
  private rateLimits: Map<string, { limit: number; window: number }> = new Map();
  private requestHistory: Map<string, number[]> = new Map();
  private costHistory: CostMetrics[] = [];

  /**
   * Initialize resource manager with configuration
   */
  async initialize(): Promise<void> {
    // Load configuration from database
    const config = await prisma.resourceConfig.findFirst();
    
    if (config) {
      this.thresholds = config.thresholds as ResourceThresholds;
      
      // Load cost limits
      if (config.costLimits) {
        Object.entries(config.costLimits).forEach(([provider, limit]) => {
          this.costLimits.set(provider, limit as number);
        });
      }
      
      // Load rate limits
      if (config.rateLimits) {
        Object.entries(config.rateLimits).forEach(([endpoint, limit]) => {
          const { limit: l, window: w } = limit as any;
          this.rateLimits.set(endpoint, { limit: l, window: w });
        });
      }
    }

    // Start monitoring
    this.startMonitoring();
    this.startCostTracking();
  }

  /**
   * Start continuous resource monitoring
   */
  private startMonitoring(): void {
    setInterval(async () => {
      const metrics = await this.collectMetrics();
      await this.analyzeMetrics(metrics);
    }, 5000); // Monitor every 5 seconds
  }

  /**
   * Start cost tracking
   */
  private startCostTracking(): void {
    setInterval(async () => {
      await this.optimizeCosts();
    }, 60000); // Optimize costs every minute
  }

  /**
   * Collect current resource metrics
   */
  async collectMetrics(): Promise<ResourceMetrics> {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Calculate CPU usage percentage
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000;
    
    // Memory usage in MB
    const totalMemory = usage.heapTotal;
    const usedMemory = usage.heapUsed;
    const memoryPercent = (usedMemory / totalMemory) * 100;

    return {
      timestamp: new Date(),
      cpuUsage: Math.min(100, cpuPercent),
      memoryUsage: Math.min(100, memoryPercent),
      diskUsage: await this.getDiskUsage(),
      networkIO: await this.getNetworkIO(),
      activeConnections: await this.getActiveConnections(),
      queueDepth: await this.getQueueDepth()
    };
  }

  /**
   * Get disk usage percentage
   */
  private async getDiskUsage(): Promise<number> {
    try {
      const fs = require('fs');
      const stats = fs.statSync('/');
      // Simplified - in production, use actual disk stats
      return 50; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get network I/O stats
   */
  private async getNetworkIO(): Promise<{ inbound: number; outbound: number }> {
    // Simplified - in production, use actual network stats
    return { inbound: 0, outbound: 0 };
  }

  /**
   * Get active connection count
   */
  private async getActiveConnections(): Promise<number> {
    // In production, query actual connection count
    return 10;
  }

  /**
   * Get queue depth
   */
  private async getQueueDepth(): Promise<number> {
    // Count unprocessed background tasks
    const pendingTasks = await prisma.backgroundTask.count({
      where: { status: 'PENDING' }
    });
    return pendingTasks;
  }

  /**
   * Analyze metrics and take action if needed
   */
  private async analyzeMetrics(metrics: ResourceMetrics): Promise<void> {
    const alerts: string[] = [];

    // Check CPU
    if (metrics.cpuUsage > this.thresholds.cpuCritical) {
      alerts.push(`CRITICAL: CPU usage at ${metrics.cpuUsage.toFixed(1)}%`);
      await this.handleHighCPU(metrics);
    } else if (metrics.cpuUsage > this.thresholds.cpuWarning) {
      alerts.push(`WARNING: CPU usage at ${metrics.cpuUsage.toFixed(1)}%`);
    }

    // Check Memory
    if (metrics.memoryUsage > this.thresholds.memoryCritical) {
      alerts.push(`CRITICAL: Memory usage at ${metrics.memoryUsage.toFixed(1)}%`);
      await this.handleHighMemory(metrics);
    } else if (metrics.memoryUsage > this.thresholds.memoryWarning) {
      alerts.push(`WARNING: Memory usage at ${metrics.memoryUsage.toFixed(1)}%`);
    }

    // Check Disk
    if (metrics.diskUsage > this.thresholds.diskCritical) {
      alerts.push(`CRITICAL: Disk usage at ${metrics.diskUsage.toFixed(1)}%`);
      await this.handleHighDisk();
    } else if (metrics.diskUsage > this.thresholds.diskWarning) {
      alerts.push(`WARNING: Disk usage at ${metrics.diskUsage.toFixed(1)}%`);
    }

    // Check Queue Depth
    if (metrics.queueDepth > this.thresholds.queueDepthCritical) {
      alerts.push(`CRITICAL: Queue depth at ${metrics.queueDepth}`);
      await this.handleHighQueueDepth();
    } else if (metrics.queueDepth > this.thresholds.queueDepthWarning) {
      alerts.push(`WARNING: Queue depth at ${metrics.queueDepth}`);
    }

    // Store metrics
    await this.storeMetrics(metrics);

    // Trigger alerts if needed
    if (alerts.length > 0) {
      await this.triggerAlerts(alerts);
    }
  }

  /**
   * Handle high CPU usage
   */
  private async handleHighCPU(metrics: ResourceMetrics): Promise<void> {
    // Reduce non-critical tasks
    await prisma.backgroundTask.updateMany({
      where: { 
        status: 'PENDING',
        priority: { lt: 5 }
      },
      data: { status: 'THROTTLED' }
    });

    // Scale down if possible (in production)
    console.log('Scaling down due to high CPU usage');
  }

  /**
   * Handle high memory usage
   */
  private async handleHighMemory(metrics: ResourceMetrics): Promise<void> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Clear cache
    await this.clearCache();

    // Reduce context window
    // In production, adjust context budget dynamically
    console.log('Reducing context window due to high memory');
  }

  /**
   * Handle high disk usage
   */
  private async handleHighDisk(): Promise<void> {
    // Clean up old logs
    await this.cleanupOldLogs();

    // Clean up old temporary files
    await this.cleanupTempFiles();

    // Archive old data
    await this.archiveOldData();
  }

  /**
   * Handle high queue depth
   */
  private async handleHighQueueDepth(): Promise<void> {
    // Increase worker count (in production)
    console.log('Increasing worker count to clear queue');

    // Prioritize high-priority tasks
    await prisma.backgroundTask.updateMany({
      where: { 
        status: 'THROTTLED',
        priority: { gte: 5 }
      },
      data: { status: 'PENDING' }
    });
  }

  /**
   * Clear cache
   */
  private async clearCache(): Promise<void> {
    // Clear in-memory caches
    this.requestHistory.clear();
    
    // Clear database cache if implemented
    await prisma.cache.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 3600000) // 1 hour old
        }
      }
    });
  }

  /**
   * Clean up old logs
   */
  private async cleanupOldLogs(): Promise<void> {
    // In production, implement log cleanup
    console.log('Cleaning up old logs');
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(): Promise<void> {
    // In production, implement temp file cleanup
    console.log('Cleaning up temporary files');
  }

  /**
   * Archive old data
   */
  private async archiveOldData(): Promise<void> {
    // Archive old conversations
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    
    await prisma.conversation.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        archived: false
      },
      data: { archived: true }
    });
  }

  /**
   * Store metrics in database
   */
  private async storeMetrics(metrics: ResourceMetrics): Promise<void> {
    await prisma.resourceMetric.create({
      data: {
        timestamp: metrics.timestamp,
        cpuUsage: metrics.cpuUsage,
        memoryUsage: metrics.memoryUsage,
        diskUsage: metrics.diskUsage,
        networkInbound: metrics.networkIO.inbound,
        networkOutbound: metrics.networkIO.outbound,
        activeConnections: metrics.activeConnections,
        queueDepth: metrics.queueDepth
      }
    });
  }

  /**
   * Trigger alerts
   */
  private async triggerAlerts(alerts: string[]): Promise<void> {
    for (const alert of alerts) {
      await prisma.alert.create({
        data: {
          type: 'RESOURCE',
          severity: alert.includes('CRITICAL') ? 'CRITICAL' : 'WARNING',
          message: alert,
          timestamp: new Date(),
          acknowledged: false
        }
      });
    }
  }

  /**
   * Check rate limit for an endpoint
   */
  async checkRateLimit(endpoint: string): Promise<boolean> {
    const limit = this.rateLimits.get(endpoint);
    if (!limit) return true; // No limit set

    const now = Date.now();
    const history = this.requestHistory.get(endpoint) || [];

    // Remove old requests outside the window
    const validRequests = history.filter(time => now - time < limit.window);

    if (validRequests.length >= limit.limit) {
      return false; // Rate limit exceeded
    }

    // Add current request
    validRequests.push(now);
    this.requestHistory.set(endpoint, validRequests);

    return true;
  }

  /**
   * Set rate limit for an endpoint
   */
  setRateLimit(endpoint: string, limit: number, window: number): void {
    this.rateLimits.set(endpoint, { limit, window });
    this.requestHistory.set(endpoint, []);
  }

  /**
   * Track cost for AI API calls
   */
  async trackCost(provider: string, model: string, tokensInput: number, tokensOutput: number): Promise<number> {
    // Calculate cost based on provider pricing
    const cost = this.calculateCost(provider, model, tokensInput, tokensOutput);

    const metrics: CostMetrics = {
      provider,
      model,
      tokensInput,
      tokensOutput,
      cost,
      timestamp: new Date()
    };

    this.costHistory.push(metrics);

    // Store in database
    await prisma.costMetric.create({
      data: {
        provider,
        model,
        tokensInput,
        tokensOutput,
        cost,
        timestamp: metrics.timestamp
      }
    });

    return cost;
  }

  /**
   * Calculate cost based on provider pricing
   */
  private calculateCost(provider: string, model: string, tokensInput: number, tokensOutput: number): number {
    // Simplified pricing - in production, use actual pricing
    const pricing: Record<string, { input: number; output: number }> = {
      'openai': { input: 0.000005, output: 0.000015 },
      'anthropic': { input: 0.000003, output: 0.000015 },
      'google': { input: 0.000001, output: 0.000004 },
      'groq': { input: 0.00000059, output: 0.00000079 },
      'deepseek': { input: 0.00000014, output: 0.00000028 }
    };

    const rates = pricing[provider.toLowerCase()] || pricing['openai'];
    return (tokensInput * rates.input) + (tokensOutput * rates.output);
  }

  /**
   * Get total cost for a time period
   */
  async getTotalCost(startDate: Date, endDate: Date): Promise<number> {
    const costs = await prisma.costMetric.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    return costs.reduce((total, c) => total + c.cost, 0);
  }

  /**
   * Optimize costs
   */
  private async optimizeCosts(): Promise<void> {
    // Analyze cost trends
    const recentCosts = this.costHistory.slice(-100);
    const averageCost = recentCosts.reduce((sum, c) => sum + c.cost, 0) / recentCosts.length;

    // Check if any provider is over limit
    for (const [provider, limit] of this.costLimits.entries()) {
      const providerCosts = recentCosts.filter(c => c.provider === provider);
      const providerTotal = providerCosts.reduce((sum, c) => sum + c.cost, 0);

      if (providerTotal > limit) {
        await this.handleCostOverLimit(provider, limit, providerTotal);
      }
    }

    // Suggest cost optimizations
    await this.suggestCostOptimizations();
  }

  /**
   * Handle cost over limit
   */
  private async handleCostOverLimit(provider: string, limit: number, actual: number): Promise<void> {
    await prisma.alert.create({
      data: {
        type: 'COST',
        severity: 'WARNING',
        message: `Cost limit exceeded for ${provider}: ${actual.toFixed(4)} > ${limit}`,
        timestamp: new Date(),
        acknowledged: false
      }
    });

    // Switch to cheaper providers if possible
    console.log(`Switching to cheaper providers for ${provider}`);
  }

  /**
   * Suggest cost optimizations
   */
  private async suggestCostOptimizations(): Promise<void> {
    // Analyze which models are most expensive
    const modelCosts = new Map<string, { count: number; total: number }>();
    
    this.costHistory.forEach(c => {
      const key = `${c.provider}:${c.model}`;
      const stats = modelCosts.get(key) || { count: 0, total: 0 };
      stats.count++;
      stats.total += c.cost;
      modelCosts.set(key, stats);
    });

    // Find expensive models
    for (const [model, stats] of modelCosts.entries()) {
      const avgCost = stats.total / stats.count;
      if (avgCost > 0.01) {
        console.log(`Consider optimizing ${model} - avg cost: $${avgCost.toFixed(4)}`);
      }
    }
  }

  /**
   * Allocate resources dynamically
   */
  async allocateResources(allocation: ResourceAllocation): Promise<boolean> {
    const metrics = await this.collectMetrics();

    // Check if resources are available
    switch (allocation.type) {
      case 'compute':
        if (metrics.cpuUsage > this.thresholds.cpuWarning) {
          return false;
        }
        break;
      case 'memory':
        if (metrics.memoryUsage > this.thresholds.memoryWarning) {
          return false;
        }
        break;
      case 'storage':
        if (metrics.diskUsage > this.thresholds.diskWarning) {
          return false;
        }
        break;
      case 'network':
        if (metrics.activeConnections > 100) {
          return false;
        }
        break;
    }

    // Allocate resources
    await prisma.resourceAllocation.create({
      data: {
        type: allocation.type,
        amount: allocation.amount,
        priority: allocation.priority,
        duration: allocation.duration,
        startTime: new Date(),
        endTime: new Date(Date.now() + allocation.duration * 1000)
      }
    });

    return true;
  }

  /**
   * Get resource utilization report
   */
  async getUtilizationReport(hours: number = 24): Promise<any> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const metrics = await prisma.resourceMetric.findMany({
      where: {
        timestamp: { gte: startDate }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (metrics.length === 0) {
      return {
        averageCpu: 0,
        averageMemory: 0,
        averageDisk: 0,
        averageQueueDepth: 0,
        peakCpu: 0,
        peakMemory: 0,
        peakQueueDepth: 0
      };
    }

    const totalCpu = metrics.reduce((sum, m) => sum + m.cpuUsage, 0);
    const totalMemory = metrics.reduce((sum, m) => sum + m.memoryUsage, 0);
    const totalDisk = metrics.reduce((sum, m) => sum + m.diskUsage, 0);
    const totalQueue = metrics.reduce((sum, m) => sum + m.queueDepth, 0);

    const peakCpu = Math.max(...metrics.map(m => m.cpuUsage));
    const peakMemory = Math.max(...metrics.map(m => m.memoryUsage));
    const peakQueue = Math.max(...metrics.map(m => m.queueDepth));

    return {
      averageCpu: totalCpu / metrics.length,
      averageMemory: totalMemory / metrics.length,
      averageDisk: totalDisk / metrics.length,
      averageQueueDepth: totalQueue / metrics.length,
      peakCpu,
      peakMemory,
      peakQueueDepth: peakQueue,
      totalSamples: metrics.length
    };
  }

  /**
   * Get cost report
   */
  async getCostReport(hours: number = 24): Promise<any> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const costs = await prisma.costMetric.findMany({
      where: {
        timestamp: { gte: startDate }
      }
    });

    const byProvider = new Map<string, { total: number; count: number }>();
    const byModel = new Map<string, { total: number; count: number }>();

    costs.forEach(c => {
      // By provider
      const providerStats = byProvider.get(c.provider) || { total: 0, count: 0 };
      providerStats.total += c.cost;
      providerStats.count++;
      byProvider.set(c.provider, providerStats);

      // By model
      const modelStats = byModel.get(c.model) || { total: 0, count: 0 };
      modelStats.total += c.cost;
      modelStats.count++;
      byModel.set(c.model, modelStats);
    });

    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
    const totalTokens = costs.reduce((sum, c) => sum + c.tokensInput + c.tokensOutput, 0);

    return {
      totalCost,
      totalTokens,
      totalRequests: costs.length,
      byProvider: Array.from(byProvider.entries()).map(([provider, stats]) => ({
        provider,
        cost: stats.total,
        requests: stats.count
      })),
      byModel: Array.from(byModel.entries()).map(([model, stats]) => ({
        model,
        cost: stats.total,
        requests: stats.count
      }))
    };
  }

  /**
   * Update thresholds
   */
  async updateThresholds(thresholds: Partial<ResourceThresholds>): Promise<void> {
    this.thresholds = { ...this.thresholds, ...thresholds };

    await prisma.resourceConfig.upsert({
      where: { id: 'default' },
      update: { thresholds: this.thresholds as any },
      create: {
        id: 'default',
        thresholds: this.thresholds as any
      }
    });
  }

  /**
   * Set cost limit
   */
  setCostLimit(provider: string, limit: number): void {
    this.costLimits.set(provider, limit);
  }

  /**
   * Get current metrics snapshot
   */
  async getCurrentMetrics(): Promise<ResourceMetrics> {
    return await this.collectMetrics();
  }
}

// Singleton instance
export const resourceManager = new AutonomousResourceManager();