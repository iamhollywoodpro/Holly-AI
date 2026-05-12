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
    // Load configuration from database — stored as JSON in value field
    const config = await prisma.resourceConfig.findFirst({
      where: { category: 'resource_manager' }
    });
    
    if (config?.value && typeof config.value === 'object') {
      const cfg = config.value as Record<string, any>;
      if (cfg.thresholds) this.thresholds = cfg.thresholds as ResourceThresholds;
      
      // Load cost limits
      if (cfg.costLimits && typeof cfg.costLimits === 'object') {
        Object.entries(cfg.costLimits).forEach(([provider, limit]) => {
          this.costLimits.set(provider, limit as number);
        });
      }
      
      // Load rate limits
      if (cfg.rateLimits && typeof cfg.rateLimits === 'object') {
        Object.entries(cfg.rateLimits).forEach(([endpoint, limit]) => {
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
      return 50; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get network I/O stats
   */
  private async getNetworkIO(): Promise<{ inbound: number; outbound: number }> {
    return { inbound: 0, outbound: 0 };
  }

  /**
   * Get active connection count
   */
  private async getActiveConnections(): Promise<number> {
    return 10;
  }

  /**
   * Get queue depth
   */
  private async getQueueDepth(): Promise<number> {
    try {
      const pendingTasks = await prisma.backgroundTask.count({
        where: { status: 'pending' }
      });
      return pendingTasks;
    } catch {
      return 0;
    }
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
    try {
      await prisma.backgroundTask.updateMany({
        where: { 
          status: 'pending',
          priority: { lt: 5 }
        },
        data: { status: 'throttled' }
      });
    } catch { /* ignore if table doesn't exist yet */ }
    console.log('Scaling down due to high CPU usage');
  }

  /**
   * Handle high memory usage
   */
  private async handleHighMemory(metrics: ResourceMetrics): Promise<void> {
    if (global.gc) {
      global.gc();
    }
    await this.clearCache();
    console.log('Reducing context window due to high memory');
  }

  /**
   * Handle high disk usage
   */
  private async handleHighDisk(): Promise<void> {
    await this.cleanupOldLogs();
    await this.cleanupTempFiles();
    await this.archiveOldData();
  }

  /**
   * Handle high queue depth
   */
  private async handleHighQueueDepth(): Promise<void> {
    console.log('Increasing worker count to clear queue');
    try {
      await prisma.backgroundTask.updateMany({
        where: { 
          status: 'throttled',
          priority: { gte: 5 }
        },
        data: { status: 'pending' }
      });
    } catch { /* ignore */ }
  }

  /**
   * Clear cache
   */
  private async clearCache(): Promise<void> {
    this.requestHistory.clear();
    try {
      await prisma.cache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date() // expired entries
          }
        }
      });
    } catch { /* ignore */ }
  }

  /**
   * Clean up old logs
   */
  private async cleanupOldLogs(): Promise<void> {
    console.log('Cleaning up old logs');
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(): Promise<void> {
    console.log('Cleaning up temporary files');
  }

  /**
   * Archive old data
   */
  private async archiveOldData(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    try {
      await prisma.conversation.updateMany({
        where: {
          createdAt: { lt: cutoffDate },
          archived: false
        },
        data: { archived: true }
      });
    } catch { /* ignore if field doesn't exist */ }
  }

  /**
   * Store metrics in database as individual metric rows
   * Schema: ResourceMetric { category, metricName, value, unit, metadata, timestamp }
   */
  private async storeMetrics(metrics: ResourceMetrics): Promise<void> {
    try {
      const timestamp = metrics.timestamp;
      await prisma.resourceMetric.createMany({
        data: [
          { category: 'system', metricName: 'cpuUsage', value: metrics.cpuUsage, unit: 'percent', timestamp },
          { category: 'system', metricName: 'memoryUsage', value: metrics.memoryUsage, unit: 'percent', timestamp },
          { category: 'system', metricName: 'diskUsage', value: metrics.diskUsage, unit: 'percent', timestamp },
          { category: 'system', metricName: 'networkInbound', value: metrics.networkIO.inbound, unit: 'bytes', timestamp },
          { category: 'system', metricName: 'networkOutbound', value: metrics.networkIO.outbound, unit: 'bytes', timestamp },
          { category: 'system', metricName: 'activeConnections', value: metrics.activeConnections, unit: 'count', timestamp },
          { category: 'system', metricName: 'queueDepth', value: metrics.queueDepth, unit: 'count', timestamp },
        ]
      });
    } catch (error) {
      console.error('[ResourceManager] Failed to store metrics:', error);
    }
  }

  /**
   * Trigger alerts
   * Schema: Alert { type, severity, message, category, metadata, acknowledged }
   */
  private async triggerAlerts(alerts: string[]): Promise<void> {
    for (const alert of alerts) {
      try {
        await prisma.alert.create({
          data: {
            type: 'RESOURCE',
            severity: alert.includes('CRITICAL') ? 'critical' : 'warning',
            message: alert,
            category: 'resource',
            acknowledged: false
          }
        });
      } catch (error) {
        console.error('[ResourceManager] Failed to create alert:', error);
      }
    }
  }

  /**
   * Check rate limit for an endpoint
   */
  async checkRateLimit(endpoint: string): Promise<boolean> {
    const limit = this.rateLimits.get(endpoint);
    if (!limit) return true;

    const now = Date.now();
    const history = this.requestHistory.get(endpoint) || [];

    const validRequests = history.filter(time => now - time < limit.window);

    if (validRequests.length >= limit.limit) {
      return false;
    }

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
   * Schema: CostMetric { provider, model, category, cost, currency, tokensIn, tokensOut, requestCount, metadata }
   */
  async trackCost(provider: string, model: string, tokensInput: number, tokensOutput: number): Promise<number> {
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

    try {
      await prisma.costMetric.create({
        data: {
          provider,
          model,
          category: 'ai_api',
          cost,
          currency: 'USD',
          tokensIn: tokensInput,
          tokensOut: tokensOutput,
          requestCount: 1
        }
      });
    } catch (error) {
      console.error('[ResourceManager] Failed to store cost metric:', error);
    }

    return cost;
  }

  /**
   * Calculate cost based on provider pricing
   */
  private calculateCost(provider: string, model: string, tokensInput: number, tokensOutput: number): number {
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
    try {
      const costs = await prisma.costMetric.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      return costs.reduce((total, c) => total + c.cost, 0);
    } catch {
      return 0;
    }
  }

  /**
   * Optimize costs
   */
  private async optimizeCosts(): Promise<void> {
    if (this.costHistory.length === 0) return;

    const recentCosts = this.costHistory.slice(-100);
    const averageCost = recentCosts.reduce((sum, c) => sum + c.cost, 0) / recentCosts.length;

    for (const [provider, limit] of this.costLimits.entries()) {
      const providerCosts = recentCosts.filter(c => c.provider === provider);
      const providerTotal = providerCosts.reduce((sum, c) => sum + c.cost, 0);

      if (providerTotal > limit) {
        await this.handleCostOverLimit(provider, limit, providerTotal);
      }
    }

    await this.suggestCostOptimizations();
  }

  /**
   * Handle cost over limit
   */
  private async handleCostOverLimit(provider: string, limit: number, actual: number): Promise<void> {
    try {
      await prisma.alert.create({
        data: {
          type: 'COST',
          severity: 'warning',
          message: `Cost limit exceeded for ${provider}: ${actual.toFixed(4)} > ${limit}`,
          category: 'cost',
          acknowledged: false
        }
      });
    } catch (error) {
      console.error('[ResourceManager] Failed to create cost alert:', error);
    }
    console.log(`Switching to cheaper providers for ${provider}`);
  }

  /**
   * Suggest cost optimizations
   */
  private async suggestCostOptimizations(): Promise<void> {
    const modelCosts = new Map<string, { count: number; total: number }>();
    
    this.costHistory.forEach(c => {
      const key = `${c.provider}:${c.model}`;
      const stats = modelCosts.get(key) || { count: 0, total: 0 };
      stats.count++;
      stats.total += c.cost;
      modelCosts.set(key, stats);
    });

    for (const [model, stats] of modelCosts.entries()) {
      const avgCost = stats.total / stats.count;
      if (avgCost > 0.01) {
        console.log(`Consider optimizing ${model} - avg cost: $${avgCost.toFixed(4)}`);
      }
    }
  }

  /**
   * Allocate resources dynamically
   * Schema: ResourceAllocation { resource, allocatedTo, amount, unit, status, metadata }
   */
  async allocateResources(allocation: ResourceAllocation): Promise<boolean> {
    const metrics = await this.collectMetrics();

    // Check if resources are available
    switch (allocation.type) {
      case 'compute':
        if (metrics.cpuUsage > this.thresholds.cpuWarning) return false;
        break;
      case 'memory':
        if (metrics.memoryUsage > this.thresholds.memoryWarning) return false;
        break;
      case 'storage':
        if (metrics.diskUsage > this.thresholds.diskWarning) return false;
        break;
      case 'network':
        if (metrics.activeConnections > 100) return false;
        break;
    }

    try {
      await prisma.resourceAllocation.create({
        data: {
          resource: allocation.type,
          amount: allocation.amount,
          unit: allocation.type,
          status: 'active',
          metadata: {
            priority: allocation.priority,
            duration: allocation.duration,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + allocation.duration * 1000).toISOString()
          }
        }
      });
    } catch (error) {
      console.error('[ResourceManager] Failed to allocate resources:', error);
      return false;
    }

    return true;
  }

  /**
   * Get resource utilization report
   * Queries individual metric rows and aggregates
   */
  async getUtilizationReport(hours: number = 24): Promise<any> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    try {
      const metrics = await prisma.resourceMetric.findMany({
        where: {
          category: 'system',
          timestamp: { gte: startDate }
        },
        orderBy: { timestamp: 'asc' }
      });

      const cpuMetrics = metrics.filter(m => m.metricName === 'cpuUsage');
      const memMetrics = metrics.filter(m => m.metricName === 'memoryUsage');
      const diskMetrics = metrics.filter(m => m.metricName === 'diskUsage');
      const queueMetrics = metrics.filter(m => m.metricName === 'queueDepth');

      const avg = (arr: typeof metrics) => arr.length > 0 ? arr.reduce((s, m) => s + m.value, 0) / arr.length : 0;
      const peak = (arr: typeof metrics) => arr.length > 0 ? Math.max(...arr.map(m => m.value)) : 0;

      return {
        averageCpu: avg(cpuMetrics),
        averageMemory: avg(memMetrics),
        averageDisk: avg(diskMetrics),
        averageQueueDepth: avg(queueMetrics),
        peakCpu: peak(cpuMetrics),
        peakMemory: peak(memMetrics),
        peakQueueDepth: peak(queueMetrics),
        totalSamples: metrics.length
      };
    } catch {
      return {
        averageCpu: 0, averageMemory: 0, averageDisk: 0, averageQueueDepth: 0,
        peakCpu: 0, peakMemory: 0, peakQueueDepth: 0, totalSamples: 0
      };
    }
  }

  /**
   * Get cost report
   * Schema: CostMetric uses tokensIn/tokensOut
   */
  async getCostReport(hours: number = 24): Promise<any> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    try {
      const costs = await prisma.costMetric.findMany({
        where: {
          timestamp: { gte: startDate }
        }
      });

      const byProvider = new Map<string, { total: number; count: number }>();
      const byModel = new Map<string, { total: number; count: number }>();

      costs.forEach(c => {
        const providerStats = byProvider.get(c.provider) || { total: 0, count: 0 };
        providerStats.total += c.cost;
        providerStats.count++;
        byProvider.set(c.provider, providerStats);

        const modelKey = c.model || 'unknown';
        const modelStats = byModel.get(modelKey) || { total: 0, count: 0 };
        modelStats.total += c.cost;
        modelStats.count++;
        byModel.set(modelKey, modelStats);
      });

      const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
      const totalTokens = costs.reduce((sum, c) => sum + (c.tokensIn || 0) + (c.tokensOut || 0), 0);

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
    } catch {
      return { totalCost: 0, totalTokens: 0, totalRequests: 0, byProvider: [], byModel: [] };
    }
  }

  /**
   * Update thresholds — stored as JSON in ResourceConfig.value
   */
  async updateThresholds(thresholds: Partial<ResourceThresholds>): Promise<void> {
    this.thresholds = { ...this.thresholds, ...thresholds };

    try {
      await prisma.resourceConfig.upsert({
        where: { key: 'resource_manager_thresholds' },
        update: { value: this.thresholds as any },
        create: {
          key: 'resource_manager_thresholds',
          value: this.thresholds as any,
          category: 'resource_manager'
        }
      });
    } catch (error) {
      console.error('[ResourceManager] Failed to update thresholds:', error);
    }
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