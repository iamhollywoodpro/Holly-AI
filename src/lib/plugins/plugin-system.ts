/**
 * Plugin System — Extensible plugin architecture for Holly
 *
 * Provides:
 *  - Plugin registry (install, enable, disable, configure)
 *  - Plugin lifecycle management
 *  - Permission-based sandboxing
 *  - Hook system for plugin integration
 *  - Plugin dependency resolution
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type PluginPermission =
  | 'memory.read'
  | 'memory.write'
  | 'chat.read'
  | 'chat.write'
  | 'consciousness.read'
  | 'consciousness.write'
  | 'tools.call'
  | 'network.request'
  | 'file.read'
  | 'file.write';

export type PluginState = 'installed' | 'enabled' | 'disabled' | 'error';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: PluginPermission[];
  dependencies?: string[];  // Plugin IDs this depends on
  hooks?: string[];         // Hook names this plugin subscribes to
  config?: Record<string, PluginConfigField>;
}

export interface PluginConfigField {
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  default: any;
  options?: string[];  // For select type
  required?: boolean;
}

export interface PluginInstance {
  manifest: PluginManifest;
  state: PluginState;
  installedAt: number;
  lastActivatedAt: number | null;
  config: Record<string, any>;
  error: string | null;
}

export interface HookEvent {
  name: string;
  data: Record<string, any>;
  timestamp: number;
  source: string;  // Plugin ID that triggered the event
}

export type HookHandler = (event: HookEvent) => any | Promise<any>;

// ─── Plugin Registry ────────────────────────────────────────────────────────

export class PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map();
  private hooks: Map<string, Map<string, HookHandler>> = new Map(); // hookName → pluginId → handler

  /**
   * Register (install) a new plugin.
   */
  install(manifest: PluginManifest): { success: boolean; error?: string } {
    if (this.plugins.has(manifest.id)) {
      return { success: false, error: `Plugin ${manifest.id} is already installed` };
    }

    // Validate manifest
    if (!manifest.id || !manifest.name || !manifest.version) {
      return { success: false, error: 'Plugin manifest missing required fields (id, name, version)' };
    }

    // Check dependencies
    if (manifest.dependencies) {
      for (const depId of manifest.dependencies) {
        if (!this.plugins.has(depId)) {
          return { success: false, error: `Missing dependency: ${depId}` };
        }
      }
    }

    // Build default config
    const defaultConfig: Record<string, any> = {};
    if (manifest.config) {
      for (const [key, field] of Object.entries(manifest.config)) {
        defaultConfig[key] = field.default;
      }
    }

    this.plugins.set(manifest.id, {
      manifest,
      state: 'installed',
      installedAt: Date.now(),
      lastActivatedAt: null,
      config: defaultConfig,
      error: null,
    });

    return { success: true };
  }

  /**
   * Uninstall a plugin. Must be disabled first.
   */
  uninstall(pluginId: string): { success: boolean; error?: string } {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return { success: false, error: `Plugin ${pluginId} not found` };
    if (plugin.state === 'enabled') return { success: false, error: `Plugin must be disabled first` };

    // Check if any other plugin depends on this one
    for (const [id, p] of this.plugins) {
      if (p.manifest.dependencies?.includes(pluginId)) {
        return { success: false, error: `Plugin ${id} depends on ${pluginId}` };
      }
    }

    // Remove hook handlers
    if (plugin.manifest.hooks) {
      for (const hookName of plugin.manifest.hooks) {
        this.hooks.get(hookName)?.delete(pluginId);
      }
    }

    this.plugins.delete(pluginId);
    return { success: true };
  }

  /**
   * Enable a plugin.
   */
  enable(pluginId: string): { success: boolean; error?: string } {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return { success: false, error: `Plugin ${pluginId} not found` };
    if (plugin.state === 'enabled') return { success: false, error: `Plugin already enabled` };

    // Check dependencies are enabled
    if (plugin.manifest.dependencies) {
      for (const depId of plugin.manifest.dependencies) {
        const dep = this.plugins.get(depId);
        if (!dep || dep.state !== 'enabled') {
          return { success: false, error: `Dependency ${depId} is not enabled` };
        }
      }
    }

    plugin.state = 'enabled';
    plugin.lastActivatedAt = Date.now();
    plugin.error = null;
    return { success: true };
  }

  /**
   * Disable a plugin.
   */
  disable(pluginId: string): { success: boolean; error?: string } {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return { success: false, error: `Plugin ${pluginId} not found` };
    if (plugin.state !== 'enabled') return { success: false, error: `Plugin is not enabled` };

    plugin.state = 'disabled';
    return { success: true };
  }

  /**
   * Update plugin configuration.
   */
  configure(pluginId: string, config: Record<string, any>): { success: boolean; error?: string } {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return { success: false, error: `Plugin ${pluginId} not found` };

    // Validate config against manifest
    if (plugin.manifest.config) {
      for (const [key, field] of Object.entries(plugin.manifest.config)) {
        if (field.required && config[key] === undefined && plugin.config[key] === undefined) {
          return { success: false, error: `Required config field missing: ${key}` };
        }
        if (field.type === 'select' && config[key] !== undefined) {
          if (field.options && !field.options.includes(config[key])) {
            return { success: false, error: `Invalid value for ${key}: ${config[key]}` };
          }
        }
      }
    }

    plugin.config = { ...plugin.config, ...config };
    return { success: true };
  }

  /**
   * Register a hook handler for a plugin.
   */
  registerHook(pluginId: string, hookName: string, handler: HookHandler): { success: boolean; error?: string } {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return { success: false, error: `Plugin ${pluginId} not found` };
    if (plugin.state !== 'enabled') return { success: false, error: `Plugin must be enabled to register hooks` };

    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, new Map());
    }
    this.hooks.get(hookName)!.set(pluginId, handler);
    return { success: true };
  }

  /**
   * Emit a hook event to all registered handlers.
   */
  async emitHook(event: HookEvent): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const handlers = this.hooks.get(event.name);

    if (!handlers) return results;

    for (const [pluginId, handler] of handlers) {
      try {
        const result = await handler(event);
        results.set(pluginId, result);
      } catch (err) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
          plugin.state = 'error';
          plugin.error = (err as Error).message;
        }
        results.set(pluginId, { error: (err as Error).message });
      }
    }

    return results;
  }

  /**
   * Get a plugin instance.
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins.
   */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins.
   */
  getEnabledPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(p => p.state === 'enabled');
  }

  /**
   * Check if a plugin has a specific permission.
   */
  hasPermission(pluginId: string, permission: PluginPermission): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    return plugin.manifest.permissions.includes(permission);
  }

  /**
   * Get registry statistics.
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    errors: number;
    hooksRegistered: number;
  } {
    const plugins = Array.from(this.plugins.values());
    let hooksCount = 0;
    for (const handlers of this.hooks.values()) {
      hooksCount += handlers.size;
    }

    return {
      total: plugins.length,
      enabled: plugins.filter(p => p.state === 'enabled').length,
      disabled: plugins.filter(p => p.state === 'disabled').length,
      errors: plugins.filter(p => p.state === 'error').length,
      hooksRegistered: hooksCount,
    };
  }
}

// ─── Permission Validation ──────────────────────────────────────────────────

/**
 * Validate that a set of permissions doesn't include dangerous combinations.
 */
