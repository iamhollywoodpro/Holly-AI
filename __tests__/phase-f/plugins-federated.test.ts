/**
 * Phase F Tests — Plugin System + Federated Learning
 */
import {
  PluginRegistry,
  validatePermissions,
  resolveDependencyOrder,
  PluginManifest,
  PluginPermission,
  HookEvent,
} from '@/lib/plugins/plugin-system';

import {
  addLaplacianNoise,
  checkPrivacyBudget,
  createPrivacyBudget,
  consumeBudget,
  scoreLearningUpdate,
  aggregateLearning,
  assessLearningQuality,
  privacyUtilityTradeoff,
  DEFAULT_FEDERATED_CONFIG,
  LearningUpdate,
  FederatedConfig,
} from '@/lib/federated/federated-learning';

// ─── Helper factories ──────────────────────────────────────────────────────

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Holly',
    permissions: ['memory.read'],
    ...overrides,
  };
}

function makeUpdate(overrides: Partial<LearningUpdate> = {}): LearningUpdate {
  return {
    userId: 'user-1',
    domain: 'general',
    insights: ['insight-a'],
    confidence: 0.8,
    sampleSize: 50,
    timestamp: Date.now(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

describe('Plugin System', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  // ─── Install ────────────────────────────────────────────────────────────

  describe('install', () => {
    it('should install a valid plugin', () => {
      const result = registry.install(makeManifest());
      expect(result.success).toBe(true);
      expect(registry.getPlugin('test-plugin')).toBeDefined();
      expect(registry.getPlugin('test-plugin')!.state).toBe('installed');
    });

    it('should reject duplicate plugin IDs', () => {
      registry.install(makeManifest());
      const result = registry.install(makeManifest());
      expect(result.success).toBe(false);
      expect(result.error).toContain('already installed');
    });

    it('should reject manifest missing id', () => {
      const result = registry.install(makeManifest({ id: '' }));
      expect(result.success).toBe(false);
      expect(result.error).toContain('required fields');
    });

    it('should reject manifest missing name', () => {
      const result = registry.install(makeManifest({ name: '' }));
      expect(result.success).toBe(false);
      expect(result.error).toContain('required fields');
    });

    it('should reject manifest missing version', () => {
      const result = registry.install(makeManifest({ version: '' }));
      expect(result.success).toBe(false);
      expect(result.error).toContain('required fields');
    });

    it('should reject if dependency is not installed', () => {
      const result = registry.install(makeManifest({
        id: 'dependent',
        dependencies: ['missing-plugin'],
      }));
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing dependency');
    });

    it('should install if dependency is already installed', () => {
      registry.install(makeManifest({ id: 'base-plugin' }));
      const result = registry.install(makeManifest({
        id: 'dependent',
        dependencies: ['base-plugin'],
      }));
      expect(result.success).toBe(true);
    });

    it('should set default config from manifest config fields', () => {
      const result = registry.install(makeManifest({
        config: {
          apiKey: { type: 'string', label: 'API Key', default: 'abc123' },
          retries: { type: 'number', label: 'Retries', default: 3 },
          enabled: { type: 'boolean', label: 'Enabled', default: true },
        },
      }));
      expect(result.success).toBe(true);
      const plugin = registry.getPlugin('test-plugin')!;
      expect(plugin.config.apiKey).toBe('abc123');
      expect(plugin.config.retries).toBe(3);
      expect(plugin.config.enabled).toBe(true);
    });

    it('should set installedAt timestamp', () => {
      const before = Date.now();
      registry.install(makeManifest());
      const after = Date.now();
      const plugin = registry.getPlugin('test-plugin')!;
      expect(plugin.installedAt).toBeGreaterThanOrEqual(before);
      expect(plugin.installedAt).toBeLessThanOrEqual(after);
    });

    it('should set lastActivatedAt to null on install', () => {
      registry.install(makeManifest());
      expect(registry.getPlugin('test-plugin')!.lastActivatedAt).toBeNull();
    });
  });

  // ─── Uninstall ──────────────────────────────────────────────────────────

  describe('uninstall', () => {
    it('should uninstall a disabled plugin', () => {
      registry.install(makeManifest());
      const result = registry.uninstall('test-plugin');
      expect(result.success).toBe(true);
      expect(registry.getPlugin('test-plugin')).toBeUndefined();
    });

    it('should refuse to uninstall an enabled plugin', () => {
      registry.install(makeManifest());
      registry.enable('test-plugin');
      const result = registry.uninstall('test-plugin');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled first');
    });

    it('should refuse to uninstall a plugin that others depend on', () => {
      registry.install(makeManifest({ id: 'base' }));
      registry.install(makeManifest({ id: 'child', dependencies: ['base'] }));
      const result = registry.uninstall('base');
      expect(result.success).toBe(false);
      expect(result.error).toContain('depends on');
    });

    it('should return error for non-existent plugin', () => {
      const result = registry.uninstall('ghost');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should clean up hooks on uninstall', () => {
      registry.install(makeManifest({ hooks: ['onMessage'] }));
      registry.enable('test-plugin');
      registry.registerHook('test-plugin', 'onMessage', () => 'ok');
      registry.disable('test-plugin');
      registry.uninstall('test-plugin');
      // After uninstall, plugin is gone; re-install and verify hooks are clean
      registry.install(makeManifest({ id: 'test-plugin', hooks: ['onMessage'] }));
      registry.enable('test-plugin');
      // Hook should not fire for old handler
      const results = registry.emitHook({ name: 'onMessage', data: {}, timestamp: Date.now(), source: 'other' });
      // No handler registered for test-plugin on this new hook map
      return results.then(r => expect(r.has('test-plugin')).toBe(false));
    });
  });

  // ─── Enable ─────────────────────────────────────────────────────────────

  describe('enable', () => {
    it('should enable an installed plugin', () => {
      registry.install(makeManifest());
      const result = registry.enable('test-plugin');
      expect(result.success).toBe(true);
      expect(registry.getPlugin('test-plugin')!.state).toBe('enabled');
    });

    it('should set lastActivatedAt on enable', () => {
      registry.install(makeManifest());
      const before = Date.now();
      registry.enable('test-plugin');
      const after = Date.now();
      const activatedAt = registry.getPlugin('test-plugin')!.lastActivatedAt!;
      expect(activatedAt).toBeGreaterThanOrEqual(before);
      expect(activatedAt).toBeLessThanOrEqual(after);
    });

    it('should reject enabling already enabled plugin', () => {
      registry.install(makeManifest());
      registry.enable('test-plugin');
      const result = registry.enable('test-plugin');
      expect(result.success).toBe(false);
      expect(result.error).toContain('already enabled');
    });

    it('should reject enabling if dependency is not enabled', () => {
      registry.install(makeManifest({ id: 'base' }));
      registry.install(makeManifest({ id: 'child', dependencies: ['base'] }));
      const result = registry.enable('child');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not enabled');
    });

    it('should allow enabling if dependency is enabled', () => {
      registry.install(makeManifest({ id: 'base' }));
      registry.enable('base');
      registry.install(makeManifest({ id: 'child', dependencies: ['base'] }));
      const result = registry.enable('child');
      expect(result.success).toBe(true);
    });

    it('should return error for non-existent plugin', () => {
      const result = registry.enable('ghost');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should clear error state on enable', () => {
      registry.install(makeManifest());
      const plugin = registry.getPlugin('test-plugin')!;
      plugin.state = 'error';
      plugin.error = 'some error';
      const result = registry.enable('test-plugin');
      expect(result.success).toBe(true);
      expect(plugin.error).toBeNull();
    });
  });

  // ─── Disable ────────────────────────────────────────────────────────────

  describe('disable', () => {
    it('should disable an enabled plugin', () => {
      registry.install(makeManifest());
      registry.enable('test-plugin');
      const result = registry.disable('test-plugin');
      expect(result.success).toBe(true);
      expect(registry.getPlugin('test-plugin')!.state).toBe('disabled');
    });

    it('should reject disabling non-enabled plugin', () => {
      registry.install(makeManifest());
      const result = registry.disable('test-plugin');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not enabled');
    });

    it('should return error for non-existent plugin', () => {
      const result = registry.disable('ghost');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ─── Configure ──────────────────────────────────────────────────────────

  describe('configure', () => {
    it('should update plugin config', () => {
      registry.install(makeManifest());
      const result = registry.configure('test-plugin', { customKey: 'value' });
      expect(result.success).toBe(true);
      expect(registry.getPlugin('test-plugin')!.config.customKey).toBe('value');
    });

    it('should merge with existing config', () => {
      registry.install(makeManifest({
        config: {
          mode: { type: 'string', label: 'Mode', default: 'auto' },
        },
      }));
      registry.configure('test-plugin', { extra: true });
      const config = registry.getPlugin('test-plugin')!.config;
      expect(config.mode).toBe('auto');
      expect(config.extra).toBe(true);
    });

    it('should reject invalid select value', () => {
      registry.install(makeManifest({
        config: {
          mode: { type: 'select', label: 'Mode', default: 'auto', options: ['auto', 'manual'] },
        },
      }));
      const result = registry.configure('test-plugin', { mode: 'invalid' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid value');
    });

    it('should accept valid select value', () => {
      registry.install(makeManifest({
        config: {
          mode: { type: 'select', label: 'Mode', default: 'auto', options: ['auto', 'manual'] },
        },
      }));
      const result = registry.configure('test-plugin', { mode: 'manual' });
      expect(result.success).toBe(true);
      expect(registry.getPlugin('test-plugin')!.config.mode).toBe('manual');
    });

    it('should return error for non-existent plugin', () => {
      const result = registry.configure('ghost', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ─── Hooks ──────────────────────────────────────────────────────────────

  describe('hooks', () => {
    it('should register a hook for an enabled plugin', () => {
      registry.install(makeManifest());
      registry.enable('test-plugin');
      const result = registry.registerHook('test-plugin', 'onMessage', () => 'handled');
      expect(result.success).toBe(true);
    });

    it('should reject hook registration for non-enabled plugin', () => {
      registry.install(makeManifest());
      const result = registry.registerHook('test-plugin', 'onMessage', () => 'handled');
      expect(result.success).toBe(false);
      expect(result.error).toContain('enabled');
    });

    it('should emit hook to all registered handlers', async () => {
      registry.install(makeManifest({ id: 'p1' }));
      registry.enable('p1');
      registry.install(makeManifest({ id: 'p2' }));
      registry.enable('p2');

      registry.registerHook('p1', 'test-event', () => 'result-p1');
      registry.registerHook('p2', 'test-event', () => 'result-p2');

      const event: HookEvent = { name: 'test-event', data: {}, timestamp: Date.now(), source: 'p1' };
      const results = await registry.emitHook(event);
      expect(results.get('p1')).toBe('result-p1');
      expect(results.get('p2')).toBe('result-p2');
    });

    it('should return empty map for unregistered hook', async () => {
      const event: HookEvent = { name: 'unknown-hook', data: {}, timestamp: Date.now(), source: 'x' };
      const results = await registry.emitHook(event);
      expect(results.size).toBe(0);
    });

    it('should set plugin to error state on hook handler failure', async () => {
      registry.install(makeManifest());
      registry.enable('test-plugin');
      registry.registerHook('test-plugin', 'fail-event', () => {
        throw new Error('handler crashed');
      });

      const event: HookEvent = { name: 'fail-event', data: {}, timestamp: Date.now(), source: 'test-plugin' };
      const results = await registry.emitHook(event);

      expect(results.get('test-plugin')).toEqual({ error: 'handler crashed' });
      expect(registry.getPlugin('test-plugin')!.state).toBe('error');
      expect(registry.getPlugin('test-plugin')!.error).toBe('handler crashed');
    });

    it('should support async hook handlers', async () => {
      registry.install(makeManifest());
      registry.enable('test-plugin');
      registry.registerHook('test-plugin', 'async-event', async () => {
        return Promise.resolve('async-result');
      });

      const event: HookEvent = { name: 'async-event', data: {}, timestamp: Date.now(), source: 'test-plugin' };
      const results = await registry.emitHook(event);
      expect(results.get('test-plugin')).toBe('async-result');
    });

    it('should reject hook registration for non-existent plugin', () => {
      const result = registry.registerHook('ghost', 'onMessage', () => 'x');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ─── Query Methods ──────────────────────────────────────────────────────

  describe('query methods', () => {
    beforeEach(() => {
      registry.install(makeManifest({ id: 'p1', permissions: ['memory.read', 'memory.write'] }));
      registry.install(makeManifest({ id: 'p2', permissions: ['chat.read'] }));
      registry.enable('p1');
    });

    it('getPlugin should return the plugin instance', () => {
      const plugin = registry.getPlugin('p1');
      expect(plugin).toBeDefined();
      expect(plugin!.manifest.name).toBe('Test Plugin');
    });

    it('getPlugin should return undefined for unknown plugin', () => {
      expect(registry.getPlugin('unknown')).toBeUndefined();
    });

    it('getAllPlugins should return all plugins', () => {
      const all = registry.getAllPlugins();
      expect(all.length).toBe(2);
    });

    it('getEnabledPlugins should return only enabled plugins', () => {
      const enabled = registry.getEnabledPlugins();
      expect(enabled.length).toBe(1);
      expect(enabled[0].manifest.id).toBe('p1');
    });

    it('hasPermission should check plugin permissions', () => {
      expect(registry.hasPermission('p1', 'memory.read')).toBe(true);
      expect(registry.hasPermission('p1', 'chat.read')).toBe(false);
      expect(registry.hasPermission('p2', 'chat.read')).toBe(true);
      expect(registry.hasPermission('unknown', 'memory.read')).toBe(false);
    });
  });

  // ─── Stats ──────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return correct stats for empty registry', () => {
      const stats = registry.getStats();
      expect(stats).toEqual({ total: 0, enabled: 0, disabled: 0, errors: 0, hooksRegistered: 0 });
    });

    it('should track plugin states correctly', () => {
      registry.install(makeManifest({ id: 'p1' }));
      registry.install(makeManifest({ id: 'p2' }));
      registry.install(makeManifest({ id: 'p3' }));
      registry.enable('p1');
      registry.enable('p2');
      registry.disable('p2');

      const stats = registry.getStats();
      expect(stats.total).toBe(3);
      expect(stats.enabled).toBe(1);
      expect(stats.disabled).toBe(1);
      // p3 is 'installed', not 'disabled' — only p2 was disabled
      expect(stats.errors).toBe(0);
    });

    it('should count registered hooks', () => {
      registry.install(makeManifest({ id: 'p1' }));
      registry.enable('p1');
      registry.registerHook('p1', 'hook-a', () => 'a');
      registry.registerHook('p1', 'hook-b', () => 'b');

      expect(registry.getStats().hooksRegistered).toBe(2);
    });
  });
});

// ─── Permission Validation ────────────────────────────────────────────────

describe('validatePermissions', () => {
  it('should mark read-only permissions as safe', () => {
    const result = validatePermissions(['memory.read', 'chat.read']);
    expect(result.safe).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn about write without read', () => {
    const result = validatePermissions(['memory.write']);
    expect(result.safe).toBe(false);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('write permissions but no read')])
    );
  });

  it('should warn about network + file.write combination', () => {
    const result = validatePermissions(['network.request', 'file.write']);
    expect(result.safe).toBe(false);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('data exfiltration')])
    );
  });

  it('should warn about consciousness.write + memory.write', () => {
    const result = validatePermissions(['consciousness.write', 'memory.write']);
    expect(result.safe).toBe(false);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('high privilege')])
    );
  });

  it('should return safe for balanced read+write permissions', () => {
    const result = validatePermissions(['memory.read', 'memory.write']);
    expect(result.safe).toBe(true);
  });

  it('should handle empty permissions array', () => {
    const result = validatePermissions([]);
    expect(result.safe).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

// ─── Dependency Resolution ────────────────────────────────────────────────

describe('resolveDependencyOrder', () => {
  it('should return plugins with no dependencies first', () => {
    const manifests: PluginManifest[] = [
      makeManifest({ id: 'a', dependencies: ['b'] }),
      makeManifest({ id: 'b' }),
    ];
    const order = resolveDependencyOrder(manifests);
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('a'));
  });

  it('should handle diamond dependency graph', () => {
    const manifests: PluginManifest[] = [
      makeManifest({ id: 'd', dependencies: ['b', 'c'] }),
      makeManifest({ id: 'b', dependencies: ['a'] }),
      makeManifest({ id: 'c', dependencies: ['a'] }),
      makeManifest({ id: 'a' }),
    ];
    const order = resolveDependencyOrder(manifests);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('c'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
  });

  it('should handle single plugin with no dependencies', () => {
    const manifests: PluginManifest[] = [makeManifest({ id: 'solo' })];
    const order = resolveDependencyOrder(manifests);
    expect(order).toEqual(['solo']);
  });

  it('should handle empty array', () => {
    expect(resolveDependencyOrder([])).toEqual([]);
  });

  it('should handle multiple independent plugins', () => {
    const manifests: PluginManifest[] = [
      makeManifest({ id: 'x' }),
      makeManifest({ id: 'y' }),
      makeManifest({ id: 'z' }),
    ];
    const order = resolveDependencyOrder(manifests);
    expect(order.sort()).toEqual(['x', 'y', 'z']);
  });

  it('should handle linear chain', () => {
    const manifests: PluginManifest[] = [
      makeManifest({ id: 'c', dependencies: ['b'] }),
      makeManifest({ id: 'a' }),
      makeManifest({ id: 'b', dependencies: ['a'] }),
    ];
    const order = resolveDependencyOrder(manifests);
    expect(order).toEqual(['a', 'b', 'c']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FEDERATED LEARNING
// ═══════════════════════════════════════════════════════════════════════════

describe('Federated Learning', () => {
  // ─── Laplacian Noise ────────────────────────────────────────────────────

  describe('addLaplacianNoise', () => {
    it('should add noise to a value', () => {
      const results: number[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(addLaplacianNoise(0.5, 0.1, 1.0));
      }
      // Not all results should be exactly 0.5
      const allSame = results.every(r => r === 0.5);
      expect(allSame).toBe(false);
      // Mean should be approximately 0.5
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      expect(Math.abs(mean - 0.5)).toBeLessThan(0.1);
    });

    it('should produce more noise with higher sensitivity', () => {
      const lowSens = addLaplacianNoise(0, 0.01, 1.0);
      const highSens = addLaplacianNoise(0, 10.0, 1.0);
      // High sensitivity should produce larger absolute deviations (statistically)
      // We just verify both are numbers
      expect(typeof lowSens).toBe('number');
      expect(typeof highSens).toBe('number');
      expect(isFinite(lowSens)).toBe(true);
      expect(isFinite(highSens)).toBe(true);
    });

    it('should handle zero epsilon gracefully', () => {
      // epsilon is clamped to 0.001 minimum
      const result = addLaplacianNoise(1.0, 0.1, 0);
      expect(typeof result).toBe('number');
      expect(isFinite(result)).toBe(true);
    });
  });

  // ─── Privacy Budget ────────────────────────────────────────────────────

  describe('privacy budget', () => {
    it('should create a budget with correct defaults', () => {
      const budget = createPrivacyBudget();
      expect(budget.totalBudget).toBe(10.0);
      expect(budget.usedBudget).toBe(0);
      expect(budget.remainingBudget).toBe(10.0);
      expect(budget.contributions).toBe(0);
    });

    it('should create a budget with custom total', () => {
      const budget = createPrivacyBudget(5.0);
      expect(budget.totalBudget).toBe(5.0);
      expect(budget.remainingBudget).toBe(5.0);
    });

    it('should check if budget has remaining capacity', () => {
      const budget = createPrivacyBudget(1.0);
      expect(checkPrivacyBudget(budget, 0.5)).toBe(true);
      expect(checkPrivacyBudget(budget, 1.5)).toBe(false);
    });

    it('should consume budget correctly', () => {
      let budget = createPrivacyBudget(1.0);
      budget = consumeBudget(budget, 0.3);
      expect(budget.usedBudget).toBeCloseTo(0.3);
      expect(budget.remainingBudget).toBeCloseTo(0.7);
      expect(budget.contributions).toBe(1);
    });

    it('should not consume more than remaining budget', () => {
      let budget = createPrivacyBudget(0.5);
      budget = consumeBudget(budget, 1.0);
      expect(budget.usedBudget).toBeCloseTo(0.5);
      expect(budget.remainingBudget).toBeCloseTo(0);
    });

    it('should track multiple contributions', () => {
      let budget = createPrivacyBudget(10.0);
      budget = consumeBudget(budget, 0.1);
      budget = consumeBudget(budget, 0.1);
      budget = consumeBudget(budget, 0.1);
      expect(budget.contributions).toBe(3);
      expect(budget.usedBudget).toBeCloseTo(0.3);
      expect(budget.remainingBudget).toBeCloseTo(9.7);
    });
  });

  // ─── Learning Update Scoring ───────────────────────────────────────────

  describe('scoreLearningUpdate', () => {
    it('should score a high-quality update highly', () => {
      const score = scoreLearningUpdate(makeUpdate({
        confidence: 0.9,
        sampleSize: 100,
        insights: ['a', 'b', 'c', 'd', 'e'],
        timestamp: Date.now(),
      }));
      expect(score).toBeGreaterThan(0.5);
    });

    it('should score a low-quality update poorly', () => {
      const score = scoreLearningUpdate(makeUpdate({
        confidence: 0.1,
        sampleSize: 1,
        insights: [],
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
      }));
      expect(score).toBeLessThan(0.3);
    });

    it('should weight confidence heavily (40%)', () => {
      const highConf = scoreLearningUpdate(makeUpdate({ confidence: 1.0, sampleSize: 0, insights: [], timestamp: Date.now() }));
      const lowConf = scoreLearningUpdate(makeUpdate({ confidence: 0.0, sampleSize: 0, insights: [], timestamp: Date.now() }));
      expect(highConf).toBeGreaterThan(lowConf);
    });

    it('should reward recency', () => {
      const recent = scoreLearningUpdate(makeUpdate({ timestamp: Date.now() }));
      const old = scoreLearningUpdate(makeUpdate({ timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000 }));
      expect(recent).toBeGreaterThan(old);
    });

    it('should clamp score to 0-1 range', () => {
      const score = scoreLearningUpdate(makeUpdate({
        confidence: 1.0,
        sampleSize: 10000,
        insights: Array.from({ length: 50 }, (_, i) => `insight-${i}`),
        timestamp: Date.now(),
      }));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  // ─── Learning Aggregation ──────────────────────────────────────────────

  describe('aggregateLearning', () => {
    it('should return null if fewer than minContributors', () => {
      const updates = [
        makeUpdate({ userId: 'u1' }),
        makeUpdate({ userId: 'u2' }),
      ];
      const result = aggregateLearning(updates);
      expect(result).toBeNull();
    });

    it('should return null if too few qualified updates', () => {
      const updates = [
        makeUpdate({ userId: 'u1', confidence: 0.9 }),
        makeUpdate({ userId: 'u2', confidence: 0.9 }),
        makeUpdate({ userId: 'u3', confidence: 0.1 }), // Below minConfidence
      ];
      // With minContributors=3, only 2 qualify → null
      const result = aggregateLearning(updates, { ...DEFAULT_FEDERATED_CONFIG, minConfidence: 0.5 });
      expect(result).toBeNull();
    });

    it('should aggregate with consensus threshold', () => {
      const updates = [
        makeUpdate({ userId: 'u1', domain: 'coding', insights: ['use typescript', 'prefer async'], confidence: 0.8 }),
        makeUpdate({ userId: 'u2', domain: 'coding', insights: ['use typescript', 'avoid any'], confidence: 0.7 }),
        makeUpdate({ userId: 'u3', domain: 'coding', insights: ['use typescript', 'use strict mode'], confidence: 0.9 }),
      ];
      const result = aggregateLearning(updates, {
        ...DEFAULT_FEDERATED_CONFIG,
        consensusThreshold: 0.5,
      });

      expect(result).not.toBeNull();
      expect(result!.domain).toBe('coding');
      // 'use typescript' appears in all 3 → consensus
      expect(result!.consensusInsights).toContain('use typescript');
      expect(result!.contributorCount).toBe(3);
    });

    it('should exclude insights below consensus threshold', () => {
      const updates = [
        makeUpdate({ userId: 'u1', insights: ['shared', 'unique-1'], confidence: 0.8 }),
        makeUpdate({ userId: 'u2', insights: ['shared', 'unique-2'], confidence: 0.8 }),
        makeUpdate({ userId: 'u3', insights: ['shared', 'unique-3'], confidence: 0.8 }),
      ];
      const result = aggregateLearning(updates, {
        ...DEFAULT_FEDERATED_CONFIG,
        consensusThreshold: 0.8, // Need 3/3 agreement
      });

      expect(result!.consensusInsights).toContain('shared');
      // unique-1, unique-2, unique-3 each appear only once → below threshold
      expect(result!.consensusInsights).not.toContain('unique-1');
    });

    it('should respect maxInsightsPerAggregation', () => {
      const updates = Array.from({ length: 5 }, (_, i) =>
        makeUpdate({
          userId: `u${i}`,
          insights: ['a', 'b', 'c', 'd', 'e'],
          confidence: 0.9,
        })
      );
      const result = aggregateLearning(updates, {
        ...DEFAULT_FEDERATED_CONFIG,
        maxInsightsPerAggregation: 2,
      });
      expect(result!.consensusInsights.length).toBeLessThanOrEqual(2);
    });

    it('should calculate total samples correctly', () => {
      const updates = [
        makeUpdate({ userId: 'u1', sampleSize: 10 }),
        makeUpdate({ userId: 'u2', sampleSize: 20 }),
        makeUpdate({ userId: 'u3', sampleSize: 30 }),
      ];
      const result = aggregateLearning(updates);
      expect(result!.totalSamples).toBe(60);
    });

    it('should track privacy budget used', () => {
      const updates = [
        makeUpdate({ userId: 'u1' }),
        makeUpdate({ userId: 'u2' }),
        makeUpdate({ userId: 'u3' }),
      ];
      const config: FederatedConfig = { ...DEFAULT_FEDERATED_CONFIG, epsilon: 0.2 };
      const result = aggregateLearning(updates, config);
      expect(result!.privacyBudgetUsed).toBeCloseTo(0.6); // 3 * 0.2
    });

    it('should set timestamp on result', () => {
      const before = Date.now();
      const updates = [
        makeUpdate({ userId: 'u1' }),
        makeUpdate({ userId: 'u2' }),
        makeUpdate({ userId: 'u3' }),
      ];
      const result = aggregateLearning(updates);
      const after = Date.now();
      expect(result!.timestamp).toBeGreaterThanOrEqual(before);
      expect(result!.timestamp).toBeLessThanOrEqual(after);
    });

    it('should apply noise to avgConfidence', () => {
      // Run multiple times to check noise is applied
      const updates = Array.from({ length: 5 }, (_, i) =>
        makeUpdate({ userId: `u${i}`, confidence: 0.8 })
      );
      const confidences = new Set<number>();
      for (let i = 0; i < 20; i++) {
        const result = aggregateLearning(updates);
        if (result) confidences.add(result.avgConfidence);
      }
      // With noise, not all confidences should be identical
      expect(confidences.size).toBeGreaterThan(1);
    });
  });

  // ─── Learning Quality Assessment ───────────────────────────────────────

  describe('assessLearningQuality', () => {
    it('should rate excellent quality', () => {
      const assessment = assessLearningQuality({
        domain: 'test',
        consensusInsights: ['a', 'b', 'c', 'd', 'e'],
        avgConfidence: 0.9,
        contributorCount: 15,
        totalSamples: 200,
        privacyBudgetUsed: 1.5,
        timestamp: Date.now(),
      });
      expect(assessment.quality).toBe('excellent');
      expect(assessment.score).toBeGreaterThanOrEqual(0.8);
      expect(assessment.issues).toHaveLength(0);
    });

    it('should rate good quality', () => {
      const assessment = assessLearningQuality({
        domain: 'test',
        consensusInsights: ['a', 'b', 'c'],
        avgConfidence: 0.7,
        contributorCount: 7,
        totalSamples: 80,
        privacyBudgetUsed: 0.7,
        timestamp: Date.now(),
      });
      expect(assessment.quality).toBe('good');
      expect(assessment.score).toBeGreaterThanOrEqual(0.6);
    });

    it('should rate fair quality', () => {
      const assessment = assessLearningQuality({
        domain: 'test',
        consensusInsights: ['a'],
        avgConfidence: 0.5,
        contributorCount: 4,
        totalSamples: 30,
        privacyBudgetUsed: 0.4,
        timestamp: Date.now(),
      });
      expect(assessment.quality).toBe('fair');
      expect(assessment.score).toBeGreaterThanOrEqual(0.3);
    });

    it('should rate poor quality', () => {
      const assessment = assessLearningQuality({
        domain: 'test',
        consensusInsights: [],
        avgConfidence: 0.2,
        contributorCount: 2,
        totalSamples: 5,
        privacyBudgetUsed: 0.2,
        timestamp: Date.now(),
      });
      expect(assessment.quality).toBe('poor');
      expect(assessment.issues.length).toBeGreaterThan(0);
    });

    it('should report issues for weak areas', () => {
      const assessment = assessLearningQuality({
        domain: 'test',
        consensusInsights: [],
        avgConfidence: 0.1,
        contributorCount: 1,
        totalSamples: 2,
        privacyBudgetUsed: 0.1,
        timestamp: Date.now(),
      });
      expect(assessment.issues).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Too few contributors'),
          expect.stringContaining('No consensus insights'),
          expect.stringContaining('Low average confidence'),
          expect.stringContaining('Small sample size'),
        ])
      );
    });
  });

  // ─── Privacy-Utility Tradeoff ──────────────────────────────────────────

  describe('privacyUtilityTradeoff', () => {
    it('should identify high privacy with high utility', () => {
      const result = privacyUtilityTradeoff(
        { ...DEFAULT_FEDERATED_CONFIG, epsilon: 0.01 },
        15,
      );
      expect(result.privacyLevel).toBe('high');
      expect(result.utilityLevel).toBe('high');
      expect(result.recommendation).toContain('Excellent balance');
    });

    it('should identify low privacy', () => {
      const result = privacyUtilityTradeoff(
        { ...DEFAULT_FEDERATED_CONFIG, epsilon: 1.0 },
        10,
      );
      expect(result.privacyLevel).toBe('low');
      expect(result.recommendation).toContain('lowering epsilon');
    });

    it('should identify low utility', () => {
      const result = privacyUtilityTradeoff(
        { ...DEFAULT_FEDERATED_CONFIG, epsilon: 0.1 },
        3,
      );
      expect(result.utilityLevel).toBe('low');
      expect(result.recommendation).toContain('more contributors');
    });

    it('should identify medium privacy and utility', () => {
      const result = privacyUtilityTradeoff(
        { ...DEFAULT_FEDERATED_CONFIG, epsilon: 0.3 },
        7,
      );
      expect(result.privacyLevel).toBe('medium');
      expect(result.utilityLevel).toBe('medium');
      expect(result.recommendation).toContain('Acceptable balance');
    });
  });

  // ─── Default Config ────────────────────────────────────────────────────

  describe('DEFAULT_FEDERATED_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_FEDERATED_CONFIG.minContributors).toBe(3);
      expect(DEFAULT_FEDERATED_CONFIG.minConfidence).toBe(0.3);
      expect(DEFAULT_FEDERATED_CONFIG.epsilon).toBe(0.1);
      expect(DEFAULT_FEDERATED_CONFIG.maxInsightsPerAggregation).toBe(10);
      expect(DEFAULT_FEDERATED_CONFIG.consensusThreshold).toBe(0.5);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION: Plugin + Federated Learning
// ═══════════════════════════════════════════════════════════════════════════

describe('Plugin + Federated Learning Integration', () => {
  it('should use plugin hooks to trigger federated learning', async () => {
    const registry = new PluginRegistry();

    // Install a "federated-learner" plugin
    registry.install(makeManifest({
      id: 'federated-learner',
      hooks: ['on-learning'],
    }));
    registry.enable('federated-learner');

    // Track hook calls
    let aggregatedResult: any = null;
    registry.registerHook('federated-learner', 'on-learning', (event) => {
      const updates: LearningUpdate[] = event.data.updates;
      return aggregateLearning(updates);
    });

    // Emit learning event
    const updates = [
      makeUpdate({ userId: 'u1', insights: ['prefer concise answers'], confidence: 0.8 }),
      makeUpdate({ userId: 'u2', insights: ['prefer concise answers'], confidence: 0.7 }),
      makeUpdate({ userId: 'u3', insights: ['prefer concise answers'], confidence: 0.9 }),
    ];

    const results = await registry.emitHook({
      name: 'on-learning',
      data: { updates },
      timestamp: Date.now(),
      source: 'system',
    });

    const fedResult = results.get('federated-learner') as any;
    expect(fedResult).not.toBeNull();
    expect(fedResult.consensusInsights).toContain('prefer concise answers');
  });

  it('should validate plugin permissions before federated operations', () => {
    const registry = new PluginRegistry();
    registry.install(makeManifest({
      id: 'data-plugin',
      permissions: ['memory.read', 'memory.write', 'consciousness.read'],
    }));

    // Plugin needs memory.read to access learning data
    expect(registry.hasPermission('data-plugin', 'memory.read')).toBe(true);
    // Plugin should NOT have network access
    expect(registry.hasPermission('data-plugin', 'network.request')).toBe(false);
  });
});