export function validatePermissions(permissions: PluginPermission[]): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];

  const hasWrite = permissions.some(p => p.endsWith('.write'));
  const hasRead = permissions.some(p => p.endsWith('.read'));

  if (hasWrite && !hasRead) {
    warnings.push('Plugin has write permissions but no read permissions — unusual pattern');
  }

  if (permissions.includes('network.request') && permissions.includes('file.write')) {
    warnings.push('Plugin can make network requests AND write files — potential data exfiltration risk');
  }

  if (permissions.includes('consciousness.write') && permissions.includes('memory.write')) {
    warnings.push('Plugin can modify both consciousness and memory — high privilege level');
  }

  return { safe: warnings.length === 0, warnings };
}

/**
 * Resolve plugin dependencies in topological order.
 */
export function resolveDependencyOrder(plugins: PluginManifest[]): string[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const p of plugins) {
    graph.set(p.id, p.dependencies || []);
    inDegree.set(p.id, 0);
  }

  // Calculate in-degrees
  for (const p of plugins) {
    for (const dep of (p.dependencies || [])) {
      inDegree.set(p.id, (inDegree.get(p.id) || 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);

    for (const [id, deps] of graph) {
      if (deps.includes(current)) {
        const newDegree = (inDegree.get(id) || 1) - 1;
        inDegree.set(id, newDegree);
        if (newDegree === 0) queue.push(id);
      }
    }
  }

  return order;
}
